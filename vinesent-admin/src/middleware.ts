import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { FASTAPI_URL } from '@/lib/env'
const FASTAPI_BASE = FASTAPI_URL

export async function middleware(req: NextRequest) {
  const isAdmin = req.nextUrl.pathname.startsWith('/admin')
  if (!isAdmin) return NextResponse.next()

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
