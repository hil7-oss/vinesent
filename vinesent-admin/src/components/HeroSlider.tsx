'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Slide = {
  id: string
  title?: string
  subtitle?: string
  image?: string
  link?: string
}

export default function HeroSlider({ slides }: { slides: Slide[] }) {
  const items = useMemo(() => slides.filter(s => s && (s.image || s.title || s.subtitle || s.link)), [slides])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (items.length <= 1) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % items.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [items.length])

  if (!items.length) return null

  const current = items[index % items.length]
  const image = current.image || '/globe.svg'
  const title = current.title || 'NEW'
  const subtitle = current.subtitle || 'COLLECTION'
  const link = current.link || '/new'

  return (
    <div className="relative w-full aspect-[375/450] lg:aspect-[16/7] overflow-hidden">
      {items.map((slide, i) => {
        const img = slide.image || '/globe.svg'
        return (
          <div key={slide.id} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}>
            <img src={img} alt={slide.title || 'Hero'} className="w-full h-full object-cover" />
          </div>
        )
      })}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      <div className="absolute bottom-8 lg:bottom-16 left-4 lg:left-16 text-white">
        <div className="font-bold text-[42px] lg:text-[72px] uppercase leading-none mb-2" style={{ fontFamily: 'var(--font-brand)' }}>{title}</div>
        <div className="text-[13px] lg:text-[16px] uppercase tracking-[3px] font-medium" style={{ fontFamily: 'var(--font-brand)' }}>{subtitle}</div>
        <Link href={link} className="mt-4 lg:mt-6 inline-block bg-white text-black text-[12px] lg:text-[13px] font-semibold uppercase px-6 py-3 rounded-full hover:bg-black hover:text-white transition">
          Переглянути
        </Link>
      </div>
      {items.length > 1 && (
        <div className="absolute bottom-4 lg:bottom-6 right-4 lg:right-8 flex items-center gap-2">
          {items.map((slide, i) => (
            <button key={slide.id + i} onClick={() => setIndex(i)} className={`w-2.5 h-2.5 rounded-full border border-white/70 ${i === index ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      )}
    </div>
  )
}
