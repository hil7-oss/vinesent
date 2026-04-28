'use client'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-black/10">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-4 text-[13px] font-semibold uppercase tracking-wide">
        <span>{title}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
      </button>
      {open && <div className="pb-4 space-y-2">{children}</div>}
    </div>
  )
}

export default function Footer() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null

  return (
    <footer className="mt-16 border-t border-black/10 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
        <div className="lg:grid lg:grid-cols-4 lg:gap-12">
          <div className="mb-8 lg:mb-0">
            <div className="mb-4">
              <span className="text-[5px] lg:text-[6px] tracking-[2px] font-medium uppercase block" style={{ fontFamily: 'var(--font-brand)' }}>premium kids fashion</span>
              <span className="font-bold text-[24px] leading-none tracking-[1.5px]" style={{ fontFamily: 'var(--font-brand)' }}>
                VINE<span className="text-[#ffd139]">SENT</span>
              </span>
            </div>
            <div className="flex items-center gap-3 mb-6">
              <a href="https://www.tiktok.com/@vinesent.style_" target="_blank" rel="noopener noreferrer" className="w-9 h-9 flex items-center justify-center rounded-full border border-black/10 hover:bg-black hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.89-.6-4.09-1.47-.88-.64-1.6-1.53-2.02-2.53-.02 2.6-.01 5.2-.02 7.8-.1 3.29-2.35 6.26-5.53 7.12-3.37.93-7.14-.6-8.59-3.76-1.63-3.41-.05-8.03 3.65-9.43.7-.27 1.44-.4 2.19-.4v4.05c-1.34.12-2.61.94-3.13 2.18-.58 1.34-.18 3.09.96 4.02 1.12.91 2.87.97 4.06.15 1.05-.7 1.64-1.95 1.62-3.21-.01-4.22-.01-8.44-.01-12.66Z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/vinesent.style/" className="w-9 h-9 flex items-center justify-center rounded-full border border-black/10 hover:bg-black hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </a>
              <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full border border-black/10 hover:bg-black hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M20.665 3.717a.686.686 0 0 0-.686-.118L2.94 10.156a.678.678 0 0 0 .028 1.258l5.526 2.227 2.053 6.32a.68.68 0 0 0 1.15.228l2.903-3.192 4.673 3.515a.68.68 0 0 0 1.077-.42l3.414-16a.688.688 0 0 0-.099-.376Z"/></svg>
              </a>
            </div>
            <div className="text-[13px] font-medium mb-3">Підпишіться на новини VINESENT</div>
            <form className="flex gap-2" onSubmit={e => e.preventDefault()}>
              <input type="email" className="flex-1 h-11 rounded-xl border border-black/15 px-4 text-[13px] outline-none focus:border-black/40 transition" placeholder="you@example.com" />
              <button type="submit" className="h-11 px-5 rounded-xl bg-[#111] text-white text-[12px] font-semibold uppercase hover:bg-black/80 transition">OK</button>
            </form>
          </div>

          <div className="hidden lg:block">
            <h4 className="text-[13px] font-semibold uppercase tracking-wide mb-4">Про VINESENT</h4>
            <ul className="space-y-2">
              <li><a href="/pages/history" className="text-[13px] text-gray-600 hover:text-black transition">Наша історія</a></li>
              <li><a href="/pages/contact" className="text-[13px] text-gray-600 hover:text-black transition">Контакти</a></li>
              <li><a href="/pages/careers" className="text-[13px] text-gray-600 hover:text-black transition">Вакансії</a></li>
            </ul>
          </div>

          <div className="hidden lg:block">
            <h4 className="text-[13px] font-semibold uppercase tracking-wide mb-4">Покупцям</h4>
            <ul className="space-y-2">
              <li><a href="/pages/delivery" className="text-[13px] text-gray-600 hover:text-black transition">Доставка і оплата</a></li>
              <li><a href="/pages/returns" className="text-[13px] text-gray-600 hover:text-black transition">Повернення та обмін</a></li>
              <li><a href="/pages/sizes" className="text-[13px] text-gray-600 hover:text-black transition">Таблиця розмірів</a></li>
              <li><a href="/pages/faq" className="text-[13px] text-gray-600 hover:text-black transition">FAQ</a></li>
            </ul>
          </div>

          <div className="hidden lg:block">
            <h4 className="text-[13px] font-semibold uppercase tracking-wide mb-4">Контакти</h4>
            <ul className="space-y-2">
              <li><a href="tel:+380993708028" className="text-[13px] text-gray-600 hover:text-black transition">+38 (99) 370-80-28</a></li>
              <li><a href="mailto:info@vinesent.com" className="text-[13px] text-gray-600 hover:text-black transition">vinesent.shop@gmail.com</a></li>
              <li><span className="text-[13px] text-gray-600">Пн-Пт: 10:00 - 19:00</span></li>
            </ul>
          </div>

          <div className="lg:hidden">
            <Accordion title="Про VINESENT">
              <a href="/pages/history" className="block text-[13px] text-gray-600">Наша історія</a>
              <a href="/pages/contact" className="block text-[13px] text-gray-600">Контакти</a>
              <a href="/pages/careers" className="block text-[13px] text-gray-600">Вакансії</a>
            </Accordion>
            <Accordion title="Покупцям">
              <a href="/pages/delivery" className="block text-[13px] text-gray-600">Доставка і оплата</a>
              <a href="/pages/returns" className="block text-[13px] text-gray-600">Повернення та обмін</a>
              <a href="/pages/sizes" className="block text-[13px] text-gray-600">Таблиця розмірів</a>
              <a href="/pages/faq" className="block text-[13px] text-gray-600">FAQ</a>
            </Accordion>
            <Accordion title="Контакти">
              <a href="tel:+380000000000" className="block text-[13px] text-gray-600">+38 (099) 370-80-28</a>
              <a href="mailto:info@vinesent.com" className="block text-[13px] text-gray-600">vinesent.shop@gmail.com</a>
              <span className="block text-[13px] text-gray-600">Пн-Вс: 10:00 - 19:00</span>
            </Accordion>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-black/10 text-center text-[11px] text-gray-400">
          &copy; 2026 VINESENT. Всі права захищені.
        </div>
      </div>
    </footer>
  )
}
