'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { API_BASE } from '@/lib/api'

export default function SearchPage() {
  const [q, setQ] = useState('')
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/products`).then(r => r.json()).then(setProducts).catch(() => setProducts([])).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return products.filter((p: any) => String(p.name).toLowerCase().includes(s) || String(p.description || '').toLowerCase().includes(s))
  }, [q, products])

  const popular = ['Куртка', 'Штани', 'Футболка', 'Сукня', 'Костюм']

  return (
    <div className="max-w-[1400px] mx-auto px-0 md:px-6 md:pt-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2" strokeLinecap="round"/></svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            autoFocus
            className="w-full h-12 pl-12 pr-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition"
            placeholder="Пошук товарів"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 hover:text-black">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>

      {!q && (
        <div className="mb-8">
          <div className="text-[13px] font-semibold uppercase tracking-wide mb-3">Популярні запити</div>
          <div className="flex flex-wrap gap-2">
            {popular.map(p => (
              <button key={p} onClick={() => setQ(p)} className="px-4 py-2.5 rounded-full border border-black/15 text-[13px] font-medium hover:bg-gray-50 transition">{p}</button>
            ))}
          </div>
        </div>
      )}

      {q && !filtered.length && !loading && (
        <div className="text-center py-16">
          <div className="text-[14px] text-gray-500 mb-2">Нічого не знайдено за запитом &quot;{q}&quot;</div>
          <div className="text-[13px] text-gray-400">Спробуйте інший запит</div>
        </div>
      )}

      {q && filtered.length > 0 && (
        <>
          <div className="text-[13px] text-gray-500 mb-4">Знайдено: {filtered.length}</div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[6px] gap-y-[6px] md:gap-x-[8px] md:gap-y-[8px] lg:gap-x-[8px] lg:gap-y-[8px]">
            {filtered.map((p: any) => {
              const img = getFirstImage(p.images)
              return (
                <Link key={p.id} href={`/product/${p.slug}`} className="group flex flex-col">
                  <div className="relative w-full aspect-[2/3] bg-[#f5f5f5] overflow-hidden rounded-sm">
                    {img ? (
                      <>
                        <img src={img} alt={p.name} className="w-full h-full object-cover scale-[1.005]" loading="lazy" />
                        <img src={img} alt={p.name} className="absolute inset-0 w-full h-full object-cover scale-[1.005] transition-transform duration-700 ease-out md:group-hover:scale-[1.04]" loading="lazy" />
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </div>
                  <div className="p-2 text-sm lg:px-3">
                    <div className="flex justify-between xl:flex-row xl:items-center">
                      <div className="flex flex-col items-start gap-0">
                        <div className="line-clamp-1 font-[500] md:group-hover:underline uppercase text-[12px]">{p.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[13px] leading-none lg:text-sm">
                        <div className="flex items-center gap-2">
                          <span className="tracking-normal font-bold">{formatPrice(p.price)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
