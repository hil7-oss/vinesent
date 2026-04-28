export const API_BASE = '/api/fastapi'
const FASTAPI_SERVER = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || ''

export function api(path: string): string {
  const p = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  if (typeof window === 'undefined') {
    const raw = String(FASTAPI_SERVER || '').trim()
    if (raw) return `${raw}${p}`
    const vercelUrl = String(process.env.VERCEL_URL || '').trim()
    if (vercelUrl) return `https://${vercelUrl}${API_BASE}${p}`
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').trim()
    if (siteUrl) return `${siteUrl.replace(/\/+$/, '')}${API_BASE}${p}`
    const port = Number(process.env.PORT || 3000) || 3000
    return `http://localhost:${port}${API_BASE}${p}`
  }
  return `${API_BASE}${p}`
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
