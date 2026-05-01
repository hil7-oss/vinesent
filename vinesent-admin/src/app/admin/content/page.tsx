'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

const API_BASE = '/api/fastapi'

type Banner = {
  id: string; title: string; subtitle?: string; image: string; link: string;
  position?: string; active?: boolean; text?: string; bgColor?: string;
  textColor?: string; buttonText?: string; buttonLink?: string;
}
type PromoBannerTicker = {
  id: string; text: string; bgColor?: string; textColor?: string;
  buttonText?: string; buttonLink?: string; showTimer?: boolean;
  timerEndsAt?: string; showAnimation?: boolean; active?: boolean;
}
type Collection = {
  id: string; key: string; title: string; description?: string; productIds: string[];
}
type Category = {
  id: string; name: string; slug: string; image?: string; parentId?: string; order?: number;
}
type Product = { id: string; name: string; price: number; images?: string }

type TabItem = {
  id: 'hero' | 'promo_banner' | 'seasons' | 'categories' | 'collections' | 'extra' | 'ticker';
  label: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  { 
    id: 'hero', 
    label: 'Hero слайди', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect width={20} height={14} x={2} y={3} rx={2} ry={2}/><line x1={8} x2={16} y1={21} y2={21}/><line x1={12} x2={12} y1={17} y2={21}/>
      </svg>
    )
  },
  { 
    id: 'promo_banner', 
    label: 'Баннери сторінки', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.707-.484 2.179-1.208.471-.724 1.102-1.292 1.832-1.607a2.6 2.6 0 0 1 3.931 1.007c1.227-1.642 1.958-3.614 1.958-5.742 0-5.5-4.5-10-10-10Z"/>
        <circle cx={12} cy={12} r={3} fill="currentColor" fillOpacity={0.2}/>
      </svg>
    )
  },
  { 
    id: 'seasons', 
    label: 'Сезони', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8a7 7 0 0 1-10 10Z"/>
        <path d="M12 22V12"/>
      </svg>
    )
  },
  { 
    id: 'categories', 
    label: 'Категорії', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect width={7} height={7} x={3} y={3} rx={1}/><rect width={7} height={7} x={14} y={3} rx={1}/><rect width={7} height={7} x={14} y={14} rx={1}/><rect width={7} height={7} x={3} y={14} rx={1}/>
      </svg>
    )
  },
  { 
    id: 'collections', 
    label: 'Колекції', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
      </svg>
    )
  },
  { 
    id: 'extra', 
    label: 'Доп. колекції', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      </svg>
    )
  },
  { 
    id: 'ticker', 
    label: 'Промо-рядок', 
    icon: (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="m3 11 18-5v12L3 13v-2Z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
      </svg>
    )
  },
]
type TabId = TabItem['id']

function formatPrice(v: number) {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0 }).format(v).replace('UAH', 'грн')
}

function getProductImg(p: Product): string {
  const raw = p?.images
  if (!raw) return ''
  if (Array.isArray(raw)) return String(raw[0] || '')
  try { const arr = JSON.parse(raw as any); if (Array.isArray(arr)) return String(arr[0] || '') } catch {}
  return ''
}

function resolveImg(src: string | null | undefined) {
  if (!src) return ''
  if (src.startsWith('http')) return src
  if (src.startsWith('/uploads/')) return `${API_BASE}${src}`
  if (src.startsWith('uploads/')) return `${API_BASE}/${src}`
  return src
}

// ── Image Upload Widget ───────────────────────
function ImageUpload({ value, onChange, label }: { value: string; onChange: (url: string) => void; label?: string }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: form })
      if (res.ok) {
        const data = await res.json()
        onChange(data.url || data.path || '')
      }
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">{label}</label>}
      <div className="flex items-start gap-3">
        <div
          className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50 cursor-pointer hover:border-gray-400 transition relative flex-shrink-0"
          onClick={() => inputRef.current?.click()}
        >
          {value ? (
            <img src={resolveImg(value)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-gray-400">
              <svg className="w-6 h-6 mx-auto mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              <span className="text-[10px]">Фото</span>
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="URL фото або завантажте файл"
            className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[12px] font-mono"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mt-2 h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-[12px] font-medium transition disabled:opacity-50"
          >
            {uploading ? 'Завантаження...' : 'Завантажити файл...'}
          </button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
    </div>
  )
}

// ── Field ─────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}
function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px]"
    />
  )
}

