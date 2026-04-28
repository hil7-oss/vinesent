'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function Header() {
  const pathname = usePathname()
  const isMenu = pathname === '/menu'
  const isAdmin = pathname.startsWith('/admin')
  const [favCount, setFavCount] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
      setFavCount(favs.length)
      const cart = JSON.parse(localStorage.getItem('localCart') || '[]')
      setCartCount(cart.length)
    } catch {}
  }, [pathname])

  useEffect(() => {
    const onFav = () => {
      try {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
        setFavCount(favs.length)
      } catch {}
    }
    const onCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('localCart') || '[]')
        setCartCount(cart.length)
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      } catch {}
    }
    window.addEventListener('favoritesChanged', onFav as any)
    window.addEventListener('cartChanged', onCart as any)
    return () => {
      window.removeEventListener('favoritesChanged', onFav as any)
      window.removeEventListener('cartChanged', onCart as any)
    }
  }, [])

  if (isAdmin) return null

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-black/5">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16 relative">
          <div className="flex items-center gap-3 lg:gap-8">
            {isMenu ? (
              <Link href="/" className="lg:hidden w-6 h-6 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
              </Link>
            ) : (
              <Link href="/menu" className="lg:hidden w-6 h-6 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round"/></svg>
              </Link>
            )}

            <Link href="/" className="flex flex-col items-start lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:items-center">
              <span className="text-[5px] lg:text-[7px] tracking-[2px] font-medium uppercase" style={{ fontFamily: 'var(--font-brand)' }}>premium kids fashion</span>
              <span className="font-bold text-[20px] lg:text-[35px] leading-none tracking-[1.5px]" style={{ fontFamily: 'var(--font-brand)' }}>
                VINE<span className="text-[#ffd139]">SENT</span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-6 ml-4">
              <Link href="/new" className="text-[13px] font-semibold uppercase tracking-wide hover:opacity-70 transition">New</Link>
              <Link href="/sale" className="text-[13px] font-semibold uppercase tracking-wide text-[#C10000] hover:opacity-70 transition">Sale</Link>
              <Link href="/category/girl" className="text-[13px] font-semibold uppercase tracking-wide hover:opacity-70 transition">Вона</Link>
              <Link href="/category/boy" className="text-[13px] font-semibold uppercase tracking-wide hover:opacity-70 transition">Він</Link>
              <Link href="/menu" className="text-[13px] font-medium uppercase tracking-wide hover:opacity-70 transition">Каталог</Link>
            </nav>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            <Link href="/search" className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2" strokeLinecap="round"/></svg>
            </Link>
            <Link href="/favorite" className="relative w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#111] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{favCount}</span>
              )}
            </Link>
            <Link href="/cart" className={`relative w-8 h-8 flex items-center justify-center hover:opacity-60 transition ${pulse ? 'animate-pulse' : ''}`}>
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" className={`${pulse ? 'scale-110 transition-transform' : ''}`}><path d="M6 6h14l-2 9H7L5 3H2"/><circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/></svg>
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#111] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
              )}
            </Link>
            <Link href="/account" className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
              <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
