'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default function AccountPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'register' | 'login'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    fetchApi('/auth/me')
      .then(r => r.ok ? r.json() : { user: null })
      .then(d => setLoggedIn(Boolean((d as any)?.user)))
      .catch(() => setLoggedIn(false))
  }, [])

  const toMsg = (value: any): string => {
    if (!value) return 'Помилка'
    if (typeof value === 'string') return value
    if (typeof value === 'object') {
      if (value.detail) return toMsg(value.detail)
      if (value.error) return toMsg(value.error)
      if (value.message) return toMsg(value.message)
      try { return JSON.stringify(value) } catch { return 'Помилка' }
    }
    return String(value)
  }

  const submit = async () => {
    setMessage(null)
    setIsError(false)
    const urlPath = mode === 'register' ? '/auth/register' : '/auth/login'
    const body = mode === 'register' ? { email, password, name } : { email, password }
    const res = await fetchApi(urlPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (res.ok) {
      setMessage(mode === 'register' ? 'Реєстрація успішна!' : 'Вхід виконано!')
      setLoggedIn(true)
    } else {
      setIsError(true)
      setMessage(toMsg(data))
    }
  }

  const logout = () => {
    fetchApi('/auth/logout', { method: 'POST' }).finally(() => {
      setLoggedIn(false)
      setMessage(null)
      router.refresh()
    })
  }

  if (loggedIn) {
    return (
      <div className="max-w-[600px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
        <h1 className="text-[20px] lg:text-[28px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Мій акаунт</h1>

        <Orders />

        <div className="space-y-3 mb-10">
          <Link href="/favorite" className="flex items-center justify-between p-4 rounded-xl border border-black/10 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span className="text-[14px] font-medium">Обране</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
          <Link href="/cart" className="flex items-center justify-between p-4 rounded-xl border border-black/10 hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6h14l-2 9H7L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
              <span className="text-[14px] font-medium">Кошик</span>
            </div>
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
          </Link>
        </div>

        <button onClick={logout} className="w-full py-4 rounded-2xl border border-red-200 text-red-600 text-[14px] font-medium hover:bg-red-50 transition">
          Вийти з акаунту
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-[500px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[20px] lg:text-[28px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Акаунт</h1>

      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => { setMode('login'); setMessage(null) }} className={`flex-1 py-3 rounded-xl text-[13px] font-semibold uppercase transition ${mode === 'login' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-gray-50'}`}>Увійти</button>
        <button onClick={() => { setMode('register'); setMessage(null) }} className={`flex-1 py-3 rounded-xl text-[13px] font-semibold uppercase transition ${mode === 'register' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-gray-50'}`}>Реєстрація</button>
      </div>

      <div className="space-y-4 mb-6">
        {mode === 'register' && (
          <div>
            <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Ім'я</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition" placeholder="Ваше ім'я" />
          </div>
        )}
        <div>
          <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition" placeholder="you@example.com" />
        </div>
        <div>
          <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Пароль</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} className="w-full h-12 px-4 pr-12 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition" placeholder="Пароль" />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{showPw ? <><path d="M1 1l22 22"/><path d="M9.7 4.34A9.14 9.14 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/></> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}</svg>
            </button>
          </div>
        </div>
      </div>

      <button onClick={submit} className="w-full bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase hover:bg-black/80 transition">
        {mode === 'register' ? 'Зареєструватися' : 'Увійти'}
      </button>

      {message && (
        <div className={`mt-4 p-3 rounded-xl text-[13px] text-center ${isError ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}
    </div>
  )
}

function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchApi('/orders').then(r => r.ok ? r.json() : []).then(setOrders).finally(() => setLoading(false))
  }, [])
  return (
    <div className="mb-10">
      <h3 className="text-[14px] font-bold uppercase mb-3">Мої покупки</h3>
      {loading ? (
        <div className="text-[13px] text-gray-400">Завантаження...</div>
      ) : orders.length === 0 ? (
        <div className="text-[13px] text-gray-400">Замовлень поки немає</div>
      ) : (
        <div className="border border-black/10 rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3">№</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Сума</th>
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Дія</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-t border-black/5">
                  <td className="p-3">{o.id}</td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">{new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0 }).format(Number(o.total || 0)).replace('UAH','грн')}</td>
                  <td className="p-3">{o.createdAt}</td>
                  <td className="p-3">
                    {o.status !== 'PAID' ? (
                      <Link href={`/checkout/${encodeURIComponent(o.id)}/liqpay`} className="text-[12px] underline">Оплатити</Link>
                    ) : (
                      <span className="text-[12px] text-green-600">Оплачено</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
