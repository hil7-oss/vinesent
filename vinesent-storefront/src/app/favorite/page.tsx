'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatPrice, getFirstImage } from '@/lib/utils'

export const dynamic = 'force-static'

type FavItem = {
  id: string
  slug: string
  name: string
  price: number
  images?: string
}

export default function FavoritePage() {
  const [items, setItems] = useState<FavItem[]>([])

  useEffect(() => {
    const raw = localStorage.getItem('favorites') || '[]'
    try { setItems(JSON.parse(raw)) } catch { setItems([]) }
    const handler = () => {
      try { setItems(JSON.parse(localStorage.getItem('favorites') || '[]')) } catch {}
    }
    window.addEventListener('favoritesChanged', handler)
    return () => window.removeEventListener('favoritesChanged', handler)
  }, [])

  const remove = (id: string) => {
    const next = items.filter(i => i.id !== id)
    setItems(next)
    localStorage.setItem('favorites', JSON.stringify(next))
    window.dispatchEvent(new Event('favoritesChanged'))
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-[20px] lg:text-[28px] font-bold uppercase mb-6 lg:mb-10" style={{ fontFamily: 'var(--font-brand)' }}>Обране</h1>

      {!items.length && (
        <div className="text-center py-20">
          <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <div className="text-[16px] font-semibold mb-2">Список порожній</div>
          <div className="text-[14px] text-gray-500 mb-6">Додайте товари, натиснувши на серце</div>
          <Link href="/" className="inline-block bg-[#111] text-white text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-black/80 transition">За покупками</Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 lg:gap-x-6 gap-y-8 lg:gap-y-12">
        {items.map(i => {
          const img = getFirstImage(i.images)
          return (
            <div key={i.id} className="group flex flex-col">
              <Link href={`/products/${i.slug}`}>
                <div className="relative w-full aspect-[3/4] bg-gray-100 mb-3 overflow-hidden rounded-sm">
                  {img ? (
                    <img src={img} alt={i.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                    </div>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); remove(i.id) }}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 20.5l-1.45-1.32C6.4 15.36 4 13.28 4 10.5 4 8.42 5.57 7 7.5 7c1.11 0 2.2.5 2.9 1.33C11.3 7.5 12.39 7 13.5 7 15.43 7 17 8.42 17 10.5c0 2.78-2.4 4.86-6.55 8.68L12 20.5z"/>
                    </svg>
                  </button>
                </div>
              </Link>
              <div className="text-[12px] lg:text-[13px] uppercase font-semibold truncate mb-1">{i.name}</div>
              <div className="text-[13px] lg:text-[14px] font-bold">{formatPrice(i.price)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
