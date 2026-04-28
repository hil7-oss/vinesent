export const API_BASE = '/api/fastapi'
const FASTAPI_SERVER = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || ''

export function api(path?: string | null): string {
  const pathStr = String(path || '')
  const p = pathStr ? (pathStr.startsWith('/') ? pathStr : `/${pathStr}`) : ''
  // Add /api/v1 prefix (except for auth and liqpay routes)
  const apiPath = p.startsWith('/auth') || p.startsWith('/liqpay') ? p : `/api/v1${p}`
  
  if (typeof window === 'undefined') {
    const raw = String(FASTAPI_SERVER || '').trim()
    if (raw) return `${raw}${apiPath}`
    const vercelUrl = String(process.env.VERCEL_URL || '').trim()
    if (vercelUrl) return `https://${vercelUrl}${API_BASE}${apiPath}`
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').trim()
    if (siteUrl) return `${siteUrl.replace(/\/+$/, '')}${API_BASE}${apiPath}`
    const port = Number(process.env.PORT || 3000) || 3000
    return `http://localhost:${port}${API_BASE}${apiPath}`
  }
  return `${API_BASE}${apiPath}`
}

function normalize(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export async function fetchApi(path: string, init?: RequestInit): Promise<Response> {
  const p = normalize(path)
  const url = `${API_BASE}${p}`
  const res = await fetch(url, init).catch(() => null as any)
  if (!res) {
    return new Response(JSON.stringify({ error: 'network_error' }), { status: 503 })
  }
  return res
}
