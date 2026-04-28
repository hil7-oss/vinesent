'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const API_BASE = '/api/fastapi'

type Stats = {
  products: number; categories: number; orders: number; revenue: number;
  inventoryCost: number; potentialRevenue: number; potentialProfit: number;
  todayCashRevenue: number; lowStockCount: number; noImageCount: number
}
type HeroSlide = { id: string; title: string; subtitle: string; image: string; link: string; active: boolean }
type AdminCollection = { id: string; key: string; title: string; description: string; productIds: string }

// ── small primitives ──────────────────────────
function StatCard({ label, value, accent = false, warn = false }: {
  label: string; value: string | number; accent?: boolean; warn?: boolean
}) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">{label}</div>
      <div className={`text-[22px] sm:text-[26px] font-black leading-none tabular-nums ${accent ? 'text-emerald-500' : warn ? 'text-red-500' : 'text-gray-900'}`}>
        {value}
      </div>
    </div>
  )
}

function Section({ title, action, children }: {
  title: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h3 className="text-[14px] font-bold text-gray-900">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function SlideEditor({ slide, idx, onUpdate, onRemove, onUpload }: {
  slide: HeroSlide; idx: number;
  onUpdate: (id: string, patch: Partial<HeroSlide>) => void;
  onRemove: (id: string) => void;
  onUpload: (id: string, file: File | null) => void;
}) {
  const [open, setOpen] = useState(idx === 0)
  const inp = "w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-gray-400 transition bg-white"

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition">
        <div className="flex items-center gap-3">
          {slide.image && <img src={slide.image} alt="" className="w-8 h-8 rounded-lg object-cover" />}
          <div className="text-left">
            <div className="text-[13px] font-semibold text-gray-800">{slide.title || `Слайд ${idx + 1}`}</div>
            <div className={`text-[11px] ${slide.active ? 'text-emerald-500' : 'text-gray-400'}`}>
              {slide.active ? 'Активний' : 'Вимкнено'}
            </div>
          </div>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2.5 border-t border-gray-50">
          <div className="flex gap-2 pt-3">
            <button onClick={() => onUpdate(slide.id, { active: !slide.active })}
              className={`h-8 px-3 rounded-lg text-[11px] font-medium flex-1 transition ${slide.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {slide.active ? 'Активний' : 'Вимкнено'}
            </button>
            <button onClick={() => onRemove(slide.id)}
              className="h-8 px-3 rounded-lg text-[11px] font-medium bg-red-50 text-red-500 flex-1">
              Видалити
            </button>
          </div>
          <input value={slide.title} onChange={e => onUpdate(slide.id, { title: e.target.value })} className={inp} placeholder="Заголовок" />
          <input value={slide.subtitle} onChange={e => onUpdate(slide.id, { subtitle: e.target.value })} className={inp} placeholder="Підзаголовок" />
          <input value={slide.link} onChange={e => onUpdate(slide.id, { link: e.target.value })} className={inp} placeholder="Посилання" />
          <div className="flex gap-2">
            <input value={slide.image} onChange={e => onUpdate(slide.id, { image: e.target.value })} className={inp + ' flex-1'} placeholder="URL зображення" />
          </div>
          <label className="flex items-center gap-2 h-10 px-3 rounded-xl border border-dashed border-gray-200 cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            <span className="text-[12px] text-gray-400">Завантажити фото</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => onUpload(slide.id, e.target.files?.[0] || null)} />
          </label>
        </div>
      )}
    </div>
  )
}

// ── main page ─────────────────────────────────
export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    products: 0, categories: 0, orders: 0, revenue: 0,
    inventoryCost: 0, potentialRevenue: 0, potentialProfit: 0,
    todayCashRevenue: 0, lowStockCount: 0, noImageCount: 0,
  })
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([])
  const [collections, setCollections] = useState<AdminCollection[]>([])
  const [newCollectionKey, setNewCollectionKey] = useState('')
  const [topCategories, setTopCategories] = useState<any[]>([])
  const [savingContent, setSavingContent] = useState(false)
  const [contentOpen, setContentOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(`${API_BASE}/products`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/categories`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/orders`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/content/home`).then(r => r.ok ? r.json() : null),
      fetch(`${API_BASE}/variants`).then(r => r.ok ? r.json() : []),
    ]).then(([products, categories, orders, content, variants]) => {
      const revenueStatuses = new Set(['PAID', 'CONFIRMED', 'SHIPPED', 'DELIVERED'])
      const revenue = orders
        .filter((o: any) => revenueStatuses.has(String(o.status || '').toUpperCase()))
        .reduce((s: number, o: any) => s + Number(o.total || 0), 0)
      const today = new Date().toISOString().split('T')[0]
      const todayCashRevenue = orders
        .filter((o: any) =>
          o.createdAt?.split('T')[0] === today &&
          String(o.paymentMethod || '').toUpperCase() === 'CASH' &&
          revenueStatuses.has(String(o.status || '').toUpperCase())
        )
        .reduce((s: number, o: any) => s + Number(o.total || 0), 0)

      let inventoryCost = 0, potentialRevenue = 0, lowStockCount = 0, noImageCount = 0
      const productVariantsMap: Record<string, any[]> = {}
      variants.forEach((v: any) => {
        if (!productVariantsMap[v.productId]) productVariantsMap[v.productId] = []
        productVariantsMap[v.productId].push(v)
      })
      products.forEach((p: any) => {
        try { const imgs = JSON.parse(p.images || '[]'); if (!imgs.length) noImageCount++ } catch { noImageCount++ }
        const pv = productVariantsMap[p.id] || []
        if (pv.length > 0) {
          const total = pv.reduce((s: number, v: any) => s + (Number(v.stock) || 0), 0)
          if (total <= 3) lowStockCount++
          pv.forEach((v: any) => {
            inventoryCost += (Number(v.stock) || 0) * (Number(v.cost) || Number(p.cost) || 0)
            potentialRevenue += (Number(v.stock) || 0) * (Number(p.price) || 0)
          })
        } else {
          if ((Number(p.stock) || 0) <= 3) lowStockCount++
          inventoryCost += (Number(p.stock) || 0) * (Number(p.cost) || 0)
          potentialRevenue += (Number(p.stock) || 0) * (Number(p.price) || 0)
        }
      })

      setStats({ products: products.length, categories: categories.length, orders: orders.length, revenue, inventoryCost, potentialRevenue, potentialProfit: potentialRevenue - inventoryCost, todayCashRevenue, lowStockCount, noImageCount })
      setTopCategories([...categories].sort((a: any, b: any) => Number(b.productCount || 0) - Number(a.productCount || 0)).slice(0, 6))

      const slides = (content?.banners || []).filter((b: any) => b.position === 'hero')
      setHeroSlides(slides.length
        ? slides.map((s: any) => ({ id: s.id || `${Date.now()}-${Math.random()}`, title: s.title || '', subtitle: s.subtitle || '', image: s.image || '', link: s.link || '', active: s.active !== false }))
        : [{ id: 'hero-default', title: '', subtitle: '', image: '', link: '', active: true }]
      )
      setCollections((content?.collections || []).map((c: any) => ({
        id: c.id || `${Date.now()}-${Math.random()}`,
        key: String(c.key || '').toUpperCase(),
        title: c.title || '',
        description: c.description || '',
        productIds: (c.productIds || []).join(', '),
      })))
    })
  }, [])

  const saveHeroSlides = async () => {
    setSavingContent(true)
    await fetch(`${API_BASE}/content/hero-slides`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(heroSlides.map(s => ({ ...s, position: 'hero' }))) })
    setSavingContent(false)
  }

  const updateSlide = (id: string, patch: Partial<HeroSlide>) =>
    setHeroSlides(p => p.map(s => s.id === id ? { ...s, ...patch } : s))
  const addSlide = () => {
    const id = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`
    setHeroSlides(p => [...p, { id, title: '', subtitle: '', image: '', link: '', active: true }])
  }
  const removeSlide = (id: string) => setHeroSlides(p => p.filter(s => s.id !== id))
  const uploadHeroImage = async (slideId: string, file: File | null) => {
    if (!file) return
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: fd })
    const data = await res.json().catch(() => null)
    if (res.ok && data?.url) updateSlide(slideId, { image: data.url })
  }

  const updateCollectionField = (id: string, patch: Partial<AdminCollection>) =>
    setCollections(p => p.map(c => c.id === id ? { ...c, ...patch } : c))
  const saveCollection = async (col: AdminCollection) => {
    setSavingContent(true)
    await fetch(`${API_BASE}/content/collections/${col.key}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: col.title, description: col.description, productIds: col.productIds.split(',').map(v => v.trim()).filter(Boolean) }) })
    setSavingContent(false)
  }
  const addCollection = async () => {
    const key = newCollectionKey.trim().toUpperCase(); if (!key) return
    setSavingContent(true)
    const res = await fetch(`${API_BASE}/content/collections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, title: key, description: '', productIds: [] }) })
    if (res.ok) { setCollections(p => [...p, { id: `${Date.now()}`, key, title: key, description: '', productIds: '' }]); setNewCollectionKey('') }
    setSavingContent(false)
  }
  const removeCollection = async (key: string) => {
    setSavingContent(true)
    await fetch(`${API_BASE}/content/collections/${key}`, { method: 'DELETE' })
    setCollections(p => p.filter(c => c.key !== key))
    setSavingContent(false)
  }

  const fmt = (n: number) => n.toLocaleString('uk-UA')

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      {/* Sticky header — mobile shows page title */}
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <h1 className="text-[16px] font-bold text-gray-900 lg:text-[18px]">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Link href="/admin/products" className="h-9 px-4 bg-gray-950 text-white text-[12px] font-medium rounded-xl hover:bg-gray-800 transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
              Товар
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 pb-24 lg:pb-8 space-y-5 max-w-5xl mx-auto">

        {/* ── Today highlight ── */}
        <div className="bg-gray-950 rounded-2xl p-5 text-white">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Сьогодні — готівка</div>
          <div className="text-[36px] sm:text-[44px] font-black leading-none tabular-nums text-[#ffd139]">
            {fmt(stats.todayCashRevenue)} <span className="text-[24px] font-bold text-white/50">₴</span>
          </div>
          <div className="mt-3 flex items-center gap-4 text-[12px] text-gray-400">
            <span>Замовлень: <span className="text-white font-semibold">{stats.orders}</span></span>
            <span>·</span>
            <span>Дохід: <span className="text-white font-semibold">{fmt(stats.revenue)} ₴</span></span>
          </div>
        </div>

        {/* ── Main stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Товари" value={stats.products} />
          <StatCard label="Категорії" value={stats.categories} />
          <StatCard label="Мало залишку" value={stats.lowStockCount} warn={stats.lowStockCount > 0} />
          <StatCard label="Без фото" value={stats.noImageCount} warn={stats.noImageCount > 0} />
        </div>

        {/* ── Inventory stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard label="Вартість складу" value={`${fmt(stats.inventoryCost)} ₴`} />
          <StatCard label="Потенційна виручка" value={`${fmt(stats.potentialRevenue)} ₴`} />
          <StatCard label="Потенційний прибуток" value={`${fmt(stats.potentialProfit)} ₴`} accent={stats.potentialProfit > 0} warn={stats.potentialProfit < 0} />
        </div>

        {/* ── Quick actions + Categories ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Section title="Швидкі дії">
            <div className="space-y-1">
              {[
                { href: '/admin/products', label: 'Додати товар', sub: 'Новий товар до каталогу', color: 'bg-blue-50 text-blue-600' },
                { href: '/admin/categories', label: 'Категорії', sub: 'Управління деревом', color: 'bg-purple-50 text-purple-600' },
                { href: '/admin/orders', label: 'Замовлення', sub: 'Перегляд і статуси', color: 'bg-emerald-50 text-emerald-600' },
                { href: '/admin/pos', label: 'POS / Сканер', sub: 'Продажі офлайн', color: 'bg-amber-50 text-amber-600' },
              ].map(({ href, label, sub, color }) => (
                <Link key={href} href={href}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-gray-800">{label}</div>
                    <div className="text-[11px] text-gray-400">{sub}</div>
                  </div>
                  <svg className="w-4 h-4 text-gray-300 ml-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
                </Link>
              ))}
            </div>
          </Section>

          <Section title="Топ категорії" action={
            <Link href="/admin/categories" className="text-[11px] text-blue-500 hover:underline font-medium">Керувати</Link>
          }>
            {topCategories.length === 0
              ? <div className="text-[12px] text-gray-400">Немає даних</div>
              : <div className="space-y-1.5">
                  {topCategories.map((cat: any) => (
                    <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-50">
                      <span className="text-[13px] font-medium text-gray-700">{cat.name}</span>
                      <span className="text-[12px] text-gray-400 tabular-nums">{Number(cat.productCount || 0)}</span>
                    </div>
                  ))}
                </div>
            }
          </Section>
        </div>

        {/* ── Content section (collapsible) ── */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button onClick={() => setContentOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition">
            <div className="text-[14px] font-bold text-gray-900">Контент сайту</div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400">{heroSlides.length} слайдів · {collections.length} колекцій</span>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${contentOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7"/></svg>
            </div>
          </button>

          {contentOpen && (
            <div className="border-t border-gray-50">
              <div className="grid lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-gray-50">

                {/* Hero slides */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[12px] font-bold uppercase tracking-widest text-gray-400">Головний банер</div>
                    <button onClick={addSlide} className="h-7 px-3 rounded-lg border border-gray-200 text-[11px] font-medium hover:bg-gray-50 transition">+ Слайд</button>
                  </div>
                  <div className="space-y-2">
                    {heroSlides.map((slide, idx) => (
                      <SlideEditor key={slide.id} slide={slide} idx={idx} onUpdate={updateSlide} onRemove={removeSlide} onUpload={uploadHeroImage} />
                    ))}
                  </div>
                  <button onClick={saveHeroSlides} disabled={savingContent}
                    className="w-full h-10 rounded-xl bg-gray-950 text-white text-[13px] font-medium disabled:opacity-50 hover:bg-gray-800 transition">
                    {savingContent ? 'Збереження...' : 'Зберегти банер'}
                  </button>
                </div>

                {/* Collections */}
                <div className="p-5 space-y-3">
                  <div className="text-[12px] font-bold uppercase tracking-widest text-gray-400 mb-1">Колекції</div>
                  <div className="flex gap-2">
                    <input value={newCollectionKey} onChange={e => setNewCollectionKey(e.target.value.toUpperCase())}
                      className="flex-1 h-9 px-3 rounded-xl border border-gray-200 text-[12px] outline-none focus:border-gray-400 transition"
                      placeholder="NEW, SALE, WINTER..." />
                    <button onClick={addCollection} disabled={savingContent}
                      className="h-9 px-4 rounded-xl border border-gray-200 text-[12px] font-medium hover:bg-gray-50 disabled:opacity-50 transition">
                      Додати
                    </button>
                  </div>
                  <div className="space-y-3">
                    {collections.map(col => (
                      <div key={col.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{col.key}</span>
                          <button onClick={() => removeCollection(col.key)} className="text-[11px] text-red-400 hover:text-red-600 transition">Видалити</button>
                        </div>
                        {(['title', 'description'] as const).map(f => (
                          <input key={f} value={col[f]} onChange={e => updateCollectionField(col.id, { [f]: e.target.value })}
                            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px] outline-none focus:border-gray-400 transition"
                            placeholder={f === 'title' ? 'Назва' : 'Опис'} />
                        ))}
                        <textarea value={col.productIds} onChange={e => updateCollectionField(col.id, { productIds: e.target.value })}
                          rows={2} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-[11px] outline-none focus:border-gray-400 transition resize-none font-mono"
                          placeholder="ID товарів через кому" />
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-gray-400">{col.productIds.split(',').map(v => v.trim()).filter(Boolean).length} товарів</span>
                          <button onClick={() => saveCollection(col)} disabled={savingContent}
                            className="h-7 px-3 rounded-lg bg-gray-950 text-white text-[11px] font-medium disabled:opacity-50 hover:bg-gray-800 transition">
                            {savingContent ? '...' : 'Зберегти'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
