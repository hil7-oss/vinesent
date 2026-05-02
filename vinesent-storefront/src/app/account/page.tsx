'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'

export const dynamic = 'force-static'

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
      <div className="max-w-[700px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
        <div className="mb-10 text-center lg:text-left">
           <div className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em] mb-1">Особистий кабінет</div>
           <h1 className="text-[28px] lg:text-[36px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>Мій акаунт</h1>
        </div>

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

const getStatusBadge = (status: string) => {
  const s = String(status || '').toUpperCase()
  if (s === 'PAID') return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-[3px] text-[10px] font-bold tracking-[0.05em] uppercase">Оплачено</span>
  if (s === 'PENDING') return <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-[3px] text-[10px] font-bold tracking-[0.05em] uppercase">Очікує оплати</span>
  if (s === 'SHIPPED') return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-[3px] text-[10px] font-bold tracking-[0.05em] uppercase">Відправлено</span>
  if (s === 'CANCELLED') return <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-[3px] text-[10px] font-bold tracking-[0.05em] uppercase">Скасовано</span>
  return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-[3px] text-[10px] font-bold tracking-[0.05em] uppercase">{s}</span>
}

const formatDate = (iso: string) => {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return iso
    return d.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return iso }
}

function Orders() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchApi('/orders').then(r => r.ok ? r.json() : []).then(setOrders).finally(() => setLoading(false))
  }, [])

  return (
    <div className="mb-12">
      <h3 className="text-[16px] font-bold uppercase mb-4 tracking-wide text-gray-900 border-b border-black/10 pb-3">Мої покупки</h3>
      {loading ? (
        <div className="flex animate-pulse space-x-4 p-4 border border-gray-100 rounded-xl">
          <div className="h-12 bg-gray-200 rounded-md w-full"></div>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-10 text-center bg-[#fafafa] border border-black/5 rounded-2xl">
          <div className="text-[14px] text-gray-500 font-medium tracking-wide">Ви ще не робили замовлень</div>
          <Link href="/menu" className="inline-block mt-4 text-[12px] font-bold uppercase tracking-widest text-[#111] hover:opacity-60 transition">
            Перейти в каталог →
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="border border-black/10 rounded-2xl p-5 sm:p-6 hover:shadow-md hover:border-black/20 transition-all bg-white">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className="text-[15px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>
                      Замовлення № {String(o.id || o._id || '').slice(0, 8)}
                    </span>
                    {getStatusBadge(o.status)}
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500 font-medium">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {formatDate(o.createdAt)}
                  </div>
                </div>
                <div className="text-left sm:text-right bg-gray-50/50 p-3 sm:bg-transparent sm:p-0 rounded-lg">
                  <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-1">Сума</div>
                  <div className="text-[18px] font-bold text-gray-900 leading-none">
                    {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0 }).format(Number(o.total || 0)).replace('UAH','грн')}
                  </div>
                </div>
              </div>

              {/* ХОТФІКС: Виведення товарів із замовлення */}
              {Array.isArray(o.items) && o.items.length > 0 && (
                <div className="border-t border-black/5 pt-5 pb-5">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Склад замовлення:</div>
                  <div className="space-y-3">
                    {o.items.map((item: any) => {
                      const resolveOrderImg = (img: any) => {
                        if (!img) return null;
                        let path = '';
                        if (typeof img === 'string') {
                          if (img.startsWith('[') || img.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(img);
                              path = Array.isArray(parsed) ? (parsed[0] || '') : (parsed?.url || parsed || '');
                            } catch { path = img; }
                          } else { path = img; }
                        } else if (Array.isArray(img)) {
                          path = img[0] || '';
                        } else if (typeof img === 'object') {
                          path = img.url || img.path || '';
                        }

                        if (!path || typeof path !== 'string') return null;
                        if (path.startsWith('http')) return path;
                        if (path.startsWith('/uploads/')) return path;
                        if (path.startsWith('uploads/')) return `/${path}`;
                        return `/uploads/${path}`;
                      };
                      const imgSrc = resolveOrderImg(item.image);
                      return (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-16 h-20 bg-[#fafafa] rounded-lg overflow-hidden shrink-0 border border-black/5 flex items-center justify-center relative">
                          {imgSrc ? (
                            <img src={imgSrc} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 p-1">
                               <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                               <span className="text-[8px] font-mono text-center leading-tight truncate w-full px-1">{item.name?.slice(0, 10)}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${item.slug}`} className="text-[13px] font-bold leading-tight hover:underline line-clamp-2" style={{ fontFamily: 'var(--font-brand)' }}>
                            {item.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-gray-500 mt-2 font-medium">
                            {item.size && <span>Розмір: <b className="text-gray-900">{item.size}</b></span>}
                            {item.color && (
                               <div className="flex items-center gap-1.5">
                                  <span>Колір:</span>
                                  {String(item.color).startsWith('#') ? (
                                     <span className="w-3 h-3 rounded-full border border-black/10 inline-block" style={{ backgroundColor: item.color }}></span>
                                  ) : (
                                     <b className="text-gray-900">{item.color}</b>
                                  )}
                               </div>
                            )}
                            <span className="text-gray-300">|</span>
                            <span>Кількість: <b className="text-gray-900">{item.quantity} шт.</b></span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[13px] font-bold text-gray-900">
                            {new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0 }).format(Number(item.price || 0)).replace('UAH','грн')}
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              )}

              <div className="pt-5 border-t border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <span className="text-[12px] text-gray-400 font-medium hidden sm:block">
                  Дякуємо за покупку у VINESENT!
                </span>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                  {o.status !== 'PAID' && o.status !== 'CANCELLED' ? (
                    <Link 
                      href={`/checkout/${encodeURIComponent(o.id)}/liqpay`} 
                      className="w-full sm:w-auto h-10 px-8 bg-[#111] text-white flex items-center justify-center text-[11px] font-bold uppercase tracking-[0.1em] rounded-full hover:bg-black/80 transition"
                    >
                      Оплатити
                    </Link>
                  ) : (
                    <div className="flex items-center gap-2 text-[12px] text-gray-400 font-medium px-4 py-2 bg-gray-50 rounded-full w-full sm:w-auto justify-center">
                      <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      {o.status === 'CANCELLED' ? 'Замовлення скасовано' : 'Успішно оплачено'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
