'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function Section({ title, children, open: defOpen = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [open, setOpen] = useState(defOpen)
  return (
    <div className="border-b border-black/10">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full py-4 text-[14px] font-semibold uppercase tracking-wide">
        <span>{title}</span>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" strokeLinecap="round"/></svg>
      </button>
      {open && <div className="pb-5">{children}</div>}
    </div>
  )
}

export default function FilterPage() {
  const router = useRouter()
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [sort, setSort] = useState('new')

  const sizes = ['104', '110', '116', '122', '128', '134', '140', '146', '152', '158', '164', '170', '176']
  const colors = [
    { name: 'Червоний', hex: '#AF0000' },
    { name: 'Чорний', hex: '#000000' },
    { name: 'Зелений', hex: '#006400' },
    { name: 'Синій', hex: '#1e40af' },
    { name: 'Білий', hex: '#ffffff' },
    { name: 'Рожевий', hex: '#ec4899' },
    { name: 'Бежевий', hex: '#d4a574' },
    { name: 'Фіолетовий', hex: '#5b21b6' },
  ]

  const toggleSize = (s: string) => {
    setSelectedSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [prev, s])
  }
  const toggleColor = (c: string) => {
    setSelectedColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [prev, c])
  }

  const apply = () => {
    router.back()
  }

  const reset = () => {
    setPriceFrom('')
    setPriceTo('')
    setSelectedSizes([])
    setSelectedColors([])
    setSort('new')
  }

  return (
    <div className="max-w-[600px] lg:max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[20px] lg:text-[28px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>Фільтр</h1>
        <button onClick={() => router.back()} className="w-8 h-8 flex items-center justify-center hover:opacity-60 transition">
          <svg width="22" height="22" viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
        </button>
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2">
          <Section title="Сортування" open>
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'new', label: 'Новинки' },
                { id: 'price_asc', label: 'Ціна: низька - висока' },
                { id: 'price_desc', label: 'Ціна: висока - низька' },
                { id: 'popular', label: 'Популярні' },
              ].map(o => (
                <button key={o.id} onClick={() => setSort(o.id)} className={`px-4 py-2.5 rounded-full text-[13px] font-medium transition ${sort === o.id ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-gray-50'}`}>{o.label}</button>
              ))}
            </div>
          </Section>

          <Section title="Ціна" open>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input value={priceFrom} onChange={e => setPriceFrom(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition" placeholder="Від" />
              </div>
              <span className="text-gray-400">—</span>
              <div className="flex-1">
                <input value={priceTo} onChange={e => setPriceTo(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition" placeholder="До" />
              </div>
            </div>
          </Section>

          <Section title="Розмір" open>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => (
                <button key={s} onClick={() => toggleSize(s)} className={`w-14 h-10 rounded-xl text-[13px] font-medium transition ${selectedSizes.includes(s) ? 'bg-[#111] text-white' : 'border border-black/15 hover:bg-gray-50'}`}>{s}</button>
              ))}
            </div>
          </Section>

          <Section title="Колір" open>
            <div className="grid grid-cols-4 gap-3">
              {colors.map(c => (
                <button key={c.hex} onClick={() => toggleColor(c.hex)} className={`flex items-center gap-2 p-2 rounded-xl transition ${selectedColors.includes(c.hex) ? 'bg-gray-100 ring-2 ring-black/20' : 'hover:bg-gray-50'}`}>
                  <span className={`w-6 h-6 rounded-full flex-shrink-0 ${c.hex === '#ffffff' ? 'border border-gray-300' : ''}`} style={{ backgroundColor: c.hex }} />
                  <span className="text-[12px]">{c.name}</span>
                </button>
              ))}
            </div>
          </Section>
        </div>

        <div className="lg:block">
          <div className="sticky top-24">
            <div className="mt-6 lg:mt-0 space-y-3">
              <button onClick={apply} className="w-full bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase hover:bg-black/80 transition">
                Застосувати
              </button>
              <button onClick={reset} className="w-full py-4 rounded-2xl border border-black/15 text-[14px] font-medium uppercase hover:bg-gray-50 transition">
                Скинути все
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
