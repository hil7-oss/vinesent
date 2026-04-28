import Link from "next/link"
import HeroSlider from "@/components/HeroSlider"
import ProductCard from "@/components/product/ProductCard"
import { api } from "@/lib/api"

async function getCategories() {
  const res = await fetch(api('/categories'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}
async function getAllProducts() {
  const res = await fetch(api('/products'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}
async function getNewProducts() {
  const res = await fetch(api('/products?new=true'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}
async function getContent() {
  const res = await fetch(api('/content'), { cache: "no-store" }).catch(() => null)
  return res?.ok ? await res.json() : []
}

// ── Section header ────────────────────────────
function SectionHeader({ title, href, label, red }: {
  title: string; href: string; label: string; red?: boolean
}) {
  return (
    <div className="flex items-end justify-between mb-5 lg:mb-8">
      <div className="flex items-baseline gap-4">
        <h2
          className={`text-[22px] sm:text-[28px] lg:text-[38px] font-black uppercase leading-none tracking-tight ${red ? 'text-[#C10000]' : 'text-[#111]'}`}
          style={{ fontFamily: 'var(--font-brand)' }}
        >
          {title}
        </h2>
       
      </div>
      <Link
        href={href}
        className="text-[11px] font-semibold uppercase tracking-[1.5px] text-gray-400 hover:text-[#111] transition border-b border-gray-200 hover:border-[#111] pb-0.5"
      >
        {label}
      </Link>
    </div>
  )
}

// ── Empty state ───────────────────────────────
function EmptySection() {
  return (
    <div className="py-16 text-center text-[13px] text-gray-300 tracking-wider uppercase">
      Товарів поки немає
    </div>
  )
}

// ── Product grid ──────────────────────────────
function ProductGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[3px] sm:gap-[5px]">
      {children}
    </div>
  )
}

// ── Shop link ─────────────────────────────────
function ShopLink({ href }: { href: string }) {
  return (
    <div className="flex items-center justify-center mt-8 lg:mt-12">
      <Link
        href={href}
        className="group inline-flex items-center gap-4 text-[10px] font-bold tracking-[2.5px] uppercase text-[#111] hover:opacity-50 transition-opacity duration-300"
      >
        <span className="w-8 h-[3px] bg-[#111] group-hover:w-12 transition-all duration-300" />
        SHOP COLLECTION
        <span className="w-8 h-[3px] bg-[#111] group-hover:w-12 transition-all duration-300" />
      </Link>
    </div>
  )
}

// ── Divider ───────────────────────────────────
function Divider() {
  return <div className="border-t border-gray-100 my-10 lg:my-16" />
}

// ── Main ──────────────────────────────────────
export default async function Home() {
  const categories = await getCategories()
  const allProducts = await getAllProducts()
  const autoNew = await getNewProducts()
  const content = await getContent()

  const girlCat = categories.find((c: any) => c.slug === 'girl') || null
  const boyCat  = categories.find((c: any) => c.slug === 'boy')  || null
  const girlImage = girlCat?.image || '/file.svg'
  const boyImage  = boyCat?.image  || '/window.svg'

  const heroSlides = (content?.banners || []).filter((b: any) => b.position === 'hero' && b.active !== false)
  const heroSlidesSafe = heroSlides.length
    ? heroSlides
    : [{ id: 'hero-default', title: 'NEW', subtitle: 'COLLECTION', image: '/globe.svg', link: '/new' }]

  const allProductsMap = new Map((allProducts || []).map((p: any) => [p.id, p]))
  const getCollectionProducts = (key: string) => {
    const col = (content?.collections || []).find((c: any) => c.key === key)
    return (col?.productIds || []).map((id: string) => allProductsMap.get(id)).filter(Boolean)
  }
  const getCollectionTitle = (key: string, fallback: string) => {
    const col = (content?.collections || []).find((c: any) => c.key === key)
    return col?.title || fallback
  }

  const pinnedNew = getCollectionProducts('NEW')
  const pinnedNewIds = new Set(pinnedNew.map((p: any) => String(p?.id || '')))
  const extraNew = (Array.isArray(autoNew) ? autoNew : []).filter((p: any) => !pinnedNewIds.has(String(p?.id || ''))).slice(0, Math.max(0, 12 - pinnedNew.length))
  const newProducts = pinnedNew.concat(extraNew)
  const saleProducts   = getCollectionProducts('SALE')
  const casualProducts = getCollectionProducts('CASUAL')
  const extraCollections = (content?.collections || []).filter(
    (c: any) => !['NEW', 'SALE', 'CASUAL'].includes((c.key || '').toUpperCase())
  )

  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <HeroSlider slides={heroSlidesSafe} />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Gender split ── */}
        <section className="py-10 lg:py-16">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-6">
            {[
              { href: '/category/girl', image: girlImage, label: 'ВОНА' },
              { href: '/category/boy',  image: boyImage,  label: 'ВІН'  },
            ].map(({ href, image, label }) => (
              <Link key={href} href={href} className="group flex flex-col gap-2 sm:gap-3">
                <div className="w-full aspect-[3/4] sm:aspect-[4/5] overflow-hidden rounded-sm bg-gray-100">
                  <img
                    src={image} alt={label}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                  />
                </div>
                <div className="flex items-center justify-between px-0.5">
                  <span
                    className="text-[15px] sm:text-[18px] lg:text-[22px] font-black uppercase tracking-tight"
                    style={{ fontFamily: 'var(--font-brand)' }}
                  >
                    {label}
                  </span>
                  <span className="text-[11px] text-gray-400 font-medium uppercase tracking-widest hidden sm:block">
                    Дивитися →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <Divider />

        {/* ── NEW ── */}
        <section className="pb-10 lg:pb-16">
          <SectionHeader title={getCollectionTitle('NEW', 'NEW')} href="/new" label="Всі новинки" />
          {newProducts.length === 0 ? <EmptySection /> : (
            <ProductGrid>
              {newProducts.map((p: any) => <ProductCard key={p.id} product={p} badges={['NEW']} />)}
            </ProductGrid>
          )}
          <ShopLink href="/new" />
        </section>

        <Divider />

        {/* ── SALE ── */}
        <section className="pb-10 lg:pb-16">
          <SectionHeader title={getCollectionTitle('SALE', 'SALE')} href="/sale" label="Всі пропозиції" red />
          {saleProducts.length === 0 ? <EmptySection /> : (
            <ProductGrid>
              {saleProducts.map((p: any) => <ProductCard key={p.id} product={p} showSale badges={['SALE']} />)}
            </ProductGrid>
          )}
          <ShopLink href="/sale" />
        </section>

        <Divider />

        {/* ── CASUAL ── */}
        <section className="pb-10 lg:pb-16">
          <SectionHeader title={getCollectionTitle('CASUAL', 'CASUAL')} href="/menu" label="Каталог" />
          {casualProducts.length === 0 ? <EmptySection /> : (
            <ProductGrid>
              {casualProducts.map((p: any) => <ProductCard key={p.id} product={p} />)}
            </ProductGrid>
          )}
          <ShopLink href="/menu" />
        </section>

        {/* ── Extra collections ── */}
        {extraCollections.map((col: any) => {
          const items = (col.productIds || []).map((id: string) => allProductsMap.get(id)).filter(Boolean)
          const href = `/collection/${encodeURIComponent(col.key)}`
          return (
            <section key={col.id} className="pb-10 lg:pb-16">
              <Divider />
              <SectionHeader title={col.title || col.key} href={href} label="Переглянути" />
              {items.length === 0 ? <EmptySection /> : (
                <ProductGrid>
                  {items.map((p: any) => <ProductCard key={p.id} product={p} />)}
                </ProductGrid>
              )}
              <ShopLink href={href} />
            </section>
          )
        })}

        {/* ── Season collections — desktop grid ── */}
        <section className="hidden lg:block pb-20">
          <Divider />
          <SectionHeader title="Колекції" href="/menu" label="Весь каталог" />
          <div className="grid grid-cols-4 gap-3">
            {['WINTER', 'SPRING', 'SUMMER', 'AUTUMN'].map(season => {
              const cat   = categories.find((c: any) => c.slug === season.toLowerCase())
              const image = cat?.image
              return (
                <Link key={season} href={`/category/${season.toLowerCase()}`}
                  className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-gray-100">
                  {image
                    ? <img src={image} alt={season} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700 ease-out" />
                    : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
                        <span className="text-[22px] font-black uppercase text-gray-400" style={{ fontFamily: 'var(--font-brand)' }}>{season}</span>
                      </div>
                    )
                  }
                  {/* overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  {image && (
                    <div className="absolute bottom-0 left-0 right-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <span className="text-[18px] font-black uppercase text-white tracking-wide" style={{ fontFamily: 'var(--font-brand)' }}>
                        {season}
                      </span>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </section>

{/* ── Season — mobile photo cards ── */}
<section className="lg:hidden pb-10">
  <Divider />
  <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-4">Сезони</div>
  <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
    {['WINTER', 'SPRING', 'SUMMER', 'AUTUMN'].map(season => {
      const cat   = categories.find((c: any) => c.slug === season.toLowerCase())
      const image = cat?.image
      return (
        <Link key={season} href={`/category/${season.toLowerCase()}`}
          className="flex-shrink-0 w-36 flex flex-col gap-2">
          <div className="w-full aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 relative">
            {image
              ? <img src={image} alt={season} className="w-full h-full object-cover" />
              : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
                  <span className="text-[13px] font-black uppercase text-gray-400" style={{ fontFamily: 'var(--font-brand)' }}>{season}</span>
                </div>
              )
            }
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-3">
              <span className="text-[13px] font-black uppercase text-white tracking-wide" style={{ fontFamily: 'var(--font-brand)' }}>
                {season}
              </span>
            </div>
          </div>
        </Link>
      )
    })}
  </div>
</section>
      </div>
    </div>
  )
}
