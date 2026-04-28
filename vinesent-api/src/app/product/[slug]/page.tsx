'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { formatPrice, getAllImages, getFirstImage } from '@/lib/utils'
import { API_BASE } from '@/lib/api'
import { useRouter } from 'next/navigation'

type Product = {
  id: string
  slug: string
  name: string
  description?: string
  price: number
  salePrice?: number | null
  images?: string
  stock?: number
  category?: { name: string }
  categories?: Array<{ id: string; name: string; slug: string; parentId?: string | null }>
  measurements?: Record<string, Record<string, string>>
}

type Variant = { id: string; productId: string; size?: string; color?: string; stock: number; images?: string | null }

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const [current, setCurrent] = useState(index)
  const touchStartX = useRef<number | null>(null)

  const prev = useCallback(() => setCurrent(c => (c - 1 + images.length) % images.length), [images.length])
  const next = useCallback(() => setCurrent(c => (c + 1) % images.length), [images.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [prev, next, onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (Math.abs(diff) > 50) diff > 0 ? next() : prev()
        touchStartX.current = null
      }}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition"
      >
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={e => e.stopPropagation()}>
        <img
          src={images[current]}
          alt=""
          className="max-w-full max-h-[90vh] object-contain select-none"
          draggable={false}
        />
      </div>

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center text-white/70 hover:text-white transition"
        >
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}

      {/* Counter */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-[13px]">
          {current + 1} / {images.length}
        </div>
      )}
    </div>
  )
}