// ── Tab: Hero slides ──────────────────────────
function HeroTab({ banners, onSave, saving, isPromo }: {
  banners: Banner[]; onSave: (slides: Banner[]) => void; saving: boolean; isPromo?: boolean
}) {
  const [slides, setSlides] = useState<Banner[]>(banners)
  useEffect(() => { setSlides(banners) }, [banners])

  const addSlide = () => setSlides(prev => [
    ...prev,
    { id: `banner-${Date.now()}`, title: 'TITLE', subtitle: '', image: '', link: '/menu', position: isPromo ? 'promo1' : 'hero', active: true }
  ])
  const remove = (idx: number) => setSlides(prev => prev.filter((_, i) => i !== idx))
  const update = (idx: number, key: keyof Banner, val: any) =>
    setSlides(prev => prev.map((s, i) => i === idx ? { ...s, [key]: val } : s))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-500">{isPromo ? 'Баннери для блоків на головній сторінці.' : 'Слайди героя на головній сторінці.'}</p>
        <button onClick={addSlide} className="h-9 px-4 rounded-xl bg-black text-white text-[13px] font-medium">+ Додати</button>
      </div>
      {slides.length === 0 && <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400">Пусто</div>}
      {slides.map((slide, idx) => (
        <div key={slide.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 bg-gray-50/50">
            <span className="text-[13px] font-bold text-gray-700">{slide.position} / {idx + 1}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-[12px]">
                <input type="checkbox" checked={!!slide.active} onChange={e => update(idx, 'active', e.target.checked)} className="accent-black" />
                Активний
              </label>
              <button onClick={() => remove(idx)} className="text-[12px] text-red-400 hover:text-red-600">Видалити</button>
            </div>
          </div>
          <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              <Field label="Заголовок"><Input value={slide.title} onChange={v => update(idx, 'title', v)} /></Field>
              <Field label="Підзаголовок"><Input value={slide.subtitle || ''} onChange={v => update(idx, 'subtitle', v)} /></Field>
              {isPromo && (
                <>
                  <Field label="Текст кнопки"><Input value={slide.buttonText || ''} onChange={v => update(idx, 'buttonText', v)} /></Field>
                  <div className="grid grid-cols-2 gap-3">
                     <Field label="Фон"><input type="color" value={slide.bgColor || '#000000'} onChange={e => update(idx, 'bgColor', e.target.value)} className="w-full h-10 p-1 pointer" /></Field>
                     <Field label="Текст"><input type="color" value={slide.textColor || '#ffffff'} onChange={e => update(idx, 'textColor', e.target.value)} className="w-full h-10 p-1 pointer" /></Field>
                  </div>
                </>
              )}
              <Field label="Посилання"><Input value={slide.link} onChange={v => update(idx, 'link', v)} /></Field>
            </div>
            <ImageUpload label="Фото" value={slide.image} onChange={v => update(idx, 'image', v)} />
          </div>
        </div>
      ))}
      {slides.length > 0 && (
        <button onClick={() => onSave(slides)} disabled={saving} className="h-11 px-6 rounded-xl bg-black text-white text-[14px] font-bold disabled:opacity-50">
          Зберегти зміни
        </button>
      )}
    </div>
  )
}

// ── Tab: Seasons ──────────────────────────────
function SeasonsTab({ categories, onUpdate, saving }: {
  categories: Category[]; onUpdate: (id: string, patch: Partial<Category>) => void; saving: boolean
}) {
  const seasonSlugs = ['winter', 'spring', 'summer', 'autumn', 'girl', 'boy']
  const items = seasonSlugs.map(s => categories.find(c => c.slug === s)).filter(Boolean) as Category[]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map(cat => (
        <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="text-[15px] font-bold mb-4 uppercase">{cat.name}</div>
          <ImageUpload
            label="Обкладинка"
            value={cat.image || ''}
            onChange={v => onUpdate(cat.id, { image: v })}
          />
        </div>
      ))}
    </div>
  )
}

