 'use client'
import { useEffect, useRef, useState } from 'react'
import { API_BASE } from '@/lib/api'
import Link from 'next/link'

export default function LiqPayCheckoutPage({ params }: { params: { orderId: string } }) {
  const [payload, setPayload] = useState<{ data: string; signature: string; checkout_url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch(`${API_BASE}/liqpay/pay-order?orderId=${encodeURIComponent(params.orderId)}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('pay_order_failed')
        const json = await res.json()
        setPayload(json)
        setTimeout(() => formRef.current?.submit(), 400)
      } catch (e: any) {
        setError(e?.message || 'network_error')
      }
    }
    run()
  }, [params.orderId])

  if (error) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <div className="text-[16px] text-red-600 mb-3">Помилка запуску оплати</div>
        <div className="text-[13px] text-gray-500 mb-6">{error}</div>
        <Link href="/order" className="inline-block bg-[#111] text-white text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-black/80 transition">
          Повернутися до оформлення
        </Link>
      </div>
    )
  }

  if (!payload) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full animate-pulse mx-auto mb-6" />
        <div className="text-[16px] font-bold mb-3">Переадресація на оплату</div>
        <div className="text-[13px] text-gray-500">Краще не закривати сторінку</div>
      </div>
    )
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
      <div className="text-[16px] font-bold mb-3">Готуємо оплату</div>
      <div className="text-[13px] text-gray-500 mb-6">Якщо переадресація не відбулась, натисніть «Оплатити»</div>
      <form ref={formRef} method="POST" action={payload.checkout_url} acceptCharset="utf-8">
        <input type="hidden" name="data" value={payload.data} />
        <input type="hidden" name="signature" value={payload.signature} />
        <button type="submit" className="inline-block bg-[#111] text-white text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-black/80 transition">
          Оплатити
        </button>
      </form>
    </div>
  )
}
