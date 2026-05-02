'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { API_BASE } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default function MenuPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch(`${API_BASE}/categories`).then(r => r.json()).then(setCategories).catch(() => []).finally(() => setLoading(false))
  }, [])

  const menuLinks = [
    { href: '/new', label: 'NEW', accent: false },
    { href: '/sale', label: 'SALE', accent: true },
  ]

  const staticLinks = [
    { href: '/category/girl', label: 'Вона', desc: 'Колекція для дівчаток' },
    { href: '/category/boy', label: 'Він', desc: 'Колекція для хлопчиків' },
  ]
  const girlCat = categories.find((c: any) => (c?.slug || '').toLowerCase() === 'girl')
  const boyCat = categories.find((c: any) => (c?.slug || '').toLowerCase() === 'boy')
  const girlImage = girlCat?.image || '/file.svg'
  const boyImage = boyCat?.image || '/window.svg'

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-[20px] lg:text-[28px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Каталог</h1>

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">
        <div className="lg:col-span-1">
          <div className="space-y-1 mb-8">
            {menuLinks.map(l => (
              <Link key={l.href} href={l.href} className={`block py-3 text-[16px] lg:text-[18px] font-bold uppercase border-b border-black/5 hover:pl-2 transition-all ${l.accent ? 'text-[#C10000]' : ''}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="space-y-1 mb-8">
            {staticLinks.map(l => (
              <Link key={l.href} href={l.href} className="block py-3 border-b border-black/5 hover:pl-2 transition-all">
                <div className="text-[15px] lg:text-[16px] font-semibold uppercase">{l.label}</div>
                <div className="text-[12px] text-gray-400 mt-0.5">{l.desc}</div>
              </Link>
            ))}
          </div>

          {loading && (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="animate-pulse h-12 bg-gray-100 rounded" />
              ))}
            </div>
          )}

          {categories.filter((c: any) => !c.parentId).map((parent: any) => {
            const children = categories.filter((x: any) => x.parentId === parent.id)
            const isOpen = open[parent.id] || false
            return (
              <div key={parent.id} className="border-b border-black/5">
                <button
                  onClick={() => setOpen(p => ({ ...p, [parent.id]: !isOpen }))}
                  className="w-full flex items-center justify-between py-3 hover:pl-2 transition-all"
                >
                  <span className="text-[14px] lg:text-[15px] font-semibold">{parent.name}</span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                </button>
                {isOpen && children.length > 0 && (
                  <div className="pl-4 pb-2">
                    {children.map((child: any) => (
                      <Link key={child.id} href={`/category/${child.slug}`} className="block py-2 text-[13px] text-gray-700 hover:pl-2 transition-all">
                        {child.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="hidden lg:block lg:col-span-3">
          <div className="grid grid-cols-3 gap-6">
            <Link href="/category/girl" className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-gray-100">
              <img src={girlImage} alt="Вона" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <div className="text-[24px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>Вона</div>
                <div className="text-[13px] opacity-80">Дивитись колекцію</div>
              </div>
            </Link>
            <Link href="/category/boy" className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-gray-100">
              <img src={boyImage} alt="Він" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 text-white">
                <div className="text-[24px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>Він</div>
                <div className="text-[13px] opacity-80">Дивитись колекцію</div>
              </div>
            </Link>
            <Link href="/sale" className="group relative aspect-[3/4] overflow-hidden rounded-sm bg-gray-100">
              <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[48px] font-bold text-[#C10000]" style={{ fontFamily: 'var(--font-brand)' }}>SALE</div>
                  <div className="text-[14px] text-[#C10000]/70 mt-2">До -50%</div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
