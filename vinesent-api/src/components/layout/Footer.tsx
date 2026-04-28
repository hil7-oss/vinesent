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
              <a href="https://www.instagram.com/vinesent.style/" className="w-9 h-9 flex items-center justify-center rounded-full border border-black/10 hover:bg-black hover:text-white transition">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02Z"/></svg>
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
              <li><a href="mailto:info@vinesent.com" className="text-[13px] text-gray-600 hover:text-black transition">helper@vinesent.com</a></li>
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
              <a href="mailto:info@vinesent.com" className="block text-[13px] text-gray-600">helper@vinesent.com</a>
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
