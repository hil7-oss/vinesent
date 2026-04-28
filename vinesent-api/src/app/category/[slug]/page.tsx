import Link from 'next/link'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { api } from '@/lib/api'

async function getData(slug: string, params: { sort?: string; sale?: string; sub?: string; newest?: string }) {
  const qs = new URLSearchParams()
  qs.set('slug', slug)
  if (params.sub) qs.set('sub', params.sub)
  if (params.sale === '1') qs.set('sale', 'true')
  if (params.newest === '1') qs.set('new', 'true')
  if (params.sort) qs.set('sort', params.sort)
  const [categoriesRes, productsRes] = await Promise.all([
    fetch(api('/categories'), { cache: 'no-store' }).catch(() => null),
    fetch(api(`/products?${qs.toString()}`), { cache: 'no-store' }).catch(() => null),
  ])
  const categories = categoriesRes?.ok ? await categoriesRes.json() : []
  const products = productsRes?.ok ? await productsRes.json() : []
  const cat = categories.find((c: any) => c.slug === slug)
  const children = cat ? categories.filter((c: any) => c.parentId === cat.id) : []
  return { cat, list: products, categories, children }
}

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }, searchParams: { sort?: string; sale?: string; sub?: string; newest?: string } }) {
  const { cat, list, children } = await getData(params.slug, searchParams || {})
  const fallbackNames: Record<string, string> = {
    girl: 'Вона',
    boy: 'Він',
    winter: 'WINTER',
    spring: 'SPRING',
    summer: 'SUMMER',
    autumn: 'AUTUMN',
  }
  const title = cat?.name || fallbackNames[params.slug] || 'Каталог'

  return (
    <div className="max-w-[1400px] mx-auto px-0 md:px-6 md:pt-6">
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        <Link href="/" className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <h1 className="text-[20px] lg:text-[28px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{title}</h1>
        <Link href="/filter" className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round"/></svg>
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-8 overflow-x-auto scrollbar-hide">
        <Link href={`/category/${params.slug}`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold uppercase ${!searchParams?.sort && !searchParams?.sale && !searchParams?.sub && !searchParams?.newest ? 'bg-[#111] text-white' : 'border border-black/15'}`}>Усі</Link>
        {children.map((c: any) => (
          <Link key={c.id} href={`/category/${params.slug}?sub=${encodeURIComponent(c.slug)}`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sub === c.slug ? 'bg-black text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>
            {c.name}
          </Link>
        ))}
        <span className="w-px h-5 bg-black/10 mx-2" />
        <Link href={`/category/${params.slug}?newest=1`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.newest === '1' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Новинки</Link>
        <Link href={`/category/${params.slug}?sale=1`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sale === '1' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Sale</Link>
        <Link href={`/category/${params.slug}?sort=price_asc`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sort === 'price_asc' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Ціна ↑</Link>
        <Link href={`/category/${params.slug}?sort=price_desc`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sort === 'price_desc' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Ціна ↓</Link>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
          <div className="text-[14px] text-gray-500">Товарів поки немає</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[6px] gap-y-[6px] md:gap-x-[8px] md:gap-y-[8px] lg:gap-x-[8px] lg:gap-y-[8px]">
          {list.map((p: any) => {
            const img = getFirstImage(p.images)
            const basePrice = Number(p.price || 0)
            const salePrice = p.salePrice != null ? Number(p.salePrice) : null
            const hasSale = salePrice != null && salePrice > 0 && salePrice < basePrice
            return (
              <Link key={p.id} href={`/product/${p.slug}`} className="group flex flex-col">
                <div className="relative w-full aspect-[2/3] bg-[#f5f5f5] overflow-hidden rounded-sm">
                  {img ? (
                    <>
                      <img src={img} alt={p.name} className="w-full h-full object-cover scale-[1.005]" loading="lazy" />
                      <img src={img} alt={p.name} className="absolute inset-0 w-full h-full object-cover scale-[1.005] transition-transform duration-700 ease-out md:group-hover:scale-[1.04]" loading="lazy" />
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                    </div>
                  )}
                  {hasSale && (
                    <span className="absolute top-2 left-2 bg-[#C10000] text-white text-[9px] uppercase tracking-widest px-1.5 py-[1px]">SALE</span>
                  )}
                </div>
                <div className="p-2 text-sm lg:px-3">
                  <div className="flex justify-between xl:flex-row xl:items-center">
                    <div className="flex flex-col items-start gap-0">
                      <div className="line-clamp-1 font-[500] md:group-hover:underline uppercase text-[12px]">{p.name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[13px] leading-none lg:text-sm">
                      <div className="flex items-center gap-2">
                        {hasSale ? (
                          <>
                            <span className="text-[10px] text-gray-400 line-through">{formatPrice(basePrice)}</span>
                            <span className="tracking-normal font-bold text-[#C10000]">{formatPrice(salePrice!)}</span>
                          </>
                        ) : (
                          <span className="tracking-normal font-bold">{formatPrice(basePrice)}</span>
                        )}
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
