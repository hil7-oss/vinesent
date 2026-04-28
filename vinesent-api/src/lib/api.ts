export const API_BASE = '/api/fastapi/api/v1'
const FASTAPI_SERVER = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || ''

export function api(path: string): string {
  // Путь уже должен быть с /api/v1/ или это auth
  let p = path ? (path.startsWith('/') ? path : `/${path}`) : ''
  
  // Если путь начинается с /api/v1/ или /auth/, используем его как есть
  // Иначе добавляем /api/v1/
  if (p && !p.startsWith('/api/v1/') && !p.startsWith('/auth/') && !p.startsWith('/admin/')) {
    p = `/api/v1${p}`
  }
  
  // Для server-side рендеринга
  if (typeof window === 'undefined') {
    const raw = String(FASTAPI_SERVER || '').trim()
    if (raw) return `${raw}${p}`
    const vercelUrl = String(process.env.VERCEL_URL || '').trim()
    if (vercelUrl) return `https://${vercelUrl}/api/fastapi${p}`
    const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '').trim()
    if (siteUrl) return `${siteUrl.replace(/\/+$/, '')}/api/fastapi${p}`
    const port = Number(process.env.PORT || 3000) || 3000
    return `http://localhost:${port}/api/fastapi${p}`
  }
  
  // Для client-side - API_BASE уже содержит /api/fastapi/api/v1
  // Убираем дублирование /api/v1/ если оно есть в пути
  if (p.startsWith('/api/v1/')) {
    return `/api/fastapi${p}`
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
