'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'

const API_BASE = ''

type User = {
  id: string
  email: string
  name?: string | null
  phone?: string | null
  createdAt?: string | null
}

const formatDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return d }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/users`, { cache: 'no-store' })
      const data = res.ok ? await res.json() : []
      setUsers(Array.isArray(data) ? data : [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return users
    return users.filter(u =>
      String(u.email || '').toLowerCase().includes(s) ||
      String(u.name || '').toLowerCase().includes(s) ||
      String(u.phone || '').toLowerCase().includes(s) ||
      String(u.id || '').toLowerCase().includes(s)
    )
  }, [users, q])

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <h1 className="text-[16px] font-bold text-gray-900 lg:text-[18px]">Користувачі</h1>
          {!loading && (
            <span className="h-7 px-2.5 bg-white border border-gray-100 text-gray-500 text-[11px] font-medium rounded-lg flex items-center">
              {filtered.length} з {users.length}
            </span>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-3">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={q} onChange={e => setQ(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800/10 transition bg-white" placeholder="Пошук користувачів…" />
        </div>

        {loading && (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="animate-pulse h-14 bg-white rounded-xl border border-gray-100" />)}</div>
        )}

        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50/40">
                <tr className="border-b border-gray-100">
                  {['Email', "Ім'я", 'Телефон', 'Створено', 'ID'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50/60 transition">
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-900">{u.email}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{u.name || '—'}</td>
                    <td className="px-4 py-3 text-[13px] text-gray-700">{u.phone || '—'}</td>
                    <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{u.createdAt ? formatDate(u.createdAt) : '—'}</td>
                    <td className="px-4 py-3 text-[12px] font-mono text-gray-400">{u.id.slice(0, 8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-14 text-center text-[13px] text-gray-400">Користувачів не знайдено</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

