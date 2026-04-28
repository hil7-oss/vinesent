import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const FASTAPI_BASE = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

export const runtime = 'nodejs'

async function proxy(req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value || ''
  const url = new URL(req.url)
  const target = new URL(url.pathname.replace(/^\/api\/fastapi/, ''), FASTAPI_BASE)
  target.search = url.search

  const headers = new Headers(req.headers)
  headers.delete('host')
  headers.delete('connection')
  headers.delete('content-length')
  headers.delete('authorization')
  headers.delete('cookie')
  if (token) headers.set('authorization', `Bearer ${token}`)

  const method = req.method.toUpperCase()
  const hasBody = !['GET', 'HEAD'].includes(method)

  const upstream = await fetch(target.toString(), {
    method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: 'manual',
  })

  const resHeaders = new Headers(upstream.headers)
  resHeaders.delete('content-encoding')

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
