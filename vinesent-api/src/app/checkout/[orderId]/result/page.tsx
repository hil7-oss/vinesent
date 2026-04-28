 'use client'
import Link from 'next/link'
import { API_BASE } from '@/lib/api'
import { useEffect, useState } from 'react'

type Order = { id: string; status: string; total: number }

export default function ResultPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [polling, setPolling] = useState(true)
  const st = (order?.status || '').toUpperCase()
  const ok = ['PAID','CONFIRMED','SHIPPED','DELIVERED'].includes(st)

  const clearCart = () => {
    try {
      localStorage.setItem('localCart', '[]')
      window.dispatchEvent(new Event('cartChanged'))
    } catch {}
  }

  useEffect(() => {
    if (!ok) return
    clearCart()
  }, [ok])

  useEffect(() => {
    let timer: any
    const fetchOnce = async (): Promise<{ status?: string } | null> => {
      try {
        const res = await fetch(`${API_BASE}/orders/status/${encodeURIComponent(params.orderId)}`, { cache: 'no-store' })
        if (res.ok) {
          const o = await res.json()
          setOrder({ id: o.id, status: o.status, total: Number(o.total || 0) })
          const status = String(o.status || '').toUpperCase()
          if (['PAID','CONFIRMED','SHIPPED','DELIVERED'].includes(status)) clearCart()
          return { status: String(o.status || '') }
        }
        return null
      } finally {
        setLoading(false)
      }
    }
    const run = async () => {
      // Try server-side LiqPay status check once
      try { await fetch(`${API_BASE}/liqpay/status?orderId=${encodeURIComponent(params.orderId)}`) } catch {}
      const first = await fetchOnce()
      let tries = 0
      timer = setInterval(async () => {
        tries++
        const resp = await fetchOnce()
        const status = String(resp?.status || first?.status || '').toUpperCase()
        const done = ['PAID','CONFIRMED','SHIPPED','DELIVERED'].includes(status)
        if (done || tries >= 10) {
          clearInterval(timer)
          setPolling(false)
        }
      }, 3000)
    }
    run()
    return () => { if (timer) clearInterval(timer) }
  }, [params.orderId])

  if (loading) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse mx-auto mb-6" />
        <div className="text-[16px] font-bold mb-3">Перевіряємо статус оплати...</div>
      </div>
    )
  }
  return (
    <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
      <div className={`w-20 h-20 ${ok ? 'bg-green-100' : 'bg-red-100'} rounded-full flex items-center justify-center mx-auto mb-6`}>
        {ok ? (
          <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10"/></svg>
        ) : (
          <svg className="w-10 h-10 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>
        )}
      </div>
      <h1 className="text-[24px] font-bold uppercase mb-3" style={{ fontFamily: 'var(--font-brand)' }}>{ok ? 'Дякуємо!' : 'Оплата не виконана'}</h1>
      <p className="text-[16px] text-gray-600 mb-2">{ok ? 'Замовлення успішно оплачене' : (polling ? 'Очікуємо підтвердження платежу...' : 'Оплата не пройшла або скасована')}</p>
      <p className="text-[13px] text-gray-400 mb-6">Замовлення № {order?.id}</p>
      <div className="flex items-center justify-center gap-3">
        <Link href="/" onClick={() => { if (ok) clearCart() }} className="inline-block bg-[#111] text-white text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-black/80 transition">
          Повернутися в магазин
        </Link>
        {!ok && (
          <Link href={`/checkout/${encodeURIComponent(params.orderId)}/liqpay`} className="inline-block border border-black/15 text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-gray-50 transition">
            Спробувати знову
          </Link>
        )}
      </div>
    </div>
  )
}
