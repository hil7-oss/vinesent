import fs from 'node:fs'
import path from 'node:path'

function loadRootEnv() {
  const rootEnvPath = path.resolve(process.cwd(), '..', '.env')
  if (!fs.existsSync(rootEnvPath)) return
  const content = fs.readFileSync(rootEnvPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    let value = line.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function normalizeUrl(value, defaultScheme = 'https') {
  const v = String(value || '').trim()
  if (!v) return ''
  const withScheme = v.startsWith('http://') || v.startsWith('https://') ? v : `${defaultScheme}://${v}`
  try {
    return new URL(withScheme).origin
  } catch {
    return ''
  }
}

loadRootEnv()

const fromApiDomain = normalizeUrl(process.env.API_DOMAIN)
if (!process.env.NEXT_PUBLIC_FASTAPI_URL && fromApiDomain) process.env.NEXT_PUBLIC_FASTAPI_URL = fromApiDomain
if (!process.env.FASTAPI_URL && (process.env.NEXT_PUBLIC_FASTAPI_URL || fromApiDomain)) process.env.FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || fromApiDomain

const isProd = process.env.NODE_ENV === 'production'
const FASTAPI_URL = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || (isProd ? '' : 'http://localhost:8000')
if (isProd && !FASTAPI_URL) {
  throw new Error('FASTAPI_URL is required in production')
}
if (isProd && (FASTAPI_URL.includes('localhost') || FASTAPI_URL.includes('127.0.0.1'))) {
  throw new Error('FASTAPI_URL must not point to localhost in production')
}

const apiOrigin = fromApiDomain || normalizeUrl(process.env.NEXT_PUBLIC_FASTAPI_URL) || normalizeUrl(process.env.FASTAPI_URL, 'http')
const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `frame-ancestors 'none'`,
  `img-src * data: blob: 'self'`,
  `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net`,
  `style-src 'self' 'unsafe-inline'`,
  `font-src 'self' data:`,
  `connect-src 'self' ${apiOrigin || ''} https://www.google-analytics.com https://region1.google-analytics.com https://stats.g.doubleclick.net https://www.facebook.com`,
].filter(Boolean).join('; ')

const nextConfig = {
  experimental: {},
  output: isProd ? 'standalone' : undefined,
  images: {
    unoptimized: true,  // Отключаем проксирование картинок через Next.js, так как используем Cloudinary
    formats: ['image/webp', 'image/avif'],  // Оставляем для совместимости, но работать будет Cloudinary
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'http', hostname: 'backend' },
    ],
  },
  // Disable static optimization to prevent prerender errors
  // All pages will be rendered on-demand
  async rewrites() {
    return [
      {
        source: '/api/fastapi/:path*',
        destination: `${FASTAPI_URL}/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${FASTAPI_URL}/uploads/:path*`,
      },
    ]
  },
  async headers() {
    return [
      // Uploads: very long cache — immutable assets
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
          { key: 'Vary', value: 'Accept-Encoding' },
        ],
      },
      // All pages: security headers + explicit indexing allowed
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Robots-Tag', value: 'index, follow' },
        ],
      },
    ]
  },
}

export default nextConfig
