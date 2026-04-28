import type { Metadata } from 'next'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const FASTAPI_BASE = process.env.FASTAPI_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'

export const metadata: Metadata = {
  title: 'VINESENT Admin Dashboard',
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')?.value

  if (!token) redirect('/account')

  try {
    const res = await fetch(`${FASTAPI_BASE}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    const data = res.ok ? await res.json() : { user: null }
    const user = data?.user
    if (!user) redirect('/account')
    if (user.role !== 'ADMIN') redirect('/account')
  } catch {
    redirect('/account')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 min-w-0 pt-16 lg:pt-0">
        {children}
      </div>
    </div>
  )
}
