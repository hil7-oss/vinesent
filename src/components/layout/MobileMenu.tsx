'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { API_BASE } from '@/lib/api'

export default function MobileMenu({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname()
  const [categories, setCategories] = useState<any[]>([])
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden' // Prevent background scrolling
      fetch(`${API_BASE}/categories`)
        .then(r => r.json())
        .then(setCategories)
        .catch(() => [])
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      onClose()
    }
  }, [pathname])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col transform transition-transform duration-300">
      {/* Header */}
      <div className="flex justify-between items-center px-4 h-14 border-b border-black/10">
        <Link href="/" onClick={onClose} className="flex flex-col items-start mt-0.5">
          <span className="text-[5px] tracking-[2px] font-medium uppercase text-gray-500" style={{ fontFamily: 'var(--font-brand)' }}>premium kids fashion</span>
          <span className="font-bold text-[20px] leading-none tracking-[1.5px]" style={{ fontFamily: 'var(--font-brand)' }}>
            VINE<span className="text-[#ffd139]">SENT</span>
          </span>
        </Link>
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-black transition">
          <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.5">
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-10">
        <nav className="flex flex-col space-y-8">
          <div className="flex justify-between items-center border-b border-black/5 pb-5 group">
            <Link href="/new" className="text-[16px] font-semibold uppercase tracking-[0.1em] group-hover:opacity-60 transition-opacity w-full">Новинки | New</Link>
          </div>
          
          <div className="flex justify-between items-center border-b border-black/5 pb-5 group">
            <Link href="/sale" className="text-[16px] font-semibold uppercase tracking-[0.1em] text-[#C10000] group-hover:opacity-60 transition-opacity w-full">SALE %</Link>
          </div>
          
          <div className="flex justify-between items-center border-b border-black/5 pb-5 group">
            <Link href="/category/girl" className="text-[16px] font-medium uppercase tracking-[0.1em] group-hover:opacity-60 transition-opacity w-full">Дівчаткам (Вона)</Link>
          </div>
          
          <div className="flex justify-between items-center border-b border-black/5 pb-5 group">
            <Link href="/category/boy" className="text-[16px] font-medium uppercase tracking-[0.1em] group-hover:opacity-60 transition-opacity w-full">Хлопчикам (Він)</Link>
          </div>

          <div className="flex justify-between items-center border-b border-black/5 pb-5 group">
             <Link href="/menu" className="text-[16px] font-medium uppercase tracking-[0.1em] group-hover:opacity-60 transition-opacity w-full">Всі товари (Каталог)</Link>
          </div>
        </nav>
      </div>

      {/* Footer info in Menu */}
      <div className="px-6 py-6 border-t border-black/5 bg-[#fafafa]">
         <div className="flex gap-4 justify-between items-center">
            <div className="flex flex-col gap-2">
              <Link href="/account" className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.1em] hover:opacity-60 transition">
                <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Особистий кабінет
              </Link>
              <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
                © VINESENT {new Date().getFullYear()}
              </div>
            </div>
            
            <Link href="/search" className="w-11 h-11 flex items-center justify-center rounded-full bg-black text-white hover:bg-black/80 transition shadow-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4.2-4.2" strokeLinecap="round" />
              </svg>
            </Link>
         </div>
      </div>
    </div>
  )
}