// ─── Mobile Slider ────────────────────────────────────────────────────────────
function MobileSlider({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const prev = () => setCurrent(c => (c - 1 + images.length) % images.length)
  const next = () => setCurrent(c => (c + 1) % images.length)

  if (images.length === 0) {
    return (
      <div className="relative w-full aspect-[3/4] bg-gray-100 mb-3 overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full aspect-[3/4] bg-gray-100 mb-3 overflow-hidden"
      onTouchStart={e => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
        touchStartX.current = null
      }}
    >
      <img
        src={images[current]}
        alt=""
        className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
        onClick={() => onOpen(current)}
        draggable={false}
      />

      {/* Prev / Next arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); prev() }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center shadow transition"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={e => { e.stopPropagation(); next() }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white flex items-center justify-center shadow transition"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? 'bg-white w-4' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Desktop Gallery (mosaic like reference) ─────────────────────────────────
function DesktopGallery({ images, onOpen }: { images: string[]; onOpen: (i: number) => void }) {
  if (images.length === 0) {
    return (
      <div className="hidden lg:block">
        <div className="w-full aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
          <svg className="w-16 h-16 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
          </svg>
        </div>
      </div>
    )
  }

  // 1 image — just show it
  if (images.length === 1) {
    return (
      <div className="hidden lg:block">
        <div
          className="w-full bg-[#f4f4f4] cursor-zoom-in overflow-hidden"
          onClick={() => onOpen(0)}
        >
          <img src={images[0]} alt="" className="w-full h-auto block" />
        </div>
      </div>
    )
  }

  // Mosaic grid: big left + right grid (like reference)
  // Left: images[0] — full height
  // Right: up to 6 images in 2-col grid
  const rightImages = images.slice(1, 7)
  // Pad to even number for clean grid
  const gridItems = rightImages.length % 2 !== 0 ? [...rightImages, null] : rightImages

  return (
    <div className="hidden lg:block">
      <div
        className="grid gap-[3px]"
        style={{ gridTemplateColumns: '1.4fr 1fr' }}
      >
        {/* Big left image */}
        <div
          className="bg-[#f4f4f4] cursor-zoom-in overflow-hidden row-span-3"
          style={{ gridRow: `span ${Math.ceil(gridItems.length / 2)}` }}
          onClick={() => onOpen(0)}
        >
          <img
            src={images[0]}
            alt=""
            className="w-full h-full object-cover block"
            style={{ minHeight: '100%' }}
          />
        </div>

        {/* Right grid */}
        {gridItems.map((img, i) =>
          img ? (
            <div
              key={img + i}
              className="bg-[#f4f4f4] cursor-zoom-in overflow-hidden aspect-[3/4]"
              onClick={() => onOpen(i + 1)}
            >
              <img src={img} alt="" className="w-full h-full object-cover block" />
            </div>
          ) : (
            <div key={"empty" + i} className="bg-[#f0f0f0] aspect-[3/4]" />
          )
        )}
      </div>
    </div>
  )
}
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductPage({ params }: { params: { slug: string } }) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [color, setColor] = useState<string | null>(null)
  const [size, setSize] = useState<string | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [added, setAdded] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(true)
  const [variants, setVariants] = useState<Variant[]>([])
  const [suggestions, setSuggestions] = useState<Product[]>([])
  const [qty, setQty] = useState(1)
  const [measurementsOpen, setMeasurementsOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const measurementsRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  const variantColors = Array.from(new Set(variants.map(v => (v.color || '').trim()).filter(Boolean))) as string[]
  const variantSizes = Array.from(new Set(variants.map(v => (v.size || '').trim()).filter(Boolean))) as string[]
  const measurementSizes = product?.measurements ? Object.keys(product.measurements) : []
  const colors = variantColors
  const sizes = variantSizes.length > 0 ? variantSizes : measurementSizes.length > 0 ? measurementSizes : []
  const activeMeasurements = (() => {
    if (!product?.measurements) return null
    const key = size || Object.keys(product.measurements)[0]
    return key ? product.measurements[key] || null : null
  })()

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        let p: Product | null = null
        let all: Product[] = []
        try {
          const r = await fetch(`${API_BASE}/products`, { cache: 'no-store' })
          if (r.ok) {
            all = await r.json()
            p = all.find((x: any) => x.slug === params.slug || x.id === params.slug) || null
          }
        } catch {}

        setProduct(p)
        if (p && Array.isArray(all) && all.length > 0) {
          const others = all.filter(x => x.id !== p!.id).slice(0, 8)
          setSuggestions(others)
        }
        if (p) {
          try {
            const vres = await fetch(`${API_BASE}/variants?productId=${p.id}`, { cache: 'no-store' })
            if (vres.ok) {
              const list = await vres.json()
              setVariants(Array.isArray(list) ? list : [])
            }
          } catch {}
          try {
            const mres = await fetch(`${API_BASE}/products/${p.id}/measurements`, { cache: 'no-store' })
            if (mres.ok) {
              const data = await mres.json().catch(() => null)
              const meas = data?.measurements
              if (meas && typeof meas === 'object') {
                setProduct(prev => prev && prev.id === p.id ? { ...prev, measurements: meas } : prev)
                const keys = Object.keys(meas)
                if (keys.length) setSize(prev => prev || keys[0])
              }
            }
          } catch {}
          const favRaw = localStorage.getItem('favorites') || '[]'
          try {
            const favs = JSON.parse(favRaw)
            setFavorite(!!favs.find((f: any) => f.id === p.id))
          } catch {}
        }
      } finally {
        setLoading(false)
      }
    }
    fetchProduct()
  }, [params.slug])

  // ── Реальные изображения без дублирования ──
  const displayedImages = product ? getAllImages(product.images).filter(Boolean) : []

  useEffect(() => {
    if (!color && colors.length > 0) setColor(colors[0])
  }, [colors, color])

  useEffect(() => {
    if (!size && sizes.length > 0) setSize(sizes[0])
  }, [sizes, size])

  const toggleFavorite = useCallback(() => {
    if (!product) return
    const raw = localStorage.getItem('favorites') || '[]'
    let favs: any[] = []
    try { favs = JSON.parse(raw) } catch {}
    const exists = favs.find(f => f.id === product.id)
    if (exists) {
      favs = favs.filter(f => f.id !== product.id)
      setFavorite(false)
    } else {
      favs.push({ id: product.id, slug: product.slug, name: product.name, price: product.price, images: product.images })
      setFavorite(true)
    }
    localStorage.setItem('favorites', JSON.stringify(favs))
    window.dispatchEvent(new Event('favoritesChanged'))
  }, [product])

  const addToCart = async () => {
    if (!product) return
    const raw = localStorage.getItem('localCart') || '[]'
    let cart: any[] = []
    try { cart = JSON.parse(raw) } catch { cart = [] }
    const idx = cart.findIndex(i => i.productId === product.id)
    if (idx >= 0) cart[idx].quantity = (cart[idx].quantity || 0) + Math.max(1, qty)
    else cart.push({ productId: product.id, quantity: Math.max(1, qty) })
    localStorage.setItem('localCart', JSON.stringify(cart))
    setAdded(true)
    try { window.dispatchEvent(new Event('cartChanged')) } catch {}
    router.push('/cart')
  }

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10">
        <div className="animate-pulse">
          <div className="w-full aspect-square lg:aspect-[4/5] bg-gray-200 rounded mb-6" />
          <div className="h-5 bg-gray-200 rounded w-1/3 mb-3" />
          <div className="h-6 bg-gray-200 rounded w-1/4" />
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-20 text-center">
        <div className="text-[18px] font-semibold mb-4">Товар не знайдено</div>
        <Link href="/" className="text-[14px] underline">На головну</Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-5 lg:py-8">
      {/* Lightbox */}
      {lightboxIndex !== null && (
        <Lightbox
          images={displayedImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Breadcrumbs */}
      <div className="text-[11px] text-gray-400 uppercase tracking-wide mb-4">
        <Link href="/" className="hover:text-gray-600 transition">Головна</Link>
        <span className="mx-2">›</span>
        <Link href="/menu" className="hover:text-gray-600 transition">Каталог</Link>
        {(product as any).categories?.[0]?.slug && (
          <>
            <span className="mx-2">›</span>
            <Link href={`/category/${(product as any).categories?.[0]?.slug}`} className="hover:text-gray-600 transition">
              {(product as any).categories?.[0]?.name || 'Категорія'}
            </Link>
          </>
        )}
      </div>

      <div className="lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-12">
        {/* Gallery */}
        <div>
          {/* Mobile */}
          <div className="lg:hidden">
            <MobileSlider images={displayedImages} onOpen={i => setLightboxIndex(i)} />
          </div>

          {/* Desktop */}
          <DesktopGallery images={displayedImages} onOpen={i => setLightboxIndex(i)} />
        </div>

        {/* Product Info */}
        <div className="lg:sticky lg:top-20 lg:pr-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[26px] leading-none font-medium uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{product.name}</h1>
              <div className="mt-2 text-[12px] text-gray-500">
                {(product as any).categories?.[0]?.name || product.category?.name || 'VINESENT'}
              </div>
            </div>
            <button onClick={toggleFavorite} className="flex-shrink-0 w-10 h-10 flex items-center justify-center border border-black/10 hover:bg-black/5 transition">
              <svg viewBox="0 0 24 24" width="20" height="20" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                <path d="M12 20.5l-1.45-1.32C6.4 15.36 4 13.28 4 10.5 4 8.42 5.57 7 7.5 7c1.11 0 2.2.5 2.9 1.33C11.3 7.5 12.39 7 13.5 7 15.43 7 17 8.42 17 10.5c0 2.78-2.4 4.86-6.55 8.68L12 20.5z"/>
              </svg>
            </button>
          </div>

          <div className="mt-4 text-[16px]">
            {product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price ? (
              <div className="flex items-baseline gap-3">
                <span className="text-[14px] text-gray-400 line-through">{formatPrice(product.price)}</span>
                <span className="text-[18px] font-semibold text-[#C10000]">{formatPrice(product.salePrice!)}</span>
              </div>
            ) : (
              <span className="text-[18px] font-semibold">{formatPrice(product.price)}</span>
            )}
          </div>

          {colors.length > 0 && (
            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-3">Оберіть колір</div>
              <div className="grid grid-cols-2 gap-2">
                {colors.map((c, i) => {
                  const label = String(c || '').toUpperCase()
                  const thumb = displayedImages[0] || ''
                  const selected = color === c
                  return (
                    <button
                      key={c + String(i)}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`border p-2 text-left transition ${selected ? 'border-black' : 'border-black/15 hover:border-black/30'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-14 bg-gray-100 overflow-hidden flex-shrink-0 relative">
                          {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                          {label.startsWith('#') && (
                            <span className="absolute bottom-1 left-1 w-3 h-3 ring-1 ring-black/10" style={{ backgroundColor: c }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-medium uppercase truncate">{label || '—'}</div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {sizes.length > 0 && (
            <div className="mt-6 border-t border-black/10 pt-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Розмір</div>
                {product.measurements && Object.keys(product.measurements).length > 0 && (
                  <button
                    onClick={() => {
                      setMeasurementsOpen(v => !v)
                      requestAnimationFrame(() => measurementsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
                    }}
                    className="text-[11px] text-gray-500 underline"
                  >
                    Таблиця розмірів
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`h-9 px-3 border text-[12px] font-medium uppercase transition ${size === s ? 'border-black bg-black text-white' : 'border-black/15 hover:border-black/30'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!measurementsOpen && activeMeasurements && (
            <div className="mb-6">
              <div className="text-[12px] font-semibold uppercase tracking-wide mb-2">
                Швейні заміри для розміру {size || Object.keys(product!.measurements || {})[0]}
              </div>
              <div className="space-y-2">
                {Object.entries(activeMeasurements).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600">{k}</span>
                    <span className="text-[13px] font-medium">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {measurementsOpen && product.measurements && Object.keys(product.measurements).length > 0 && (
            <div ref={measurementsRef} className="mb-6">
              <div className="text-[12px] font-semibold uppercase tracking-wide mb-3">Таблиця розмірів</div>
              <div className="space-y-4">
                {Object.entries(product.measurements).map(([sz, rows]) => (
                  <div key={sz} className="border border-black/10 rounded-2xl p-4 bg-white">
                    <div className="text-[13px] font-semibold uppercase mb-3">Розмір {sz}</div>
                    <div className="space-y-2">
                      {Object.entries(rows || {}).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-[13px] text-gray-600">{k}</span>
                          <span className="text-[13px] font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="sticky bottom-0 bg-white pt-5 pb-4 border-t border-black/10 mt-6">
            <div className="mb-4">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Кількість</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 border border-black/15 hover:bg-gray-50">-</button>
                <input value={qty} onChange={e => setQty(Math.max(1, parseInt(e.target.value || '1') || 1))} className="w-16 h-10 text-center border border-black/15" />
                <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 border border-black/15 hover:bg-gray-50">+</button>
              </div>
            </div>
            <button
              onClick={addToCart}
              className={`w-full h-12 text-[13px] font-semibold uppercase transition ${added ? 'bg-green-600 text-white' : 'bg-[#111] text-white hover:bg-black/80'}`}
            >
              {added ? 'Додано до кошика' : 'Купити'}
            </button>
          </div>

          {/* Details Accordion */}
          <div className="mt-8 border-t border-black/10">
            <button onClick={() => setDetailsOpen(!detailsOpen)} className="flex items-center justify-between w-full py-4 text-[13px] font-semibold uppercase tracking-wide">
              <span>Деталі</span>
              <svg className={`w-4 h-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round"/>
              </svg>
            </button>
            {detailsOpen && (
              <div className="pb-4 text-[14px] text-gray-600 leading-relaxed">
                {product.description || 'Преміум дитячий одяг від VINESENT. Виготовлено з натуральних матеріалів найвищої якості.'}
              </div>
            )}
          </div>

          <div className="border-t border-black/10">
            <div className="py-4 text-[13px] text-gray-500">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                <span>Безкоштовна доставка від 2000 грн</span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0"/><path d="m9 12 2 2 4-4"/></svg>
                <span>14 днів на повернення</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span>Безпечна оплата</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Complete the Look */}
      {suggestions.length > 0 && (
        <div className="mt-10 lg:mt-16">
          <h2 className="text-[16px] lg:text-[18px] font-bold uppercase mb-6" style={{ fontFamily: 'var(--font-brand)' }}>Доповніть образ</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 lg:gap-x-6 gap-y-8 lg:gap-y-12">
            {suggestions.slice(0, 4).map((p) => {
              const img = getFirstImage(p.images || '')
              return (
                <Link key={p.id} href={`/product/${p.slug}`} className="group flex flex-col">
                  <div className="relative w-full aspect-[3/4] bg-gray-100 mb-3 overflow-hidden rounded-sm">
                    {img ? (
                      <img src={img} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="text-[12px] lg:text-[13px] uppercase font-semibold truncate mb-1">{p.name}</div>
                  <div className="flex items-baseline gap-2">
                    {(p as any).salePrice != null && (p as any).salePrice > 0 && (p as any).salePrice < (p as any).price ? (
                      <>
                        <span className="text-[11px] text-gray-400 line-through">{formatPrice((p as any).price)}</span>
                        <span className="text-[13px] lg:text-[14px] font-bold text-[#C10000]">{formatPrice((p as any).salePrice)}</span>
                      </>
                    ) : (
                      <span className="text-[13px] lg:text-[14px] font-bold">{formatPrice((p as any).price)}</span>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
