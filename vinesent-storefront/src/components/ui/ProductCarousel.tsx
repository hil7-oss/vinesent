'use client'

import React from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import ProductCard from '../product/ProductCard'

interface ProductCarouselProps {
  products: any[]
  badges?: string[]
  showSale?: boolean
}

export function ProductCarousel({ products, badges, showSale }: ProductCarouselProps) {
  const [emblaRef] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  })

  if (!products || products.length === 0) return null

  return (
    <div className="overflow-hidden w-full pl-4 lg:pl-10 pb-4" ref={emblaRef}>
      <div className="flex gap-2 lg:gap-4 touch-pan-y">
        {products.map((p) => (
          <div key={p.id} className="flex-[0_0_45%] sm:flex-[0_0_30%] lg:flex-[0_0_22%] min-w-0">
            <ProductCard product={p} badges={badges} showSale={showSale} />
          </div>
        ))}
        {/* Adds padding to the very end of the scroll */}
        <div className="flex-[0_0_4px] lg:flex-[0_0_40px]" />
      </div>
    </div>
  )
}
