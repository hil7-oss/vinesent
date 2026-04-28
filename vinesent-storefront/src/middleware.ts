import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.match(/^\/products\/prod-[a-f0-9]+$/)) {
    const productId = pathname.split('/products/')[1]
    const url = request.nextUrl.clone()
    url.pathname = `/redirect/${productId}`
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/products/prod-:path*',
}