import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/redis'

const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
const IS_PROD = process.env.NODE_ENV === 'production'
const RAW_RATE_LIMIT = process.env.RATE_LIMIT_PER_MINUTE
let RATE_LIMIT = Number(RAW_RATE_LIMIT ?? 600)
if (!Number.isFinite(RATE_LIMIT)) RATE_LIMIT = 600
if (IS_PROD && RAW_RATE_LIMIT === '0') {
  throw new Error('RATE_LIMIT_PER_MINUTE must not be 0 in production')
}
if (RATE_LIMIT < 0) RATE_LIMIT = 0
const PUBLIC_FASTAPI = (process.env.NEXT_PUBLIC_FASTAPI_URL || '').trim()
if (IS_PROD && PUBLIC_FASTAPI) {
  if (!PUBLIC_FASTAPI.startsWith('https://')) throw new Error('NEXT_PUBLIC_FASTAPI_URL must be https in production')
  if (PUBLIC_FASTAPI.includes('@')) throw new Error('NEXT_PUBLIC_FASTAPI_URL must not include credentials')
}
const FASTAPI_BASE = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'
if (IS_PROD && FASTAPI_BASE.includes('localhost')) {
  throw new Error('FASTAPI_URL must not point to localhost in production')
}
if (IS_PROD && RATE_LIMIT > 0 && !(process.env.REDIS_URL || '').trim()) {
  throw new Error('REDIS_URL is required in production when rate limiting is enabled')
}

export async function middleware(req: NextRequest) {
  const origin = req.headers.get('origin') || ''
  const isApi = req.nextUrl.pathname.startsWith('/api')
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (!isApi && !isAdmin) return NextResponse.next()

  if (isAdmin) {
    const token = req.cookies.get('token')?.value || ''
    if (!token) return NextResponse.redirect(new URL('/account', req.url))
    try {
      const r = await fetch(`${FASTAPI_BASE}/auth/me`, { headers: { authorization: `Bearer ${token}` }, cache: 'no-store' })
      const data = r.ok ? await r.json() : { user: null }
      const role = String(data?.user?.role || '')
      if (role !== 'ADMIN') return NextResponse.redirect(new URL('/account', req.url))
    } catch {
      return NextResponse.redirect(new URL('/account', req.url))
    }
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const allowOrigin = (() => {
    if (!origin) return ''
    if (process.env.NODE_ENV !== 'production') return origin
    if (ALLOWED_ORIGINS.length === 0) return ''
    return ALLOWED_ORIGINS.includes(origin) ? origin : ''
  })()
  if (allowOrigin) res.headers.set('Access-Control-Allow-Origin', allowOrigin)
  res.headers.set('Vary', 'Origin')
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.headers.set('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    return NextResponse.json({}, { status: 204, headers: res.headers })
  }
  if (RATE_LIMIT > 0) {
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'unknown'
    const allowed = await rateLimit(String(ip), req.nextUrl.pathname, RATE_LIMIT)
    if (!allowed) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429, headers: res.headers })
    }
  }

  return res
}

export const config = {
  matcher: ['/api/:path*', '/admin/:path*'],
}
