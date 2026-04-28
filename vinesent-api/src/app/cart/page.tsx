'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { API_BASE } from '@/lib/api'

type CartItem = {
  id: string
  productId: string
  quantity: number
  price: number
  originalPrice?: number
  hasSale?: boolean
  product?: { name: string; slug: string; image?: string; images?: string }
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCart = async () => {
    try {
      const localCart: Array<{ productId: string; quantity: number; price?: number }> =
        JSON.parse(localStorage.getItem('localCart') || '[]')
      const prodRes = await fetch(`${API_BASE}/products`)
      const products = prodRes.ok ? await prodRes.json() : []
      const base: CartItem[] = localCart.map((i, idx) => {
        const p = products.find((x: any) => x.id === i.productId)
        const first = p ? getFirstImage(p.images) : ''
        const basePrice = Number(p?.price) || 0
        const sp = Number(p?.salePrice)
        const hasSale = !!p && Number.isFinite(sp) && sp > 0 && sp < basePrice
        const unitPrice = hasSale ? sp : (basePrice || Number(i.price) || 0)
        return {
          id: String(idx),
          productId: i.productId,
          quantity: i.quantity,
          price: unitPrice,
          originalPrice: hasSale ? basePrice : undefined,
          hasSale,
          product: p ? { name: p.name, slug: p.slug, image: first, images: p.images } : undefined,
        }
      })
      setItems(base)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCart()
    const onCart = () => { fetchCart() }
    window.addEventListener('cartChanged', onCart as any)
    return () => window.removeEventListener('cartChanged', onCart as any)
  }, [])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const originalTotal = items.reduce((sum, i) => sum + (i.originalPrice ?? i.price) * i.quantity, 0)
  const discountTotal = Math.max(0, originalTotal - total)

  const updateQty = async (it: CartItem, delta: number) => {
    if (it.quantity + delta < 1) return
    const next = items.map(p => p.id === it.id ? { ...p, quantity: p.quantity + delta } : p)
    setItems(next)
    const toSave = next.map(({ productId, quantity }) => ({ productId, quantity }))
    localStorage.setItem('localCart', JSON.stringify(toSave))
  }

  const removeItem = async (it: CartItem) => {
    const next = items.filter(p => p.id !== it.id)
    setItems(next)
    const toSave = next.map(({ productId, quantity }) => ({ productId, quantity }))
    localStorage.setItem('localCart', JSON.stringify(toSave))
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10 pb-32">
      <h1 className="text-[20px] lg:text-[28px] font-bold uppercase mb-6 lg:mb-10" style={{ fontFamily: 'var(--font-brand)' }}>Кошик</h1>

      {loading && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="animate-pulse flex gap-4 p-4 border border-gray-100 rounded-xl">
              <div className="w-24 h-28 bg-gray-200 rounded" />
              <div className="flex-1"><div className="h-4 bg-gray-200 rounded w-1/2 mb-3" /><div className="h-4 bg-gray-200 rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="text-[14px] text-red-600 mb-4">{error}</div>}

      {!loading && !items.length && (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1"><path d="M6 6h14l-2 9H7L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
          <div className="text-[16px] font-semibold mb-2">Кошик порожній</div>
          <div className="text-[14px] text-gray-500 mb-6">Додайте товари, щоб оформити замовлення</div>
          <Link href="/" className="inline-block bg-[#111] text-white text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-black/80 transition">Перейти до каталогу</Link>
        </div>
      )}

      <div className="lg:grid lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2 space-y-4">
          {items.map((i) => (
            <div key={i.id} className="flex gap-4 border border-gray-100 rounded-xl p-3 lg:p-4">
              <Link href={`/product/${i.product?.slug || ''}`} className="w-24 h-28 lg:w-28 lg:h-32 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {i.product?.image ? (
                  <img src={i.product.image} alt={i.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  </div>
                )}
              </Link>
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-[13px] lg:text-[14px] uppercase font-semibold mb-1">{i.product?.name || 'Товар'}</div>
                  <div className="text-[12px] text-gray-400 mb-2">Розмір: --- | Колір: ---</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center h-9 rounded-full border border-black/10 select-none">
                    <button onClick={() => updateQty(i, -1)} className="w-9 h-9 flex items-center justify-center text-[16px] hover:bg-gray-50 rounded-l-full transition">-</button>
                    <span className="w-8 text-center text-[13px] font-medium">{i.quantity}</span>
                    <button onClick={() => updateQty(i, 1)} className="w-9 h-9 flex items-center justify-center text-[16px] hover:bg-gray-50 rounded-r-full transition">+</button>
                  </div>
                  <div className="text-right">
                    {i.hasSale && i.originalPrice !== undefined && (
                      <div className="text-[11px] text-gray-400 line-through">{formatPrice(i.originalPrice * i.quantity)}</div>
                    )}
                    <div className="text-[14px] lg:text-[16px] font-bold">{formatPrice(i.price * i.quantity)}</div>
                  </div>
                  <button onClick={() => removeItem(i)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-black transition">
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary (desktop sidebar) */}
        {items.length > 0 && (
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-gray-50 rounded-2xl p-6">
              <h3 className="text-[16px] font-bold uppercase mb-4">Підсумок</h3>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-[14px]">
                  <span className="text-gray-500">Товари ({items.length})</span>
                  <span>{formatPrice(originalTotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-[14px]">
                    <span className="text-gray-500">Знижка</span>
                    <span className="text-red-600">- {formatPrice(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[14px]">
                  <span className="text-gray-500">Доставка</span>
                  <span className="text-green-600">Безкоштовно</span>
                </div>
              </div>
              <div className="border-t border-black/10 pt-4 mb-6">
                <div className="flex justify-between text-[16px] font-bold">
                  <span>Всього</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>
              <Link href="/order" className="block w-full bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase text-center hover:bg-black/80 transition">
                Оформити замовлення
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom bar */}
      {items.length > 0 && (
        <div className="lg:hidden fixed left-0 right-0 bottom-0 bg-white/95 backdrop-blur-sm border-t border-black/10 z-40">
          <div className="max-w-[600px] mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] uppercase text-gray-500">Всього</span>
              <span className="text-[18px] font-bold">{formatPrice(total)}</span>
            </div>
            <Link href="/order" className="block w-full bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase text-center">Замовити</Link>
          </div>
        </div>
      )}
    </div>
  )
}
