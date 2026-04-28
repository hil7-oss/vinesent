'use client'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { useState, useMemo } from 'react'

type Product = {
  id: string
  slug: string
  name: string
  price: number
  salePrice?: number | null
  oldPrice?: number | null
  images?: string
  colors?: string[]
}

export default function ProductCard({ product, badges }: { product: Product; showSale?: boolean; badges?: string[] }) {
  const [fav, setFav] = useState(false)
  const rawImg = getFirstImage(product.images)
  const img = useMemo(() => {
    if (!rawImg || typeof rawImg !== 'string') return ''
    if (rawImg.startsWith('http')) {
      // Cloudinary optimization
      if (rawImg.includes('res.cloudinary.com') && rawImg.includes('/upload/')) {
        return rawImg.replace('/upload/', '/upload/f_auto,q_auto,w_800,c_limit/')
      }
      return rawImg
    }
    // Keep site-relative for SSR; runtime will resolve to site domain
    return rawImg
  }, [rawImg])
  const placeholder = useMemo(() => {
    if (!img) return ''
    // If Cloudinary, request lightweight transformed preview
    if (img.includes('res.cloudinary.com') && img.includes('/upload/')) {
      return img.replace('/upload/', '/upload/f_auto,q_30,w_480,c_limit/')
    }
    // Local uploads: use backend-generated LQIP path
    if (typeof img === 'string' && img.startsWith('/uploads/')) {
      const parts = img.split('/uploads/')
      return `/uploads/_lqip/${parts[1]}`
    }
    return img
  }, [img])
  
  const hasSalePrice = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price
  const hasLegacyDiscount = !hasSalePrice && product.oldPrice != null && product.oldPrice > product.price
  const hasDiscount = hasSalePrice || hasLegacyDiscount
  const displayPrice = hasSalePrice ? product.salePrice! : product.price
  const displayOldPrice = hasSalePrice ? product.price : hasLegacyDiscount ? product.oldPrice : null
  const hasNewBadge = (badges || []).some(b => String(b || '').trim().toUpperCase() === 'NEW')

  const toggleFav = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const raw = localStorage.getItem('favorites') || '[]'
      let favs = JSON.parse(raw)
      const exists = favs.find((f: any) => f.id === product.id)
      if (exists) {
        favs = favs.filter((f: any) => f.id !== product.id)
        setFav(false)
      } else {
        favs.push({ id: product.id, slug: product.slug, name: product.name, price: product.price, images: product.images })
        setFav(true)
      }
      localStorage.setItem('favorites', JSON.stringify(favs))
      window.dispatchEvent(new Event('favoritesChanged'))
    } catch {}
  }

  const productLink = (() => {
    const parent = (product as any).parentSlug
    const cat = (product as any).categorySlug
    const slug = product.slug
    if (parent && cat) return `/products/${parent}/${cat}/${slug}`
    if (cat) return `/products/${cat}/${slug}`
    return `/products/${slug}`
  })()

  return (
    <Link href={productLink} className="group relative flex flex-col">
      <div className="relative w-full aspect-[2/3] bg-[#f5f5f5] overflow-hidden rounded-sm">
        {img ? (
          <>
            <img
              src={placeholder}
              alt={`${product.name} - VINESENT преміум дитячий одяг`}
              title={product.name}
              className="w-full h-full object-cover scale-[1.005]"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // Avoid broken-image icon if placeholder generation fails
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
            <Image
              src={img}
              alt={`${product.name} - VINESENT преміум дитячий одяг`}
              title={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover scale-[1.005] transition-transform duration-700 ease-out md:group-hover:scale-[1.04]"
            />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-label="Зображення відсутнє">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>
            </svg>
          </div>
        )}
        {(hasDiscount || hasNewBadge) && (
          <div className="absolute top-2 left-2 flex flex-col gap-1">
            {hasDiscount && (
              <span className="bg-[#C10000] text-white text-[9px] uppercase tracking-widest px-1.5 py-0.5">SALE</span>
            )}
            {hasNewBadge && (
              <span className="bg-white text-[#111] text-[9px] uppercase tracking-widest px-1.5 py-0.5">NEW</span>
            )}
          </div>
        )}
        <button
          onClick={toggleFav}
          className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-full"
          aria-label={fav ? "Видалити з обраного" : "Додати в обране"}
          title={fav ? "Видалити з обраного" : "Додати в обране"}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M12 20.5l-1.45-1.32C6.4 15.36 4 13.28 4 10.5 4 8.42 5.57 7 7.5 7c1.11 0 2.2.5 2.9 1.33C11.3 7.5 12.39 7 13.5 7 15.43 7 17 8.42 17 10.5c0 2.78-2.4 4.86-6.55 8.68L12 20.5z"/>
          </svg>
        </button>
      </div>
      <div className="p-2 lg:px-3 flex flex-col gap-1">
        {/* Название товара - всегда сверху, может занимать 1-2 строки */}
        <div className="line-clamp-2 font-[500] md:group-hover:underline uppercase text-[12px] leading-tight">
          {product.name}
        </div>
        
        {/* Цена - всегда на отдельной строке снизу */}
        <div className="flex items-center gap-2">
          <span className={`text-[13px] lg:text-[14px] font-bold tracking-normal ${hasDiscount ? 'text-[#C10000]' : 'text-[#111]'}`}>
            {formatPrice(displayPrice)}
          </span>
          {hasDiscount && displayOldPrice && (
            <span className="text-[10px] lg:text-[11px] text-gray-400 line-through">
              {formatPrice(displayOldPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
