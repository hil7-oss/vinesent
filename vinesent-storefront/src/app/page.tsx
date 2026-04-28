import Link from "next/link"
import Image from "next/image"
import HeroSlider from "@/components/HeroSlider"
import ProductCard from "@/components/product/ProductCard"
import { AnimatedSection } from "@/components/ui/AnimatedSection"
import { PromoBanner } from "@/components/ui/PromoBanner"
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
async function getSaleProducts() {
  const res = await fetch(api('/products?sale=true'), { cache: 'no-store' }).catch(() => null)
  return res?.ok ? await res.json() : []
}
async function getContent() {
  const res = await fetch(api('/content/home'), { cache: "no-store" }).catch(() => null)
  return res?.ok ? await res.json() : {}
}

// ── Section header ────────────────────────────
function SectionHeader({ title, href, label, red }: {
  title: string; href: string; label: string; red?: boolean
}) {
  return (
    <div className="flex items-end justify-between px-4 lg:px-10 mb-5 lg:mb-8">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-[2px]">
      {children}
    </div>
  )
}

// ── Shop link ─────────────────────────────────
function ShopLink({ href }: { href: string }) {
  return (
    <div className="flex items-center justify-center mt-6 lg:mt-10 mb-4">
      <Link
        href={href}
        className="group inline-flex items-center gap-4 text-[10px] font-bold tracking-[2.5px] uppercase text-[#111] hover:opacity-50 transition-opacity duration-300"
      >
        <span className="w-8 h-[3px] bg-[#111] group-hover:w-12 transition-all duration-300" />
        ВЕСЬ КАТАЛОГ
        <span className="w-8 h-[3px] bg-[#111] group-hover:w-12 transition-all duration-300" />
      </Link>
    </div>
  )
}

// ── Resolve image src (local /uploads/ or external) ──
function resolveImg(src: any, fallback: string): string {
  if (!src) return fallback
  
  // Convert to string and trim
  let s = String(src).trim()
  if (!s || s === 'null' || s === 'undefined') return fallback

  // Ensure we have a string before calling startsWith
  if (typeof s !== 'string') return fallback

  if (s.startsWith('http')) return s
  if (s.startsWith('/uploads/')) return s
  if (s.startsWith('uploads/')) return `/${s}`
  if (s.startsWith('/')) return s
  
  // If it doesn't match standard patterns, try to check if it's a relative path that should be in /uploads/
  if (!s.includes('/') && s.includes('.')) {
    return `/uploads/${s}`
  }

  return fallback
}

