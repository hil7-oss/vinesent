import Link from 'next/link'
import { api } from '@/lib/api'
import ProductCard from '@/components/product/ProductCard'

async function getCategories() {
  const res = await fetch(api('/categories'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}

async function getContent() {
  const res = await fetch(api('/content'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}

async function getAllProducts() {
  const res = await fetch(api('/products'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}

async function getNewProducts(sub?: string, sort?: string) {
  const qs = new URLSearchParams()
  qs.set('new', 'true')
  if (sub) qs.set('sub', sub)
  if (sort) qs.set('sort', sort)
  const res = await fetch(api(`/products?${qs.toString()}`), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}

export default async function NewPage({ searchParams }: { searchParams: { sort?: string; sub?: string } }) {
  const categories = await getCategories()
  const [content, allProducts, newByDate] = await Promise.all([
    getContent(),
    getAllProducts(),
    getNewProducts(searchParams?.sub, searchParams?.sort),
  ])
  const allProductsMap = new Map((allProducts || []).map((p: any) => [p.id, p]))
  const col = (content?.collections || []).find((c: any) => (c.key || '').toUpperCase() === 'NEW') || null
  const curated = (col?.productIds || []).map((id: string) => allProductsMap.get(id)).filter(Boolean)
  const sub = String(searchParams?.sub || '').trim()
  const sort = String(searchParams?.sort || '').trim().toLowerCase()
  const autoNew = Array.isArray(newByDate) ? newByDate : []
  const curatedIds = new Set(curated.map((p: any) => String(p?.id || '')))
  const base = curated.length > 0 ? [...curated, ...autoNew.filter((p: any) => !curatedIds.has(String(p?.id || '')))] : autoNew
  const filtered = sub
    ? base.filter((p: any) => (p.categories || []).some((c: any) => String(c?.slug || '') === sub) || String(p.categoryId || '') === String(categories.find((c: any) => c.slug === sub)?.id || ''))
    : base
  const products = (sort === 'price_asc' || sort === 'price_desc')
    ? [...filtered].sort((a: any, b: any) => {
        const ap = Number(a?.salePrice || 0) > 0 && Number(a?.salePrice) < Number(a?.price || 0) ? Number(a?.salePrice) : Number(a?.price || 0)
        const bp = Number(b?.salePrice || 0) > 0 && Number(b?.salePrice) < Number(b?.price || 0) ? Number(b?.salePrice) : Number(b?.price || 0)
        return sort === 'price_asc' ? ap - bp : bp - ap
      })
    : filtered
  const girl = categories.find((c: any) => c.slug === 'girl')
  const boy = categories.find((c: any) => c.slug === 'boy')
  const children = categories.filter((c: any) => c.parentId === girl?.id || c.parentId === boy?.id)

  return (
    <div className="mx-auto pt-10 lg:pt-16">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 lg:mb-12 px-4 lg:px-6">
        <h1 className="text-[20px] lg:text-[28px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{col?.title || 'NEW'}</h1>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/new?${new URLSearchParams({...searchParams, sort: 'price_asc'}).toString()}`}
            className={`h-9 px-4 flex items-center justify-center border text-[11px] font-medium uppercase tracking-[0.1em] transition-all rounded-[2px] ${searchParams?.sort === 'price_asc' ? 'bg-black text-white border-black' : 'bg-transparent text-black border-[#E5E5E5] hover:border-black'}`}
          >
            Ціна ↑
          </Link>
          <Link 
            href={`/new?${new URLSearchParams({...searchParams, sort: 'price_desc'}).toString()}`}
            className={`h-9 px-4 flex items-center justify-center border text-[11px] font-medium uppercase tracking-[0.1em] transition-all rounded-[2px] ${searchParams?.sort === 'price_desc' ? 'bg-black text-white border-black' : 'bg-transparent text-black border-[#E5E5E5] hover:border-black'}`}
          >
            Ціна ↓
          </Link>
        </div>
      </div>

      <div className="pb-24">
        {products.length === 0 ? (
          <div className="text-center py-20 text-[14px] text-gray-500">Товарів поки немає</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[2px] gap-y-[2px] md:gap-x-[4px] md:gap-y-[4px] lg:gap-x-[4px] lg:gap-y-[4px]">
            {products.map((p: any) => <ProductCard key={p.id} product={p} badges={['NEW']} />)}
          </div>
        )}
      </div>

      <nav className="fixed bottom-6 lg:bottom-10 left-0 right-0 mx-auto z-[60] w-[94%] max-w-[850px]">
        <div
          className="rounded-full h-[52px] flex items-center px-2 lg:px-4"
          style={{
            background: 'rgba(255, 255, 255, 0.75)',
            backdropFilter: 'blur(25px) saturate(160%)',
            WebkitBackdropFilter: 'blur(25px) saturate(160%)',
            border: '0.5px solid rgba(0, 0, 0, 0.05)',
            boxShadow: '0 8px 32px -10px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Link href="/filter" className="w-10 h-10 flex items-center justify-center shrink-0 rounded-full hover:bg-black/5 active:scale-[0.97] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 8h16M7 12h10M10 16h4" />
            </svg>
          </Link>

          <div className="w-[1px] h-4 bg-black/10 mx-1 shrink-0"></div>

          <div
            className="flex-1 h-full overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            }}
          >
            <div className="flex items-center gap-2 lg:gap-4 px-6 h-full overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Link href="/new"
                className={`shrink-0 h-[34px] flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.97] px-6 ${!searchParams?.sub && !searchParams?.sort ? 'bg-black text-white text-[11px] font-bold uppercase tracking-[0.04em]' : 'text-[13px] font-medium text-black/40 hover:text-black'}`}>
                Усі
              </Link>
              {children.map((c: any) => (
                <Link key={c.id} href={`/new?sub=${encodeURIComponent(c.slug)}`}
                  className={`shrink-0 h-[34px] flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.97] px-4 ${searchParams?.sub === c.slug ? 'bg-black text-white text-[11px] font-bold uppercase tracking-[0.04em]' : 'text-[13px] font-medium text-black/40 hover:text-black'}`}>
                  {c.name}
                </Link>
              ))}
              <div className="shrink-0 w-6"></div>
            </div>
          </div>

          <div className="w-[1px] h-4 bg-black/10 mx-1 shrink-0"></div>

          <Link href="/search" className="w-10 h-10 flex items-center justify-center shrink-0 rounded-full hover:bg-black/5 active:scale-[0.97] transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-4.3-4.3" />
            </svg>
          </Link>
        </div>
      </nav>
    </div>
  )
}