// ── Tab: Categories ───────────────────────────
function CategoriesTab({ categories, onUpdate, saving }: {
  categories: Category[]; onUpdate: (id: string, patch: Partial<Category>) => void; saving: boolean
}) {
  const [search, setSearch] = useState('')
  const filtered = categories.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <p className="text-[13px] text-gray-500">Управління зображеннями для всіх категорій.</p>
        <div className="relative flex-1 max-w-xs">
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Пошук категорії..."
            className="w-full h-9 px-3 rounded-xl border border-gray-200 text-[13px] outline-none"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-start gap-4">
            <ImageUpload 
              value={c.image || ''} 
              onChange={url => onUpdate(c.id, { image: url })}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[14px] font-bold text-gray-900 truncate">{c.name}</div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Пріоритет:</span>
                  <input 
                    type="number" 
                    defaultValue={c.order || 0}
                    onBlur={e => onUpdate(c.id, { order: parseInt(e.target.value) || 0 })}
                    className="w-12 h-6 text-center border border-gray-200 rounded text-[11px]"
                  />
                </div>
              </div>
              <div className="text-[11px] font-mono text-gray-400 mt-0.5">slug: {c.slug}</div>
              <div className="mt-3">
                <button 
                  onClick={() => { const n = prompt('Нова назва:', c.name); if(n) onUpdate(c.id, { name: n }) }} 
                  className="text-[11px] text-blue-500 hover:underline"
                >
                  Змінити назву
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: Collections ──────────────────────────
function CollectionsTab({ content, products, onUpdate, saving }: {
  content: any; products: Product[]; onUpdate: (key: string, data: any) => void; saving: boolean
}) {
  const keys = ['NEW', 'SALE']
  return (
    <div className="space-y-8">
      {keys.map(key => {
        const col = content?.collections?.find((c: any) => c.key === key) || { key, productIds: [] }
        const ids: string[] = col.productIds || []
        return (
          <div key={key} className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="text-[18px] font-bold mb-4">{col.title || key}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-4">
              <div className="space-y-4">
                <Field label="Заголовок"><input defaultValue={col.title || key} onBlur={e => onUpdate(key, { title: e.target.value })} className="h-10 px-3 rounded-lg border border-gray-200 text-[13px] w-full" /></Field>
                <div className="text-[11px] text-gray-400">Цей блок відображається на головній сторінці, якщо він активний. Виберіть товари та додайте обкладинку.</div>
              </div>
              <ImageUpload
                label="Обкладинка блоку"
                value={col.image || ''}
                onChange={v => onUpdate(key, { image: v })}
              />
            </div>
            <div className="border border-gray-100 rounded-xl p-3 max-h-64 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-1.5">
              {products.map(p => (
                <label key={p.id} className="flex items-center gap-2.5 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
                  <input type="checkbox" checked={ids.includes(p.id)} onChange={e => {
                    const next = e.target.checked ? [...ids, p.id] : ids.filter(x => x !== p.id)
                    onUpdate(key, { productIds: next })
                  }} className="accent-black" />
                  {getProductImg(p) && <img src={resolveImg(getProductImg(p))} className="w-8 h-8 rounded object-cover" />}
                  <span className="text-[12px] truncate">{p.name}</span>
                </label>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Tab: Extra Collections ────────────────────
function ExtraCollectionsTab({ content, products, onCreate, onDelete, onUpdate, saving }: {
  content: any; products: Product[]; onCreate: (k: string, t: string) => void; onDelete: (k: string) => void; onUpdate: (k: string, d: any) => void; saving: boolean
}) {
  const extras = Object.entries(content || {}).filter(([k]) => k.startsWith('extra_'))
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => { const t = prompt('Назва:'); if(t) onCreate(`extra_${Date.now()}`, t) }} className="h-9 px-4 rounded-xl bg-black text-white text-[13px] font-bold">+ Створити</button>
      </div>
      {extras.map(([key, col]: [string, any]) => (
        <div key={key} className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <input value={col.title || ''} onChange={e => onUpdate(key, { title: e.target.value })} className="font-bold text-[16px] border-none p-0 focus:ring-0" />
            <button onClick={() => onDelete(key)} className="text-[12px] text-red-500">Видалити</button>
          </div>
          <div className="border border-gray-100 rounded-xl p-3 max-h-60 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-1.5">
            {products.map(p => (
              <label key={p.id} className="flex items-center gap-2.5 p-2 hover:bg-gray-50 rounded-xl cursor-pointer">
                <input type="checkbox" checked={col.productIds?.includes(p.id)} onChange={e => {
                  const next = e.target.checked ? [...(col.productIds || []), p.id] : (col.productIds || []).filter((x:any) => x !== p.id)
                  onUpdate(key, { productIds: next })
                }} className="accent-black" />
                <span className="text-[12px] truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Tab: Ticker ───────────────────────────────
function TickerItemCard({ banner, onSave, onDelete, saving }: {
  banner: PromoBannerTicker; onSave: (id: string, patch: any) => void; onDelete: (id: string) => void; saving: boolean
}) {
  const [draft, setDraft] = useState({ ...banner })
  useEffect(() => { setDraft({ ...banner }) }, [banner.id, banner.active, banner.showAnimation])
  const upd = (k: keyof PromoBannerTicker, v: any) => setDraft(p => ({ ...p, [k]: v }))

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!draft.active} onChange={e => upd('active', e.target.checked)} className="accent-black" /> Активний</label>
        <button onClick={() => onDelete(banner.id)} className="text-[12px] text-red-400">Видалити</button>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Field label="Текст"><textarea value={draft.text} onChange={e => upd('text', e.target.value)} className="w-full p-3 rounded-lg border border-gray-200 text-[13px] h-24 resize-none" /></Field>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
             <Field label="Фон"><input type="color" value={draft.bgColor || '#000000'} onChange={e => upd('bgColor', e.target.value)} className="w-full h-10 p-1" /></Field>
             <Field label="Текст"><input type="color" value={draft.textColor || '#ffffff'} onChange={e => upd('textColor', e.target.value)} className="w-full h-10 p-1" /></Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={!!draft.showAnimation} onChange={e => upd('showAnimation', e.target.checked)} className="accent-black" /> Анімація</label>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <button onClick={() => onSave(banner.id, draft)} className="h-9 px-6 rounded-xl bg-black text-white text-[13px] font-bold">Зберегти</button>
      </div>
    </div>
  )
}

function TickerTab({ promoBanners, onCreate, onUpdate, onDelete, saving }: {
  promoBanners: PromoBannerTicker[]; onCreate: () => void; onUpdate: (id: string, patch: any) => void; onDelete: (id: string) => void; saving: boolean
}) {
  return (
    <div className="space-y-5">
      <div className="flex justify-end"><button onClick={onCreate} className="h-9 px-4 rounded-xl bg-black text-white text-[13px] font-bold">+ Додати</button></div>
      {promoBanners.map(b => <TickerItemCard key={b.id} banner={b} onSave={onUpdate} onDelete={onDelete} saving={saving} />)}
    </div>
  )
}

// ── Main Page ─────────────────────────────────
export default function AdminContentPage() {
  const [activeTab, setActiveTab] = useState<TabId>('hero')
  const [content, setContent] = useState<any>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [promoBanners, setPromoBanners] = useState<PromoBannerTicker[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [c, p, b, ct] = await Promise.all([
        fetch(`${API_BASE}/api/v1/content`).then(r => r.json()),
        fetch(`${API_BASE}/api/v1/products`).then(r => r.json()),
        fetch(`${API_BASE}/api/v1/promo-banners`).then(r => r.json()),
        fetch(`${API_BASE}/api/v1/categories`).then(r => r.json()),
      ])
      setContent(c); setProducts(p); setPromoBanners(b); setCategories(ct)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updContent = async (p: any) => {
    setSaving(true)
    try {
      const next = content || {}
      const res = await fetch(`${API_BASE}/api/v1/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...next, ...p }) })
      if (res.ok) await fetchData()
    } finally { setSaving(false) }
  }

  const updCollection = async (key: string, data: any) => {
    setSaving(true)
    try {
      await fetch(`${API_BASE}/api/v1/content/collections/${key}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      await fetchData()
    } finally { setSaving(false) }
  }

  const updCategory = async (id: string, p: Partial<Category>) => {
    setSaving(true)
    try {
      await fetch(`${API_BASE}/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      await fetchData()
    } finally { setSaving(false) }
  }

  const delExtra = async (k: string) => {
    setSaving(true)
    const next = { ...content }
    delete next[k]
    try {
      await fetch(`${API_BASE}/api/v1/content`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
      await fetchData()
    } finally { setSaving(false) }
  }

  const tickerActions = {
    create: async () => {
      await fetch(`${API_BASE}/api/v1/promo-banners`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: 'Новий текст', active: true }) })
      await fetchData()
    },
    update: async (id: string, p: any) => {
      setSaving(true)
      await fetch(`${API_BASE}/api/v1/promo-banners/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
      await fetchData()
      setSaving(false)
    },
    delete: async (id: string) => {
      await fetch(`${API_BASE}/api/v1/promo-banners/${id}`, { method: 'DELETE' })
      await fetchData()
    }
  }

  if (loading) return <div className="p-10 text-center">Завантаження...</div>

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60 transition-all">
        <div className="flex items-center justify-between px-4 lg:px-10 h-14">
          <div className="flex items-center gap-4 overflow-x-auto no-scrollbar">
            <h1 className="text-[16px] font-bold text-gray-900 pr-4 border-r border-gray-200">Конструктор</h1>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={`h-8 px-3 rounded-lg text-[12px] font-bold whitespace-nowrap transition flex items-center gap-2 ${activeTab === t.id ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-100'}`}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
          {saving && <div className="text-[11px] text-gray-400 animate-pulse">Збереження...</div>}
        </div>
      </div>

      <div className="p-4 lg:p-10 max-w-6xl mx-auto pb-24">
        {activeTab === 'hero' && <HeroTab banners={(content?.banners || []).filter((b:any)=>b.position==='hero')} onSave={slides => updContent({ banners: [...(content?.banners || []).filter((b:any)=>b.position!=='hero'), ...slides] })} saving={saving} />}
        {activeTab === 'promo_banner' && <HeroTab banners={(content?.banners || []).filter((b:any)=>b.position?.startsWith('promo'))} onSave={slides => updContent({ banners: [...(content?.banners || []).filter((b:any)=>!b.position?.startsWith('promo')), ...slides] })} saving={saving} isPromo />}
        {activeTab === 'seasons' && <SeasonsTab categories={categories} onUpdate={updCategory} saving={saving} />}
        {activeTab === 'categories' && <CategoriesTab categories={categories} onUpdate={updCategory} saving={saving} />}
        {activeTab === 'collections' && <CollectionsTab content={content} products={products} onUpdate={updCollection} saving={saving} />}
        {activeTab === 'extra' && <ExtraCollectionsTab content={content} products={products} onCreate={(key, title) => updContent({ [key]: { title, productIds: [] } })} onDelete={delExtra} onUpdate={(key, d) => updContent({ [key]: { ...content[key], ...d } })} saving={saving} />}
        {activeTab === 'ticker' && <TickerTab promoBanners={promoBanners} onCreate={tickerActions.create} onUpdate={tickerActions.update} onDelete={tickerActions.delete} saving={saving} />}
      </div>
    </div>
  )
}
