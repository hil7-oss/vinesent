'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import MobileMenu from './MobileMenu'

export default function Header() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isAdmin = pathname.startsWith('/admin')
  const [favCount, setFavCount] = useState(0)
  const [cartCount, setCartCount] = useState(0)
  const [pulse, setPulse] = useState(false)
  const [promoBanner, setPromoBanner] = useState<any | null>(null)
  const [tick, setTick] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
      setFavCount(favs.length)
      const cart = JSON.parse(localStorage.getItem('localCart') || '[]')
      setCartCount(cart.length)
    } catch { }
  }, [pathname])

  useEffect(() => {
    const onFav = () => {
      try {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
        setFavCount(favs.length)
      } catch { }
    }
    const onCart = () => {
      try {
        const cart = JSON.parse(localStorage.getItem('localCart') || '[]')
        setCartCount(cart.length)
        setPulse(true)
        setTimeout(() => setPulse(false), 600)
      } catch { }
    }
    window.addEventListener('favoritesChanged', onFav as any)
    window.addEventListener('cartChanged', onCart as any)
    return () => {
      window.removeEventListener('favoritesChanged', onFav as any)
      window.removeEventListener('cartChanged', onCart as any)
    }
  }, [])

  if (isAdmin) return null

  useEffect(() => {
    fetch('/api/fastapi/promo-banners', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then((list: any[]) => {
        const active = Array.isArray(list) ? list.find(b => b && b.active) : null
        setPromoBanner(active || null)
      })
      .catch(() => setPromoBanner(null))
  }, [pathname])

  useEffect(() => {
    if (!promoBanner?.showTimer) return
    const id = window.setInterval(() => setTick(t => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [promoBanner?.showTimer, promoBanner?.timerEndsAt])

  const endsAtMs = promoBanner?.showTimer && promoBanner?.timerEndsAt ? new Date(promoBanner.timerEndsAt).getTime() : NaN
  const diffMs = Number.isFinite(endsAtMs) ? Math.max(0, endsAtMs - Date.now()) : 0
  const days = Math.floor(diffMs / 86400000)
  const hours = Math.floor((diffMs % 86400000) / 3600000)
  const minutes = Math.floor((diffMs % 3600000) / 60000)
  const seconds = Math.floor((diffMs % 60000) / 1000)
  const pad2 = (n: number) => String(n).padStart(2, '0')
  const showSort = pathname.startsWith('/category/') || pathname === '/sale' || pathname === '/new'
  const currentSort = (searchParams.get('sort') || '').toLowerCase()
  const buildSortHref = (sort: 'price_asc' | 'price_desc') => {
    const qs = new URLSearchParams(searchParams.toString())
    qs.set('sort', sort)
    return `${pathname}?${qs.toString()}`
  }

  return (
    <>
      <MobileMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      
      <div className="sticky top-0 left-0 right-0 z-50">
        {promoBanner && promoBanner.active && (
          <section
            className="w-full border-b overflow-hidden relative group"
            style={{ backgroundColor: promoBanner.bgColor || '#000', color: promoBanner.textColor || '#fff', borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <div className="max-w-full mx-auto px-4 lg:px-6 py-1.5 lg:py-2.5 flex flex-col sm:flex-row items-center justify-center gap-2 overflow-hidden">
              <div className="relative w-full flex items-center justify-center overflow-hidden">
                <div className={`flex items-center gap-12 ${promoBanner.showAnimation ? 'animate-marquee' : ''}`}>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] sm:text-[11px] tracking-[0.12em] uppercase font-bold whitespace-nowrap">
                      {promoBanner.text}
                    </span>
                    {promoBanner.buttonText && (
                      <Link
                        href={promoBanner.buttonLink || '/menu'}
                        className="h-6 px-3 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center transition hover:opacity-80 rounded-full"
                        style={{ backgroundColor: promoBanner.buttonBgColor || '#fff', color: promoBanner.buttonTextColor || '#000' }}
                      >
                        {promoBanner.buttonText}
                      </Link>
                    )}
                  </div>
                  
                  {/* Duplicated for marquee loop */}
                  {promoBanner.showAnimation && (
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[10px] sm:text-[11px] tracking-[0.12em] uppercase font-bold whitespace-nowrap">
                        {promoBanner.text}
                      </span>
                      {promoBanner.buttonText && (
                        <div
                          className="h-6 px-3 text-[10px] font-bold uppercase tracking-wide flex items-center justify-center rounded-full opacity-0"
                          style={{ backgroundColor: promoBanner.buttonBgColor || '#fff', color: promoBanner.buttonTextColor || '#000' }}
                        >
                          {promoBanner.buttonText}
                        </div>
                      )}
                    </div>
                  )}

                  {promoBanner.showTimer && (
                    <div className="flex items-center gap-2 text-[11px] sm:text-[12px] shrink-0" aria-label="countdown">
                      <span style={{ color: promoBanner.textColor ? `${promoBanner.textColor}99` : 'rgba(255,255,255,0.6)' }}><b style={{ color: promoBanner.textColor || '#fff', fontSize: '13px', fontWeight: 600 }}>{pad2(days)}</b> дн</span>
                      <span style={{ color: promoBanner.textColor ? `${promoBanner.textColor}99` : 'rgba(255,255,255,0.6)' }}><b style={{ color: promoBanner.textColor || '#fff', fontSize: '13px', fontWeight: 600 }}>{pad2(hours)}</b> год</span>
                      <span style={{ color: promoBanner.textColor ? `${promoBanner.textColor}99` : 'rgba(255,255,255,0.6)' }}><b style={{ color: promoBanner.textColor || '#fff', fontSize: '13px', fontWeight: 600 }}>{pad2(minutes)}</b> хв</span>
                      <span style={{ color: promoBanner.textColor ? `${promoBanner.textColor}99` : 'rgba(255,255,255,0.6)' }}><b style={{ color: promoBanner.textColor || '#fff', fontSize: '13px', fontWeight: 600 }}>{pad2(seconds)}</b> сек</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

      <header className="backdrop-blur-xl bg-white/70 border-b border-black/10 shadow-[0_1px_0_rgba(255,255,255,0.6)]">
        <div className="max-w-full mx-auto px-4 lg:px-6">
          <div className="flex items-center justify-between h-14 lg:h-16 relative">
            <div className="flex items-center gap-3 lg:gap-8">
              <button 
                onClick={() => setMenuOpen(true)} 
                className="lg:hidden w-6 h-6 flex items-center justify-center"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2">
                  <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
                </svg>
              </button>

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
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><circle cx="11" cy="11" r="7" /><path d="m20 20-4.2-4.2" strokeLinecap="round" /></svg>
              </Link>
              <Link href="/favorite" className="relative w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                {favCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#111] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{favCount}</span>
                )}
              </Link>
              <Link href="/cart" className={`relative w-8 h-8 flex items-center justify-center hover:opacity-60 transition ${pulse ? 'animate-pulse' : ''}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8" className={`${pulse ? 'scale-110 transition-transform' : ''}`}><path d="M6 6h14l-2 9H7L5 3H2" /><circle cx="9" cy="20" r="1.5" /><circle cx="17" cy="20" r="1.5" /></svg>
                {cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#111] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
                )}
              </Link>
              <Link href="/account" className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
                <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </header>
      </div>
    </>
  )
}