// ── Main ──────────────────────────────────────
export default async function Home() {
  const categories = await getCategories()
  const allProducts = await getAllProducts()
  const autoNew = await getNewProducts()
  const autoSale = await getSaleProducts()
  const content = await getContent()

  const girlCat = categories.find((c: any) => c.slug === 'girl') || null
  const boyCat = categories.find((c: any) => c.slug === 'boy') || null
  const girlImage = resolveImg(girlCat?.image, '/file.svg')
  const boyImage = resolveImg(boyCat?.image, '/window.svg')

  const heroSlides = (content?.banners || []).filter((b: any) => b.position === 'hero' && b.active !== false)
  const heroSlidesSafe = heroSlides.length
    ? heroSlides
    : [{ id: 'hero-default', title: 'NEW', subtitle: 'COLLECTION', image: '/globe.svg', link: '/new' }]

  // ── Promo banners for homepage blocks ───────
  const allBanners: any[] = content?.banners || []
  const promo1Data = allBanners.find((b: any) => b.position === 'promo1') || null
  const promo2Data = allBanners.find((b: any) => b.position === 'promo2') || null

  // Defaults if admin hasn't configured yet
  const promo1 = {
    title: promo1Data?.title || 'ОБИРАЮТЬ ІДЕАЛЬНЕ',
    subtitle: promo1Data?.subtitle || 'Преміальна якість для вашої дитини',
    linkText: promo1Data?.buttonText || 'Переглянути каталог',
    linkHref: promo1Data?.link || promo1Data?.buttonLink || '/menu',
    imageSrc: resolveImg(promo1Data?.image, '/globe.svg'),
    bgColor: promo1Data?.bgColor || 'bg-gray-900',
    textColor: 'text-white',
    active: promo1Data ? (promo1Data.active !== false) : true,
  }
  const promo2 = {
    title: promo2Data?.title || 'КОЛЕКЦІЇ',
    subtitle: promo2Data?.subtitle || 'Зібрані образи спеціально для вас',
    linkText: promo2Data?.buttonText || 'Переглянути',
    linkHref: promo2Data?.link || promo2Data?.buttonLink || '/menu',
    imageSrc: resolveImg(promo2Data?.image, '/window.svg'),
    bgColor: promo2Data?.bgColor || 'bg-gray-100',
    textColor: promo2Data?.textColor || 'text-black',
    active: promo2Data ? (promo2Data.active !== false) : true,
  }

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
  const extraNew = (Array.isArray(autoNew) ? autoNew : []).filter((p: any) => !pinnedNewIds.has(String(p?.id || '')))
  const newProducts = pinnedNew.concat(extraNew)

  const pinnedSale = getCollectionProducts('SALE')
  const pinnedSaleIds = new Set(pinnedSale.map((p: any) => String(p?.id || '')))
  const extraSale = (Array.isArray(autoSale) ? autoSale : []).filter((p: any) => !pinnedSaleIds.has(String(p?.id || '')))
  const saleProducts = pinnedSale.concat(extraSale)

  const extraCollections = (content?.collections || []).filter(
    (c: any) => !['NEW', 'SALE'].includes((c.key || '').toUpperCase())
  )

  // 1. Sort by order, then use fallback logic
  const sortedCategories = [...categories].sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
  
  const seasonSlugs = ['winter', 'spring', 'summer', 'autumn']
  const seasons = seasonSlugs.map(slug => sortedCategories.find((c: any) => c.slug === slug)).filter(Boolean)
  const otherCategories = sortedCategories.filter((c: any) => !seasonSlugs.includes(c.slug) && !['girl', 'boy'].includes(c.slug))

  return (
    <div className="bg-white overflow-hidden">
      {/* ── Hero ── */}
      <HeroSlider slides={heroSlidesSafe} />

      <div className="w-full">
        {/* ── Gender split ── */}
        <AnimatedSection delay={0} className="lg:py-4">
          <div className="grid grid-cols-2 gap-[2px] lg:gap-2">
            {[
              { href: '/category/girl', image: girlImage, label: 'ВОНА' },
              { href: '/category/boy', image: boyImage, label: 'ВІН' },
            ].map(({ href, image, label }) => (
              <Link key={href} href={href} className="group relative flex flex-col">
                <div className="relative w-full aspect-[4/5] overflow-hidden bg-gray-100">
                  <Image
                    src={image}
                    alt={label}
                    fill
                    sizes="50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                    priority={true}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-100" />
                </div>
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-[20px] lg:text-[42px] font-black uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </AnimatedSection>

        {/* ── NEW (Повноцінна сітка) ── */}
        <AnimatedSection delay={0.1} className="py-10 pb-4 lg:py-16">
          <SectionHeader title={getCollectionTitle('NEW', 'NEW')} href="/new" label="Всі новинки" />
          {newProducts.length === 0 ? <EmptySection /> : (
            <ProductGrid>
              {newProducts.map((p: any) => <ProductCard key={p.id} product={p} badges={['NEW']} />)}
            </ProductGrid>
          )}
          <ShopLink href="/new" />
        </AnimatedSection>

        {/* ── Promo Banner 1 (from admin, dynamic) ── */}
        {promo1.active && (
          <AnimatedSection delay={0}>
            <PromoBanner
              title={promo1.title}
              subtitle={promo1.subtitle}
              linkText={promo1.linkText}
              linkHref={promo1.linkHref}
              imageSrc={promo1.imageSrc}
              bgColor={promo1.bgColor}
            />
          </AnimatedSection>
        )}

        {/* ── Сезони (Великі блоки) ── */}
        {seasons.length > 0 && (
          <AnimatedSection delay={0.1} className="py-10 lg:py-16 bg-gray-50/50">
            <SectionHeader title="СЕЗОНИ" href="/menu" label="Весь каталог" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4 px-2 lg:px-10">
              {seasons.map((cat: any) => {
                const seasonNames: Record<string, string> = { winter: 'Зима', spring: 'Весна', summer: 'Літо', autumn: 'Осінь' }
                const seasonUA = seasonNames[cat.slug as string] || cat.name
                const img = resolveImg(cat.image, '/window.svg')
                return (
                  <Link key={cat.id} href={`/category/${cat.slug}`} className="group relative aspect-[3/4] overflow-hidden bg-gray-100">
                    <Image
                      src={img}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                      unoptimized={typeof img === 'string' && img.startsWith('/uploads/')}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/0 opacity-90 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                      <span className="text-[16px] lg:text-[24px] font-black uppercase text-white tracking-wide" style={{ fontFamily: 'var(--font-brand)' }}>
                        {seasonUA}
                      </span>
                      <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        →
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </AnimatedSection>
        )}

        {/* ── Інші Категорії (NEW, SALE, підкатегорії) ── */}
        {otherCategories.length > 0 && (
          <AnimatedSection delay={0.1} className="pb-10 lg:pb-16 pt-10">
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 lg:gap-4 px-2 lg:px-10">
              {otherCategories.slice(0, 12).map((cat: any) => {
                // Multi-level image resolution
                let src = cat.image;
                
                // 1. Try Collection image if category has none
                if (!src) {
                  const colKey = (cat.slug || '').toUpperCase();
                  src = (content?.collections || []).find((c: any) => (c.key || '').toUpperCase() === colKey)?.image;
                }

                // 2. Try First Product image if still none
                if (!src) {
                  const firstProd = allProducts.find((p: any) => 
                    p.categoryId === cat.id || (p.categories || []).some((pc: any) => pc.id === cat.id)
                  );
                  if (firstProd && firstProd.images) {
                    try {
                      const imgs = JSON.parse(firstProd.images);
                      if (Array.isArray(imgs) && imgs.length > 0) src = imgs[0];
                    } catch {
                      if (typeof firstProd.images === 'string') src = firstProd.images;
                    }
                  }
                }

                const resolved = resolveImg(src, '/file.svg');

                return (
                <Link key={cat.id} href={`/category/${cat.slug}`} className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-100">
                  <Image
                    src={resolved}
                    alt={cat.name}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized={!!src}
                  />
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                  <div className="absolute inset-0 flex items-center justify-center p-2">
                    <span className="text-white font-bold text-[12px] md:text-[14px] uppercase text-center">{cat.name}</span>
                  </div>
                </Link>
              )})}
            </div>
          </AnimatedSection>
        )}

        {/* ── SALE (Повноцінна сітка) ── */}
        <AnimatedSection delay={0.1} className="py-8 lg:py-16">
          <SectionHeader title={getCollectionTitle('SALE', 'SALE')} href="/sale" label="Всі пропозиції" red />
          {saleProducts.length === 0 ? <EmptySection /> : (
            <ProductGrid>
              {saleProducts.map((p: any) => <ProductCard key={p.id} product={p} showSale badges={['SALE']} />)}
            </ProductGrid>
          )}
          <ShopLink href="/sale" />
        </AnimatedSection>

        {/* ── Promo Banner 2 (from admin, dynamic) ── */}
        {promo2.active && (
          <AnimatedSection delay={0}>
            <PromoBanner
              title={promo2.title}
              subtitle={promo2.subtitle}
              linkText={promo2.linkText}
              linkHref={promo2.linkHref}
              imageSrc={promo2.imageSrc}
              bgColor={promo2.bgColor}
              textColor={promo2.textColor}
            />
          </AnimatedSection>
        )}

        {/* ── Extra collections ── */}
        {extraCollections.map((col: any) => {
          const items = (col.productIds || []).map((id: string) => allProductsMap.get(id)).filter(Boolean)
          const href = `/collection/${encodeURIComponent(col.key)}`
          return (
            <AnimatedSection key={col.id} className="pb-10 lg:pb-16 mt-10">
              <SectionHeader title={col.title || col.key} href={href} label="Переглянути" />
              {items.length === 0 ? <EmptySection /> : (
                <ProductGrid>
                  {items.map((p: any) => <ProductCard key={p.id} product={p} />)}
                </ProductGrid>
              )}
              <ShopLink href={href} />
            </AnimatedSection>
          )
        })}

      </div>
    </div>
  )
}
