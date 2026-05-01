'use client'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Footer() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null
  const [stores, setStores] = useState<Array<{ id: string; name?: string; city?: string | null; address?: string | null; mapsUrl?: string | null }>>([])

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await fetch('/api/fastapi/stores', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        })
        if (!res.ok) {
          setStores([])
          return
        }
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setStores(list)
      } catch (err) {
        setStores([])
      }
    }
    fetchStores()
  }, [])

  return (
    <footer className="mt-8 lg:mt-16 bg-[#111] text-white pt-12 pb-8">
      <div className="max-w-full mx-auto px-6 lg:px-10">
        
        {/* Upper Grid - Subscribe & Socials */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-10 border-b border-white/10 pb-10">
          <div className="w-full lg:max-w-md">
            <div className="mb-4">
              <span className="font-black text-[28px] leading-none tracking-[2px]" style={{ fontFamily: 'var(--font-brand)' }}>
                VINE<span className="text-[#ffd139]">SENT</span>
              </span>
            </div>
            <p className="text-[12px] text-white/70 mb-5 font-medium leading-relaxed">
              Преміальний дитячий одяг, що підкреслює унікальність кожної миті. Підпишіться на наші останні новини.
            </p>
            <form className="flex gap-2" onSubmit={e => e.preventDefault()}>
              <input type="email" className="flex-1 h-12 rounded-lg bg-white/10 border border-white/10 px-4 text-[13px] text-white outline-none focus:border-white/40 transition placeholder:text-white/40" placeholder="you@example.com" />
              <button type="submit" className="h-12 px-6 rounded-lg bg-white text-black text-[12px] font-bold uppercase hover:bg-gray-200 transition">OK</button>
            </form>
          </div>
          
          <div className="flex items-center gap-4">
              <a href="https://www.tiktok.com/@vinesent.style_" target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.47-.88-.64-1.6-1.53-2.02-2.53-.02 2.6-.01 5.2-.02 7.8-.1 3.29-2.35 6.26-5.53 7.12-3.37.93-7.14-.6-8.59-3.76-1.63-3.41-.05-8.03 3.65-9.43.7-.27 1.44-.4 2.19-.4v4.05c-1.34.12-2.61.94-3.13 2.18-.58 1.34-.18 3.09.96 4.02 1.12.91 2.87.97 4.06.15 1.05-.7 1.64-1.95 1.62-3.21-.01-4.22-.01-8.44-.01-12.66Z" />
                </svg>
              </a>
              <a href="https://www.instagram.com/vinesent.style/" target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
              </a>
              <a href="https://t.me/vinesent_style" target="_blank" rel="noopener noreferrer" className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/20 transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M20.665 3.717l-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701-.33 4.955c.488 0 .702-.223.974-.488l2.338-2.274 4.861 3.592c.897.494 1.54.239 1.763-.833l3.19-15.021c.326-1.307-.5-1.902-1.354-1.503z" /></svg>
              </a>
          </div>
        </div>

        {/* Lower Grid - Open Links */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-10 text-[13px]">
          {/* Column 1 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-widest text-white/50 mb-2">Про бренд</h4>
            <Link href="/pages/history" className="text-white/80 hover:text-white transition">Наша історія</Link>
            <Link href="/pages/contact" className="text-white/80 hover:text-white transition">Контакти</Link>
            <Link href="/pages/careers" className="text-white/80 hover:text-white transition">Вакансії</Link>
          </div>

          {/* Column 2 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-widest text-white/50 mb-2">Допомога</h4>
            <Link href="/pages/delivery" className="text-white/80 hover:text-white transition">Доставка і оплата</Link>
            <Link href="/pages/returns" className="text-white/80 hover:text-white transition">Повернення / обмін</Link>
            <Link href="/pages/sizes" className="text-white/80 hover:text-white transition">Таблиця розмірів</Link>
            <Link href="/pages/faq" className="text-white/80 hover:text-white transition">FAQ</Link>
          </div>

          {/* Column 3 */}
          <div className="flex flex-col gap-3">
            <h4 className="font-bold uppercase tracking-widest text-white/50 mb-2">Юридична інфо</h4>
            <Link href="/pages/terms" className="text-white/80 hover:text-white transition">Угода користувача</Link>
            <Link href="/pages/privacy" className="text-white/80 hover:text-white transition">Конфіденційність</Link>
            <Link href="/pages/cookies" className="text-white/80 hover:text-white transition">Cookies Policy</Link>
            <Link href="/pages/reviews" className="text-white/80 hover:text-white transition">Відгуки</Link>
          </div>

          {/* Column 4 */}
          <div className="flex flex-col gap-3 col-span-2 lg:col-span-1">
            <h4 className="font-bold uppercase tracking-widest text-white/50 mb-2">Зв&apos;язок</h4>
            <a href="tel:+380993708028" className="text-white/80 hover:text-white transition font-medium text-[15px]">+38 (099) 370-80-28</a>
            <a href="mailto:info@vinesent.com" className="text-white/80 hover:text-white transition">vinesent.shop@gmail.com</a>
            <span className="text-white/50 text-[12px] mt-1">Пн-Вс: 10:00 - 19:00</span>
            {stores.slice(0, 1).map((s) => {
              const city = (s.city || '').trim()
              const addr = (s.address || '').trim()
              const display = city && addr ? `${city}, ${addr}` : (city || addr || s.name || 'Офлайн магазин')
              return (
                <div key={s.id} className="text-white/80 mt-2">{display}</div>
              )
            })}
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pt-6 border-t border-white/10 text-[11px] text-white/40">
          <div className="flex gap-4">
            <img src="/logo-liqpay-symbol.png" alt="LiqPay" className="h-5 w-auto grayscale opacity-50" />
            <img src="/payments/visa.png" alt="Visa" className="h-4 w-auto grayscale opacity-50" />
            <img src="/payments/mastercard.png" alt="Mastercard" className="h-5 w-auto grayscale opacity-50" />
            <img src="/payments/apple-pay.svg" alt="Apple Pay" className="h-5 w-auto grayscale opacity-70" />
            <img src="/payments/google-pay.svg" alt="Google Pay" className="h-5 w-auto grayscale opacity-70" />
          </div>
          <div>&copy; {new Date().getFullYear()} VINESENT. Всі права захищені.</div>
        </div>
      </div>
    </footer>
  )
}
