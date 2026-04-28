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
    <div className="max-w-[1400px] mx-auto px-0 md:px-6 md:pt-6">
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        <h1 className="text-[24px] lg:text-[36px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{col?.title || 'NEW'}</h1>
        <Link href="/filter" className="flex items-center gap-2 text-[13px] font-medium hover:opacity-60 transition">
          <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round"/></svg>
          Фільтр
        </Link>
      </div>
      <div className="flex items-center gap-3 mb-8 overflow-x-auto scrollbar-hide">
        <Link href={`/new`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-semibold uppercase ${!searchParams?.sub && !searchParams?.sort ? 'bg-[#111] text-white' : 'border border-black/15'}`}>Усі</Link>
        {children.map((c: any) => (
          <Link key={c.id} href={`/new?sub=${encodeURIComponent(c.slug)}`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sub === c.slug ? 'bg-black text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>
            {c.name}
          </Link>
        ))}
        <span className="w-px h-5 bg-black/10 mx-2" />
        <Link href={`/new?sort=price_asc`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sort === 'price_asc' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Ціна ↑</Link>
        <Link href={`/new?sort=price_desc`} className={`flex-shrink-0 px-4 py-2 rounded-full text-[12px] font-medium uppercase ${searchParams?.sort === 'price_desc' ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-black hover:text-white transition'}`}>Ціна ↓</Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-20 text-[14px] text-gray-500">Товарів поки немає</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[6px] gap-y-[6px] md:gap-x-[8px] md:gap-y-[8px] lg:gap-x-[8px] lg:gap-y-[8px]">
          {products.map((p: any) => <ProductCard key={p.id} product={p} badges={['NEW']} />)}
        </div>
      )}
    </div>
  )
}
