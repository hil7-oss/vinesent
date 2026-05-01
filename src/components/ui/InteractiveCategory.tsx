'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

interface Category {
  label: string
  href: string
  image: string
  subItems?: { label: string; href: string }[]
}

export function InteractiveCategory({ items }: { items: Category[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null)

  const toggle = (idx: number) => {
    setActiveIdx(activeIdx === idx ? null : idx)
  }

  return (
    <div className="grid grid-cols-2 gap-1 lg:gap-2">
      {items.map((item, idx) => {
        const isActive = activeIdx === idx
        return (
          <div key={idx} className="relative flex flex-col">
            <button 
              onClick={() => toggle(idx)}
              className={`relative w-full aspect-[4/5] overflow-hidden bg-gray-100 outline-none transition-opacity duration-300 ${activeIdx !== null && activeIdx !== idx ? 'opacity-40 grayscale' : 'opacity-100'}`}
            >
              <Image 
                src={item.image} 
                alt={`${item.label} collection`} 
                fill 
                className="object-cover" 
              />
              {/* Overlay with gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                <span className="text-[18px] lg:text-[32px] font-black uppercase" style={{ fontFamily: 'var(--font-brand)' }}>
                  {item.label}
                </span>
                <motion.svg
                  animate={{ rotate: isActive ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </motion.svg>
              </div>
            </button>

            {/* Expanded Content Dropdown */}
            <AnimatePresence>
              {isActive && item.subItems && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden bg-[#111]"
                >
                  <div className="flex flex-col p-4 gap-3">
                    <Link href={item.href} className="text-white text-[12px] font-bold uppercase tracking-widest border-b border-white/20 pb-2 flex justify-between items-center group">
                      Весь каталог
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                    </Link>
                    {item.subItems.map((sub, i) => (
                      <Link 
                        key={i} 
                        href={sub.href} 
                        className="text-white/70 hover:text-white text-[14px] capitalize py-1 transition-colors flex justify-between items-center group"
                      >
                        {sub.label}
                        <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">→</span>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
