'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    shortLabel: 'Головна',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5"/>
        <rect x="14" y="3" width="7" height="7" rx="1.5"/>
        <rect x="3" y="14" width="7" height="7" rx="1.5"/>
        <rect x="14" y="14" width="7" height="7" rx="1.5"/>
      </svg>
    ),
  },
  {
    href: '/admin/products',
    label: 'Товари',
    shortLabel: 'Товари',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
      </svg>
    ),
  },
  {
    href: '/admin/categories',
    label: 'Категорії',
    shortLabel: 'Кат.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 6h16M4 10h16M4 14h10M4 18h7"/>
      </svg>
    ),
  },
  {
    href: '/admin/orders',
    label: 'Замовлення',
    shortLabel: 'Замов.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
      </svg>
    ),
  },
  {
    href: '/admin/users',
    label: 'Користувачі',
    shortLabel: 'Юзери',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
  {
    href: '/admin/stores',
    label: 'Самовивіз',
    shortLabel: 'Точки',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"/>
        <circle cx="12" cy="10" r="2.5"/>
      </svg>
    ),
  },
  {
    href: '/admin/pos',
    label: 'POS',
    shortLabel: 'POS',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
        <path d="M14 17h3m0 0h3m-3 0v-3m0 3v3"/>
      </svg>
    ),
  },
  {
    href: '/admin/content',
    label: 'Конструктор',
    shortLabel: 'Сайт',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
        <path d="M7 8h2M7 12h4"/>
      </svg>
    ),
  },
]

// Items shown in mobile bottom bar (most important 5)
const mobileNavItems = navItems.filter(i => ['/admin', '/admin/products', '/admin/orders', '/admin/content', '/admin/pos'].includes(i.href))

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ═══════════════════════════════════════
          DESKTOP SIDEBAR
      ═══════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-56 xl:w-64 h-screen sticky top-0 bg-white border-r border-gray-100 flex-shrink-0 overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-gray-100">
          <Link href="/admin" className="block">
            <div className="text-[9px] tracking-[3px] font-medium uppercase text-gray-400 mb-0.5">premium kids</div>
            <div className="font-black text-[20px] leading-none tracking-tight">
              VINE<span className="text-[#ffd139]">SENT</span>
            </div>
            <div className="text-[10px] text-gray-400 mt-1 tracking-widest uppercase">Admin</div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? 'bg-gray-950 text-white'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="w-[18px] h-[18px] flex-shrink-0">{item.icon}</span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-100">
          <Link href="/" className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
            На сайт
          </Link>
        </div>
      </aside>

      {/* ═══════════════════════════════════════
          MOBILE TOP BAR
      ═══════════════════════════════════════ */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-gray-100 flex items-center justify-between px-4">
        <Link href="/admin" className="flex items-baseline gap-0.5">
          <span className="font-black text-[17px] leading-none tracking-tight">
            VINE<span className="text-[#ffd139]">SENT</span>
          </span>
          <span className="text-[9px] text-gray-400 ml-1.5 uppercase tracking-widest">Admin</span>
        </Link>

        {/* Active page label */}
        <div className="text-[13px] font-semibold text-gray-700">
          {navItems.find(i => isActive(i.href))?.label || ''}
        </div>

        {/* Link back to site */}
        <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </Link>
      </div>

      {/* ═══════════════════════════════════════
          MOBILE BOTTOM NAV
      ═══════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 safe-area-pb">
        <div className="flex items-stretch">
          {mobileNavItems.map(item => {
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-all ${
                  active ? 'text-gray-950' : 'text-gray-400 active:text-gray-700'
                }`}
              >
                {/* Active dot */}
                <div className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all ${active ? 'bg-gray-950' : ''}`}>
                  <span className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : ''}`}>
                    {item.icon}
                  </span>
                </div>
                <span className={`text-[10px] font-medium leading-none ${active ? 'text-gray-950' : 'text-gray-400'}`}>
                  {item.shortLabel}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
