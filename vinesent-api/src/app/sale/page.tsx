import Link from 'next/link'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { api } from '@/lib/api'

async function getCategories() {
  const res = await fetch(api('/categories'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}

async function getProducts(sub?: string, sort?: string) {
  const qs = new URLSearchParams()
  qs.set('sale', 'true')
  if (sub) qs.set('sub', sub)
  if (sort) qs.set('sort', sort)
  const res = await fetch(api(`/products?${qs.toString()}`), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}

export default async function SalePage({ searchParams }: { searchParams: { sort?: string; sub?: string } }) {
  const categories = await getCategories()
  const products = await getProducts(searchParams?.sub, searchParams?.sort)
  const girl = categories.find((c: any) => c.slug === 'girl')
  const boy = categories.find((c: any) => c.slug === 'boy')
  const children = categories.filter((c: any) => c.parentId === girl?.id || c.parentId === boy?.id)

  return (
    <div className="max-w-[1400px] mx-auto px-0 md:px-6 md:pt-6">
      <div className="mb-8 lg:mb-12">
        <div className="bg-gradient-to-r from-red-50 to-red-100/50 rounded-2xl p-6 lg:p-12 text-center">
          <h1 className="text-[36px] lg:text-[56px] font-bold text-[#C10000]" style={{ fontFamily: 'var(--font-brand)' }}>SALE</h1>
          <p className="text-[14px] lg:text-[16px] text-[#C10000]/70 mt-2">Знижки до -50% на вибрані товари</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <Link href={`/sale`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold uppercase ${!searchParams?.sub && !searchParams?.sort ? 'bg-[#111] text-white' : 'border border-black/15'}`}>Усі</Link>
          {children.map((c: any) => (
            <Link key={c.id} href={`/sale?sub=${encodeURIComponent(c.slug)}`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sub === c.slug ? 'bg-black text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>
              {c.name}
            </Link>
          ))}
          <span className="w-px h-5 bg-black/10 mx-2" />
          <Link href={`/sale?sort=price_asc`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sort === 'price_asc' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Ціна ↑</Link>
          <Link href={`/sale?sort=price_desc`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sort === 'price_desc' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Ціна ↓</Link>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-[14px] text-gray-500">Товарів поки немає</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[6px] gap-y-[6px] md:gap-x-[8px] md:gap-y-[8px] lg:gap-x-[8px] lg:gap-y-[8px]">
          {products.map((p: any) => {
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
                  <span className="absolute top-2 left-2 bg-[#C10000] text-white text-[9px] uppercase tracking-widest px-1.5 py-[1px]">SALE</span>
                </div>
                <div className="p-2 text-sm lg:px-3">
                  <div className="flex justify-between xl:flex-row xl:items-center">
                    <div className="flex flex-col items-start gap-0">
                      <div className="line-clamp-1 font-[500] md:group-hover:underline uppercase text-[12px]">{p.name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] leading-none lg:text-sm">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const base = Number(p.price) || 0
                          const sp = Number((p as any).salePrice)
                          const hasSale = Number.isFinite(sp) && sp > 0 && sp < base
                          return (
                            <>
                              <span className="tracking-normal font-bold">{formatPrice(hasSale ? sp : base)}</span>
                              {hasSale && <span className="text-[11px] text-gray-400 line-through">{formatPrice(base)}</span>}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
