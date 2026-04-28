'use client'
import React, { useRef } from 'react'
import ProductCard from './ProductCard'

interface RecommendationSectionProps {
  title: string
  products: any[]
  badge?: string
}

const RecommendationSection: React.FC<RecommendationSectionProps> = ({ title, products, badge }) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!products || products.length === 0) return null

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
    }
  }

  return (
    <section className="py-12 lg:py-20 border-t border-gray-100/50">
      <div className="flex items-end justify-between px-4 lg:px-0 mb-8 lg:mb-12">
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] lg:text-[42px] font-black uppercase leading-none tracking-tight text-[#111]" style={{ fontFamily: 'var(--font-brand)' }}>
            {title}
          </h2>
          <div className="w-12 h-1 bg-[#111]" />
        </div>
        
        <div className="hidden lg:flex gap-2">
          <button 
            onClick={() => scroll('left')}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300"
            aria-label="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button 
            onClick={() => scroll('right')}
            className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-300"
            aria-label="Next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex gap-2 lg:gap-4 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {products.map((product) => (
          <div key={product.id} className="min-w-[50%] sm:min-w-[33.33%] lg:min-w-[25%] snap-start">
            <ProductCard 
              product={product} 
              badges={badge ? [badge] : []}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  )
}

export default RecommendationSection
