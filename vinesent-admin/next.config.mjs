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

const nextConfig = {
  experimental: {},
  output: isProd ? 'standalone' : undefined,
  images: {
    unoptimized: true,
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
}

export default nextConfig
