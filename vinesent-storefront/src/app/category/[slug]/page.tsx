import type { Metadata } from 'next'
import Link from 'next/link'
import { formatPrice, getFirstImage, cn } from '@/lib/utils'
import { api } from '@/lib/api'
import ProductCard from '@/components/product/ProductCard'

export const dynamic = 'force-dynamic'

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vinesent.com').replace(/\/+$/, '')

const FALLBACK_NAMES: Record<string, string> = {
  girl: 'Вона — Дитячий одяг для дівчаток',
  boy: 'Він — Дитячий одяг для хлопчиків',
  winter: 'Зимова колекція',
  spring: 'Весняна колекція',
  summer: 'Літня колекція',
  autumn: 'Осіння колекція',
}

// ─── Dynamic metadata ─────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  let catName = FALLBACK_NAMES[params.slug] || ''
  let catImage = ''

  try {
    const res = await fetch(api('/categories'), { cache: 'no-store' })
    if (res.ok) {
      const cats = await res.json()
      const cat = Array.isArray(cats) ? cats.find((c: any) => c.slug === params.slug) : null
      if (cat?.name) catName = cat.name
      if (cat?.image) catImage = cat.image.startsWith('http') ? cat.image : `${siteUrl}${cat.image}`
    }
  } catch { }

  const displayName = catName || params.slug
  const title = `${displayName} | VINESENT — Преміум дитячий одяг`
  const description = `Купити ${displayName} у магазині VINESENT. Кращий вибір преміум одягу для дітей від українського бренду.`
  const canonicalUrl = `${siteUrl}/category/${params.slug}`

  const ogImages = catImage ? [{ url: catImage, width: 800, height: 1067, alt: displayName }] : []

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${displayName} | VINESENT`,
      description,
      url: canonicalUrl,
      images: ogImages,
      locale: 'uk_UA',
      siteName: 'VINESENT',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${displayName} | VINESENT`,
      description,
      images: ogImages.map(i => i.url),
    },
    robots: { index: true, follow: true },
  }
}

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

export default async function CategoryPage({ params, searchParams }: { params: { slug: string }, searchParams: { sort?: string; sale?: string; sub?: string; newest?: string; view?: string } }) {
  const { cat, children } = await getData(params.slug, searchParams || {})
  const fallbackNames: Record<string, string> = {
    girl: 'Вона',
    boy: 'Він',
    winter: 'WINTER',
    spring: 'SPRING',
    summer: 'SUMMER',
    autumn: 'AUTUMN',
  }
  const title = cat?.name || fallbackNames[params.slug] || 'Каталог'

  // BreadcrumbList Schema
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Головна",
        "item": siteUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": title,
        "item": `${siteUrl}/category/${params.slug}`
      }
    ]
  };

  // Всегда показываем товары
  const { list } = await getData(params.slug, searchParams || {})

  return (
    <div className="mx-auto pt-6 lg:pt-10">
      {/* BreadcrumbList Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 lg:mb-8 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
            <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
          <h1 className="text-[24px] lg:text-[32px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/category/${params.slug}?${new URLSearchParams({ ...searchParams, sort: 'price_asc' }).toString()}`}
            className={`h-9 px-4 flex items-center justify-center border text-[11px] font-medium uppercase tracking-[0.1em] transition-all rounded-[2px] ${searchParams?.sort === 'price_asc' ? 'bg-black text-white border-black' : 'bg-transparent text-black border-[#E5E5E5] hover:border-black'}`}
          >
            Ціна ↑
          </Link>
          <Link
            href={`/category/${params.slug}?${new URLSearchParams({ ...searchParams, sort: 'price_desc' }).toString()}`}
            className={`h-9 px-4 flex items-center justify-center border text-[11px] font-medium uppercase tracking-[0.1em] transition-all rounded-[2px] ${searchParams?.sort === 'price_desc' ? 'bg-black text-white border-black' : 'bg-transparent text-black border-[#E5E5E5] hover:border-black'}`}
          >
            Ціна ↓
          </Link>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
          </div>
          <div className="text-[14px] text-gray-500">Товарів поки немає</div>
        </div>
      ) : (
        <div className="pb-24">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[6px] gap-y-[6px] md:gap-x-[8px] md:gap-y-[8px] lg:gap-x-[8px] lg:gap-y-[8px]">
            {list.map((p: any) => (
              <ProductCard
                key={p.id}
                product={{
                  ...p,
                  price: Number(p.price || 0),
                  salePrice: p.salePrice != null ? Number(p.salePrice) : null
                }}
              />
            ))}
          </div>
        </div>
      )}

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
              <Link href={`/category/${params.slug}`}
                className={`shrink-0 h-[34px] flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.97] px-6 ${!searchParams?.sort && !searchParams?.sale && !searchParams?.sub && !searchParams?.newest ? 'bg-black text-white text-[11px] font-bold uppercase tracking-[0.04em]' : 'text-[13px] font-medium text-black/40 hover:text-black'}`}>
                Усі
              </Link>

              <Link href={`/category/${params.slug}?sale=1`}
                className={`shrink-0 h-[34px] px-6 flex items-center justify-center rounded-full transition-all duration-300 text-[11px] font-bold uppercase tracking-[0.04em] active:scale-[0.97] active:opacity-90 ${searchParams?.sale === '1' ? 'bg-black text-white' : 'bg-[#ff2d55] text-white'}`}>
                Sale %
              </Link>

              <Link href={`/category/${params.slug}?newest=1`}
                className={`shrink-0 h-[34px] flex items-center justify-center rounded-full transition-all duration-300 active:scale-[0.97] px-4 ${searchParams?.newest === '1' ? 'bg-black text-white text-[11px] font-bold uppercase tracking-[0.04em]' : 'text-[13px] font-medium text-black/40 hover:text-black'}`}>
                Новинки
              </Link>

              {children.map((c: any) => (
                <Link key={c.id} href={`/category/${params.slug}?sub=${encodeURIComponent(c.slug)}`}
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
