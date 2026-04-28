'use client'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { fetchApi } from '@/lib/api'

type Product = {
  id: string; slug: string; name: string; price: number; salePrice?: number; cost?: number; stock: number;
  images?: string; categoryId?: string; categories?: Category[]; description?: string;
  seoTitle?: string; seoDescription?: string;
}
type Category = { id: string; name: string; slug: string; parentId?: string; productCount?: number }
type Variant = { id?: string; productId?: string; size: string; color: string; stock: number; cost?: number; sku?: string; barcode?: string }
type ColorOption = { name: string; hex: string }
type ProductImage = { id: string; url: string; file?: File }

const API_BASE = '/api/fastapi'
const SIZE_OPTIONS = ['104','110','116','122','128','134','140','146','152','158','164','170','176']
const COLOR_OPTIONS: ColorOption[] = [
  { name: 'Чорний', hex: '#000000' }, { name: 'Білий', hex: '#ffffff' },
  { name: 'Червоний', hex: '#AF0000' }, { name: 'Синій', hex: '#1e40af' },
  { name: 'Зелений', hex: '#006400' }, { name: 'Рожевий', hex: '#ec4899' },
  { name: 'Бежевий', hex: '#d4a574' }, { name: 'Фіолетовий', hex: '#5b21b6' },
]

const formatError = (err: any): string => {
  if (!err) return ''
  if (typeof err === 'string') return err
  if (Array.isArray(err)) return err.map(formatError).join(', ')
  if (typeof err === 'object') return formatError(err.detail || err.error || err.message || JSON.stringify(err))
  return String(err)
}

const uploadImages = async (files: File[]): Promise<string[]> => {
  const urls: string[] = []
  for (const file of files) {
    const fd = new FormData(); fd.append('file', file)
    const res = await fetchApi('/upload', { method: 'POST', body: fd })
    if (res.ok) { const data = await res.json(); urls.push(data.url || data.path || '') }
  }
  return urls.filter(Boolean)
}

// ── UI primitives ──────────────────────────────────────────
const inputCls = "w-full h-10 px-3 rounded-lg border border-gray-200 text-[13px] bg-white outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800/10 transition"
const textareaCls = "w-full px-3 py-2.5 rounded-lg border border-gray-200 text-[13px] bg-white outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800/10 transition resize-none"

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 mb-2.5">{children}</div>
}
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{label}</label>
      {children}
      {hint && <div className="text-[10px] text-gray-400 mt-1">{hint}</div>}
    </div>
  )
}
function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-100 rounded-xl p-4 space-y-3.5 ${className}`}>{children}</div>
}
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={`h-8 px-3 rounded-lg text-[12px] font-medium transition select-none ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
      {children}
    </button>
  )
}

// ── QuickEditRow ───────────────────────────────────────────
function QuickEditRow({ product, categoryName, onEdit, onUpdate, onDelete, variantsMap, selected, onSelect }: {
  product: Product; categoryName: string; onEdit: (p: Product) => void;
  onUpdate: (id: string, data: Partial<Product>) => Promise<void>;
  onDelete: (id: string) => void; variantsMap: Record<string, Variant[]>;
  selected: boolean; onSelect: (id: string) => void;
}) {
  const [isQuickEditing, setIsQuickEditing] = useState(false)
  const [price, setPrice] = useState(String(product.price))
  const [salePrice, setSalePrice] = useState(String(product.salePrice || ''))
  const [saving, setSaving] = useState(false)

  useEffect(() => { setPrice(String(product.price)); setSalePrice(String(product.salePrice || '')) }, [product])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(product.id, { price: parseFloat(price) || 0, salePrice: salePrice ? parseFloat(salePrice) : undefined })
    setIsQuickEditing(false); setSaving(false)
  }

  const img = getFirstImage(product.images)
  const hasSale = product.salePrice && product.salePrice > 0
  const variants = variantsMap[product.id] || []

  return (
    <tr className={`border-b border-gray-50 transition ${isQuickEditing ? 'bg-amber-50/60' : selected ? 'bg-blue-50/50' : 'hover:bg-gray-50/40'}`}>
      <td className="pl-5 py-3 w-10">
        <input type="checkbox" checked={selected} onChange={() => onSelect(product.id)} className="w-4 h-4 rounded border-gray-300 accent-black" />
      </td>
      <td className="px-2 py-3">
        <div className="w-11 h-[52px] bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer" onClick={() => onEdit(product)}>
          {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-[13px] font-semibold text-gray-800">{product.name}</div>
        <div className="text-[11px] text-gray-400 font-mono">{product.slug}</div>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-gray-500">
        {categoryName}
        {product.categories && product.categories.length > 1 && <span className="text-[10px] text-gray-400 ml-1">+{product.categories.length - 1}</span>}
      </td>
      <td className="px-4 py-3">
        {isQuickEditing ? (
          <div className="flex flex-col gap-1 w-24">
            <input value={price} onChange={e => setPrice(e.target.value)} className="w-full h-7 px-2 rounded-lg border border-gray-200 text-[12px] bg-white" placeholder="Ціна" />
            <input value={salePrice} onChange={e => setSalePrice(e.target.value)} className="w-full h-7 px-2 rounded-lg border border-gray-200 text-[12px] text-red-600 bg-white" placeholder="Знижка" />
            <div className="flex gap-1 mt-0.5">
              <button onClick={handleSave} disabled={saving} className="flex-1 h-6 bg-emerald-500 text-white rounded-md text-[10px] font-bold hover:bg-emerald-600 transition">✓</button>
              <button onClick={() => setIsQuickEditing(false)} className="flex-1 h-6 bg-gray-200 text-gray-600 rounded-md text-[10px] hover:bg-gray-300 transition">✕</button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsQuickEditing(true)}>
            <div>
              <div className={`text-[13px] font-bold ${hasSale ? 'text-red-600' : 'text-gray-900'}`}>{formatPrice(hasSale ? product.salePrice! : product.price)}</div>
              {hasSale && <div className="text-[10px] text-gray-400 line-through">{formatPrice(product.price)}</div>}
            </div>
            <svg className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </div>
        )}
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <span className={`text-[13px] font-semibold ${product.stock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{product.stock}</span>
        {variants.length > 0 && (
          <div className="text-[10px] text-gray-400 mt-0.5 max-w-[200px] leading-tight">
            {Object.entries(variants.reduce((acc, v) => { acc[v.color] = (acc[v.color] || 0) + (Number(v.stock) || 0); return acc }, {} as Record<string, number>))
              .map(([color, count]) => `${COLOR_OPTIONS.find(c => c.hex === color)?.name || color}: ${count}`).join(', ')}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button onClick={() => onDelete(product.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition ml-auto">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </td>
    </tr>
  )
}

// ── FilterSidebar ──────────────────────────────────────────
function FilterSidebar({ categories, selectedCategory, onSelect, products }: {
  categories: Category[]; selectedCategory: string; onSelect: (id: string) => void; products: Product[]
}) {
  const categoryCounts = useMemo(() => {
    const directProductSets: Record<string, Set<string>> = {}
    products.forEach(p => {
      const union = new Set<string>()
      ;(p.categories || []).forEach(c => union.add(c.id))
      if (p.categoryId) union.add(p.categoryId)
      Array.from(union).forEach(id => {
        if (!directProductSets[id]) directProductSets[id] = new Set<string>()
        directProductSets[id].add(p.id)
      })
    })
    const childMap: Record<string, string[]> = {}
    categories.forEach(c => { if (c.parentId) { if (!childMap[c.parentId]) childMap[c.parentId] = []; childMap[c.parentId].push(c.id) } })
    const totalCounts: Record<string, number> = {}
    categories.forEach(c => {
      const set = new Set<string>(directProductSets[c.id] ? Array.from(directProductSets[c.id]) : [])
      ;(childMap[c.id] || []).forEach(childId => {
        const childSet = directProductSets[childId]
        if (!childSet) return
        childSet.forEach(pid => set.add(pid))
      })
      totalCounts[c.id] = set.size
    })
    categories.forEach(c => {
      if ((c.slug || '').toLowerCase() === 'sale') totalCounts[c.id] = products.filter(p => (Number(p.salePrice || 0) > 0) && (Number(p.price || 0) <= 0 || Number(p.salePrice) < Number(p.price))).length
      if ((c.slug || '').toLowerCase() === 'new') totalCounts[c.id] = typeof c.productCount === 'number' ? c.productCount : (totalCounts[c.id] || 0)
    })
    return totalCounts
  }, [products, categories])

  const NavItem = ({ label, count, active, onClick, indent = false }: { label: string; count: number; active: boolean; onClick: () => void; indent?: boolean }) => (
    <button onClick={onClick} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition text-left ${active ? 'bg-white shadow-sm ring-1 ring-black/5 font-semibold text-gray-900' : 'text-gray-500 hover:bg-white/70 hover:text-gray-700'} ${indent ? 'pl-7' : ''}`}>
      <span className={`text-[12px] ${indent ? '' : 'uppercase tracking-wide font-medium'}`}>{label}</span>
      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'}`}>{count}</span>
    </button>
  )

  return (
    <div className="w-full lg:w-56 xl:w-60 flex-shrink-0 space-y-0.5">
      <NavItem label="Всі товари" count={products.length} active={!selectedCategory} onClick={() => onSelect('')} />
      {categories.filter(c => !c.parentId).map(parent => (
        <div key={parent.id}>
          <NavItem label={parent.name} count={categoryCounts[parent.id] || 0} active={selectedCategory === parent.id} onClick={() => onSelect(parent.id)} />
          {categories.filter(c => c.parentId === parent.id).map(child => (
            <NavItem key={child.id} label={child.name} count={categoryCounts[child.id] || 0} active={selectedCategory === child.id} onClick={() => onSelect(child.id)} indent />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── ProductForm ────────────────────────────────────────────
function ProductForm({ isOpen, onClose, product, categories, onSuccess }: {
  isOpen: boolean; onClose: () => void; product: Product | null; categories: Category[]; onSuccess: () => void
}) {
  const [form, setForm] = useState({ name:'', slug:'', price:'', salePrice:'', cost:'0', stock:'0', description:'', categoryId:'', categoryIds:[] as string[], seoTitle:'', seoDescription:'' })
  const [variants, setVariants] = useState<Variant[]>([])
  const [images, setImages] = useState<ProductImage[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])
  const [autoSlug, setAutoSlug] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'main' | 'seo'>('main')
  const [aiFile, setAiFile] = useState<File | null>(null)
  const [aiPreview, setAiPreview] = useState('')
  const [aiHex, setAiHex] = useState('#000000')
  const [aiRgb, setAiRgb] = useState<{ r: number; g: number; b: number } | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [aiGender, setAiGender] = useState<'male' | 'female' | 'unisex'>('male')
  const [aiGenerateOnSave, setAiGenerateOnSave] = useState(false)
  const [aiAutoText, setAiAutoText] = useState('')
  const [aiAutoLoading, setAiAutoLoading] = useState(false)
  const [aiAutoError, setAiAutoError] = useState('')
  const [measurementsText, setMeasurementsText] = useState('')
  const [measurementsLoading, setMeasurementsLoading] = useState(false)

  const categoryKey = useMemo(() => {
    const children = categories.filter(c => !!c.parentId && form.categoryIds.includes(c.id))
    const parents = categories.filter(c => !c.parentId && form.categoryIds.includes(c.id))
    return children[0]?.slug || parents[0]?.slug || ''
  }, [categories, form.categoryIds])

  const derivedGender = useMemo<'male' | 'female' | 'unisex'>(() => {
    const parent = categories.find(c => !c.parentId && form.categoryIds.includes(c.id))
    if (parent?.slug === 'girl') return 'female'
    if (parent?.slug === 'boy') return 'male'
    return 'unisex'
  }, [categories, form.categoryIds])

  useEffect(() => { setAiGender(derivedGender) }, [derivedGender])

  useEffect(() => {
    if (!isOpen) return
    if (product) {
      let imgs: string[] = []; try { imgs = JSON.parse(product.images || '[]') } catch {}
      const categoryIds = product.categories?.map(c => c.id) || (product.categoryId ? [product.categoryId] : [])
      setForm({ name: product.name, slug: product.slug, price: String(product.price), salePrice: String(product.salePrice || ''), cost: String(product.cost || 0), stock: String(product.stock || 0), description: product.description || '', categoryId: product.categoryId || '', categoryIds, seoTitle: product.seoTitle || '', seoDescription: product.seoDescription || '' })
      setImages(imgs.map(url => ({ id: Math.random().toString(36).slice(2), url })))
      setAutoSlug(false)
      fetch(`${API_BASE}/variants?productId=${product.id}`).then(r => r.ok ? r.json() : []).then(data => setVariants(Array.isArray(data) ? data : []))
      setMeasurementsLoading(true)
      fetch(`${API_BASE}/products/${product.id}/measurements`).then(r => r.ok ? r.json() : { measurements: {} }).then(d => {
        try { setMeasurementsText(JSON.stringify(d?.measurements || {}, null, 2)) } catch { setMeasurementsText('') }
        setMeasurementsLoading(false)
      }).catch(() => { setMeasurementsText(''); setMeasurementsLoading(false) })
    } else {
      setForm({ name:'', slug:'', price:'', salePrice:'', cost:'0', stock:'0', description:'', categoryId:'', categoryIds:[], seoTitle:'', seoDescription:'' })
      setImages([]); setVariants([]); setAutoSlug(true)
    }
    setAiFile(null); setAiPreview(''); setAiHex('#000000'); setAiRgb(null); setAiMessage('')
    setAiGenerateOnSave(false); setAiAutoText(''); setAiAutoLoading(false); setAiAutoError('')
    setError(''); setSelectedSizes([]); setSelectedColors([]); setActiveTab('main')
  }, [product, isOpen])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader()
      reader.onload = () => setImages(prev => [...prev, { id: Math.random().toString(36).slice(2), url: reader.result as string, file: f }])
      reader.readAsDataURL(f)
    })
  }

  const handleSubmit = async () => {
    setSaving(true); setError('')
    const existingUrls = images.filter(i => !i.file).map(i => i.url)
    const filesToUpload = images.filter(i => i.file).map(i => i.file!)
    if (filesToUpload.length > 0) { setUploading(true); existingUrls.push(...await uploadImages(filesToUpload)); setUploading(false) }
    const selectedCategoryId = form.categoryIds[0]
    const totalVariantStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
    const body: any = { name: form.name, price: parseFloat(form.price) || 0, salePrice: parseFloat(form.salePrice) || null, cost: parseFloat(form.cost) || 0, stock: variants.length ? totalVariantStock : (Number(form.stock) || 0), description: form.description, categoryId: selectedCategoryId, categoryIds: form.categoryIds, images: JSON.stringify(existingUrls), seoTitle: form.seoTitle, seoDescription: form.seoDescription }
    if (form.slug.trim()) body.slug = form.slug.trim()
    const url = product ? `${API_BASE}/products/${product.id}` : `${API_BASE}/products`
    const res = await fetch(url, { method: product ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const saved = await res.json()
      if (variants.length > 0) await fetch(`${API_BASE}/variants/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: saved.id, variants }) })
      const mtxt = (measurementsText || '').trim()
      if (mtxt) { try { const parsed = JSON.parse(mtxt); if (parsed && typeof parsed === 'object') await fetch(`${API_BASE}/products/${saved.id}/measurements`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) }) } catch {} }
      const shouldGenerate = Boolean(aiFile) || filesToUpload.length > 0
      if (shouldGenerate) {
        setAiGenerating(true); setAiMessage('Запуск генерації...')
        const fd = new FormData()
        if (aiFile) fd.append('file', aiFile)
        fd.append('category', categoryKey || 'clothing'); fd.append('colorHex', aiHex); fd.append('gender', aiGender); fd.append('productId', saved.id)
        try {
          const aiRes = await fetch(`${API_BASE}/admin/ai-photos/generate-multiple`, { method: 'POST', body: fd })
          if (aiRes.ok) { const data = await aiRes.json(); setAiGenerating(false); setAiMessage(data.jobId ? 'Генерація запущена у фоновому режимі' : 'Завершено'); onSuccess(); onClose() }
          else { const errText = await aiRes.text(); let detail = ''; try { detail = JSON.parse(errText)?.detail || '' } catch {}; setAiGenerating(false); setAiMessage(aiRes.status === 429 ? 'Ліміт AI вичерпано' : detail ? `Помилка: ${detail}` : 'Помилка AI') }
        } catch { setAiGenerating(false); setAiMessage('Помилка') }
      } else { onSuccess(); onClose() }
    } else { const err = await res.json().catch(() => null); setError(formatError(err)) }
    setSaving(false)
  }

  const handleAutoFill = async () => {
    const seed = (aiAutoText || '').trim()
    if (seed.length < 3) { setAiAutoError('Введіть опис товару для автозаповнення'); return }
    setAiAutoLoading(true); setAiAutoError('')
    try {
      const res = await fetch(`${API_BASE}/products/ai-autofill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: seed }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setAiAutoError(typeof data?.detail === 'string' ? data.detail : 'Помилка автозаповнення'); setAiAutoLoading(false); return }
      setForm(prev => ({ ...prev, name: data?.name || prev.name, description: data?.description || prev.description, seoTitle: data?.seoTitle || prev.seoTitle, seoDescription: data?.seoDescription || prev.seoDescription, price: String(typeof data?.price === 'number' ? data.price : prev.price), salePrice: String(typeof data?.salePrice === 'number' ? (data.salePrice || '') : prev.salePrice), stock: String(typeof data?.stock === 'number' ? data.stock : prev.stock), categoryId: data?.categoryId || prev.categoryId, categoryIds: data?.categoryId ? [data.categoryId] : prev.categoryIds }))
      if (data?.audience === 'female') setAiGender('female'); else if (data?.audience === 'male') setAiGender('male'); else setAiGender('unisex')
      const sizes = Array.isArray(data?.sizes) ? data.sizes.filter((s: any) => typeof s === 'string' && s) : []
      const colors = Array.isArray(data?.colors) ? data.colors.filter((c: any) => typeof c === 'string' && c) : []
      if (sizes.length) setSelectedSizes(sizes)
      if (colors.length) setSelectedColors(colors)
      const vars = Array.isArray(data?.variants) ? data.variants.filter((v: any) => v && (v.size || v.color)) : []
      if (vars.length) setVariants(vars.map((v: any) => ({ size: String(v.size || ''), color: String(v.color || ''), stock: Number(v.stock || 0), cost: parseFloat(form.cost) || 0 })))
    } catch (e: any) { setAiAutoError(e?.message || 'Помилка мережі') }
    finally { setAiAutoLoading(false) }
  }

  const toggleCategory = (id: string, checked: boolean) => {
    setForm(prev => {
      const has = prev.categoryIds.includes(id)
      if (checked && !has) return { ...prev, categoryIds: [...prev.categoryIds, id] }
      if (!checked && has) return { ...prev, categoryIds: prev.categoryIds.filter(x => x !== id) }
      return prev
    })
  }

  const toggleSize = (s: string) => setSelectedSizes(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
  const toggleColor = (c: string) => setSelectedColors(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])

  const addVariantRows = () => {
    if (!selectedSizes.length || !selectedColors.length) return
    setVariants(prev => {
      const next = [...prev]
      selectedSizes.forEach(size => selectedColors.forEach(color => {
        if (!next.some(v => v.size === size && v.color === color)) next.push({ size, color, stock: 0, cost: parseFloat(form.cost) || 0 })
      }))
      return next
    })
    setSelectedSizes([]); setSelectedColors([])
  }

  const updateVariant = (i: number, patch: Partial<Variant>) => setVariants(p => p.map((v, idx) => idx === i ? { ...v, ...patch } : v))
  const removeVariant = (i: number) => setVariants(p => p.filter((_, idx) => idx !== i))

  const handleAiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setAiFile(file)
    const reader = new FileReader(); reader.onload = () => setAiPreview(reader.result as string); reader.readAsDataURL(file)
  }

  useEffect(() => {
    if (!aiPreview || !canvasRef.current) return
    let mounted = true
    const img = new Image()
    img.onload = () => {
      if (!mounted) return
      const canvas = canvasRef.current!
      const scale = Math.min(1, 400 / img.width)
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = aiPreview
    return () => { mounted = false; img.onload = null }
  }, [aiPreview])

  const handleCanvasPick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d'); if (!ctx) return
    const rect = canvasRef.current!.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvasRef.current!.width / rect.width)
    const y = (e.clientY - rect.top) * (canvasRef.current!.height / rect.height)
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    setAiRgb({ r, g, b }); setAiHex(`#${[r,g,b].map(n => n.toString(16).padStart(2,'0')).join('')}`)
  }

  const parentCategories = useMemo(() => categories.filter(c => !c.parentId), [categories])
  const childByParent = useMemo(() => {
    const map: Record<string, Category[]> = {}
    categories.forEach(c => { if (c.parentId) { if (!map[c.parentId]) map[c.parentId] = []; map[c.parentId].push(c) } })
    return map
  }, [categories])

  if (!isOpen) return null

  const isBusy = saving || uploading || aiGenerating
  const btnLabel = uploading ? 'Завантаження…' : aiGenerating ? aiMessage || 'AI…' : saving ? 'Збереження…' : product ? 'Зберегти зміни' : 'Створити товар'

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="relative flex flex-col w-full max-w-[1260px] m-3 lg:m-5 bg-[#f5f5f3] rounded-2xl shadow-2xl overflow-hidden">

        {/* TOP BAR */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
          <div className="h-4 w-px bg-gray-200" />
          <h2 className="text-[14px] font-bold text-gray-900 truncate">{product ? product.name : 'Новий товар'}</h2>
          <div className="ml-auto flex items-center gap-1.5">
            {(['main','seo'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`h-7 px-3.5 rounded-lg text-[11px] font-semibold transition ${activeTab === tab ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                {tab === 'main' ? 'Основне' : 'SEO'}
              </button>
            ))}
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'main' && (
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px_300px] gap-3 p-4">

              {/* COL 1 */}
              <div className="space-y-3">
                <Panel>
                  <SectionLabel>✦ Автозаповнення через AI</SectionLabel>
                  {aiAutoError && <div className="text-[12px] text-red-500 bg-red-50 rounded-lg px-3 py-2">{aiAutoError}</div>}
                  <textarea value={aiAutoText} onChange={e => setAiAutoText(e.target.value)} rows={4} className={textareaCls} placeholder="Назва, категорія, кольори, розміри, ціна/знижка, залишок, ключові особливості..." />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={handleAutoFill} disabled={aiAutoLoading} className="h-9 px-4 rounded-lg bg-gray-900 text-white text-[12px] font-medium disabled:opacity-50 hover:bg-gray-800 transition whitespace-nowrap">
                      {aiAutoLoading ? 'Автозаповнення...' : 'Заповнити поля'}
                    </button>
                    <div className="text-[11px] text-gray-400 leading-tight">AI сформує назву, опис, SEO, категорію, ціни, розміри та кольори.</div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['оверсайз худі хлопчик синє','сукня святкова дівчинка молочна','куртка демісезон унісекс'].map(s => (
                      <button key={s} type="button" onClick={() => setAiAutoText(s)} className="h-7 px-2.5 rounded-lg bg-gray-100 text-[11px] text-gray-600 hover:bg-gray-200 transition">{s}</button>
                    ))}
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Назва та slug</SectionLabel>
                  <Field label="Назва товару">
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="Наприклад: Куртка зимова хлопчик" />
                  </Field>
                  <Field label="Slug" hint="Якщо порожньо — генерується автоматично">
                    <input value={form.slug} onChange={e => { setForm(p => ({ ...p, slug: e.target.value })); setAutoSlug(e.target.value.length === 0) }} className={inputCls} placeholder="auto-generated" />
                  </Field>
                </Panel>

                <Panel>
                  <SectionLabel>Ціноутворення</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ціна (грн)"><input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: e.target.value}))} className={inputCls} placeholder="0" /></Field>
                    <Field label="Ціна зі знижкою"><input type="number" value={form.salePrice} onChange={e => setForm(p => ({...p, salePrice: e.target.value}))} className={inputCls} placeholder="—" /></Field>
                    <Field label="Собівартість"><input type="number" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} className={inputCls} placeholder="0" /></Field>
                    <Field label="Залишок" hint={variants.length > 0 ? 'Розрахунок по варіантах' : undefined}>
                      <input type="number" value={form.stock} onChange={e => setForm(p => ({...p, stock: e.target.value}))} readOnly={variants.length > 0} className={inputCls + (variants.length > 0 ? ' bg-gray-50 text-gray-400 cursor-not-allowed' : '')} />
                    </Field>
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Опис</SectionLabel>
                  <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={5} className={textareaCls} placeholder="Опис товару…" />
                </Panel>
              </div>

              {/* COL 2 */}
              <div className="space-y-3">
                <Panel>
                  <SectionLabel>Фото товару</SectionLabel>
                  {images.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {images.map(img => (
                        <div key={img.id} className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 group">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <button onClick={() => setImages(p => p.filter(x => x.id !== img.id))}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition">×</button>
                        </div>
                      ))}
                      <label className="aspect-[3/4] border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                        <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" strokeLinecap="round"/></svg>
                        <span className="text-[10px] text-gray-400">Додати</span>
                        <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                      </label>
                    </div>
                  )}
                  {images.length === 0 && (
                    <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                      <svg className="w-7 h-7 text-gray-200 mb-1.5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      <span className="text-[11px] text-gray-400">Перетягніть або оберіть фото</span>
                      <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                    </label>
                  )}
                </Panel>

                <Panel>
                  <SectionLabel>✦ Nanobanana — генерація фото</SectionLabel>
                  <div className="space-y-3">
                    <Field label="Опорне фото (для генерації)">
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                        <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span className="text-[11px] text-gray-400">{aiFile ? aiFile.name : 'Обрати фото'}</span>
                        <input type="file" accept="image/*" onChange={handleAiFileSelect} className="hidden" />
                      </label>
                    </Field>
                    {aiPreview && (
                      <div>
                        <div className="text-[10px] text-gray-400 mb-1">Клікніть на фото, щоб обрати колір</div>
                        <canvas ref={canvasRef} onClick={handleCanvasPick} className="w-full rounded-xl border border-gray-200 cursor-crosshair" />
                      </div>
                    )}
                    <Field label="Гендер">
                      <div className="flex gap-2">
                        {(['female','male','unisex'] as const).map(g => (
                          <Pill key={g} active={aiGender === g} onClick={() => setAiGender(g)}>
                            {g === 'female' ? 'Вона' : g === 'male' ? 'Він' : 'Унісекс'}
                          </Pill>
                        ))}
                      </div>
                    </Field>
                    <Field label="Колір товару">
                      <div className="flex items-center gap-3">
                        <input type="color" value={aiHex} onChange={e => { setAiHex(e.target.value); const r=parseInt(e.target.value.slice(1,3),16), g=parseInt(e.target.value.slice(3,5),16), b=parseInt(e.target.value.slice(5,7),16); setAiRgb({r,g,b}) }} className="h-10 w-10 rounded-lg border border-gray-200 cursor-pointer" />
                        <div>
                          <div className="text-[12px] font-mono text-gray-700">{aiHex.toUpperCase()}</div>
                          {aiRgb && <div className="text-[10px] text-gray-400">R{aiRgb.r} G{aiRgb.g} B{aiRgb.b}</div>}
                        </div>
                      </div>
                    </Field>
                    {categoryKey && <div className="text-[11px] text-gray-400">Категорія: <span className="font-medium text-gray-600">{categoryKey}</span></div>}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={aiGenerateOnSave} onChange={e => setAiGenerateOnSave(e.target.checked)} className="accent-gray-900 w-3.5 h-3.5" />
                      <span className="text-[12px] text-gray-600">Генерувати після збереження</span>
                    </label>
                    {aiMessage && <div className="text-[12px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{aiMessage}</div>}
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Категорії</SectionLabel>
                  {form.categoryIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.categoryIds.map(id => {
                        const cat = categories.find(c => c.id === id); if (!cat) return null
                        return (
                          <span key={id} className="inline-flex items-center gap-1 h-6 px-2.5 rounded-full bg-gray-900 text-white text-[11px]">
                            {cat.name}
                            <button type="button" onClick={() => toggleCategory(id, false)} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                          </span>
                        )
                      })}
                    </div>
                  )}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {parentCategories.map(parent => (
                      <div key={parent.id} className="rounded-lg border border-gray-100 overflow-hidden">
                        <label className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                          <input type="checkbox" checked={form.categoryIds.includes(parent.id)} onChange={e => toggleCategory(parent.id, e.target.checked)} className="rounded border-gray-300 accent-gray-900 w-3.5 h-3.5" />
                          <span className="text-[12px] font-semibold text-gray-700">{parent.name}</span>
                        </label>
                        {(childByParent[parent.id] || []).length > 0 && (
                          <div className="px-3 py-1.5 flex flex-wrap gap-1.5">
                            {(childByParent[parent.id] || []).map(child => (
                              <button key={child.id} type="button" onClick={() => toggleCategory(child.id, !form.categoryIds.includes(child.id))}
                                className={`h-6 px-2 rounded-md text-[11px] border transition ${form.categoryIds.includes(child.id) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                {child.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              {/* COL 3 */}
              <div className="space-y-3">
                <Panel>
                  <SectionLabel>Розміри та кольори</SectionLabel>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Розмір</span>
                      <button type="button" onClick={() => setSelectedSizes(SIZE_OPTIONS)} className="text-[10px] text-blue-500 hover:underline">Всі</button>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {SIZE_OPTIONS.map(s => (
                        <button key={s} type="button" onClick={() => toggleSize(s)}
                          className={`h-8 rounded-lg text-[11px] font-medium transition ${selectedSizes.includes(s) ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Колір</span>
                      <button type="button" onClick={() => setSelectedColors(COLOR_OPTIONS.map(c => c.hex))} className="text-[10px] text-blue-500 hover:underline">Всі</button>
                    </div>
                    <div className="space-y-0.5">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c.hex} type="button" onClick={() => toggleColor(c.hex)}
                          className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg transition ${selectedColors.includes(c.hex) ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'}`}>
                          <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                          <span className="text-[12px] text-gray-700">{c.name}</span>
                          {selectedColors.includes(c.hex) && <span className="ml-auto text-[10px] text-gray-400">✓</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="button" onClick={addVariantRows} disabled={!selectedSizes.length || !selectedColors.length}
                    className="w-full h-9 rounded-lg bg-gray-900 text-white text-[12px] font-medium disabled:opacity-30 hover:bg-gray-800 transition">
                    Створити варіанти {selectedSizes.length > 0 && selectedColors.length > 0 ? `(${selectedSizes.length}x${selectedColors.length})` : ''}
                  </button>
                </Panel>

                {variants.length > 0 && (
                  <Panel>
                    <div className="flex items-center justify-between">
                      <SectionLabel>Варіанти ({variants.length})</SectionLabel>
                      <button type="button" onClick={() => setVariants(p => [...p, { size:'', color:'', stock:0, cost: parseFloat(form.cost)||0 }])} className="text-[10px] text-blue-500 hover:underline mb-2.5">+ вручну</button>
                    </div>
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-0.5">
                      {variants.map((v, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-gray-50 rounded-lg p-1.5">
                          <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: v.color || '#ccc' }} />
                          <select value={v.size} onChange={e => updateVariant(i, { size: e.target.value })} className="flex-1 h-7 px-1.5 rounded border border-gray-200 text-[11px] bg-white">
                            <option value="">—</option>{SIZE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <select value={v.color} onChange={e => updateVariant(i, { color: e.target.value })} className="flex-1 h-7 px-1.5 rounded border border-gray-200 text-[11px] bg-white">
                            <option value="">—</option>{COLOR_OPTIONS.map(c => <option key={c.hex} value={c.hex}>{c.name}</option>)}
                          </select>
                          <input type="number" value={v.stock} onChange={e => updateVariant(i, { stock: parseInt(e.target.value)||0 })} className="w-12 h-7 px-1.5 rounded border border-gray-200 text-[11px] text-center" />
                          <button onClick={() => removeVariant(i)} className="w-6 h-7 flex items-center justify-center text-gray-300 hover:text-red-400 transition text-[14px]">×</button>
                        </div>
                      ))}
                    </div>
                    <div className="text-[11px] text-gray-400 pt-1">
                      Загальний залишок: <span className="font-semibold text-gray-700">{variants.reduce((s,v) => s+(Number(v.stock)||0), 0)}</span>
                    </div>
                  </Panel>
                )}

                <Panel>
                  <SectionLabel>Швейні заміри</SectionLabel>
                  <div className="text-[11px] text-gray-400 mb-2">JSON: ключ — розмір, значення — об'єкт замірів</div>
                  <textarea value={measurementsText} onChange={e => setMeasurementsText(e.target.value)} rows={10} className={textareaCls} placeholder={'{\n  "134": {\n    "length_from_waist": "30 см"\n  }\n}'} />
                  {measurementsLoading && <div className="text-[11px] text-gray-400">Завантаження…</div>}
                </Panel>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="p-4 max-w-2xl mx-auto space-y-3">
              <Panel>
                <SectionLabel>SEO налаштування</SectionLabel>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] text-gray-500">Автозаповнення на основі назви</span>
                  <button type="button" onClick={() => setForm(p => ({ ...p, seoTitle: p.seoTitle || `${p.name} | VINESENT`, seoDescription: p.seoDescription || `Купити ${p.name} — якісний дитячий одяг від VINESENT.` }))} className="text-[11px] text-blue-500 hover:underline">Згенерувати</button>
                </div>
                <Field label="SEO Title">
                  <input value={form.seoTitle} onChange={e => setForm(p => ({...p, seoTitle: e.target.value}))} className={inputCls} />
                  <div className={`text-[10px] mt-1 ${form.seoTitle.length > 60 ? 'text-red-400' : 'text-gray-400'}`}>{form.seoTitle.length}/60</div>
                </Field>
                <Field label="SEO Description">
                  <textarea value={form.seoDescription} onChange={e => setForm(p => ({...p, seoDescription: e.target.value}))} rows={3} className={textareaCls} />
                  <div className={`text-[10px] mt-1 ${form.seoDescription.length > 160 ? 'text-red-400' : 'text-gray-400'}`}>{form.seoDescription.length}/160</div>
                </Field>
              </Panel>
              {(form.seoTitle || form.name) && (
                <Panel>
                  <SectionLabel>Попередній перегляд у Google</SectionLabel>
                  <div className="border border-gray-200 rounded-xl p-4 bg-white">
                    <div className="text-[12px] text-[#1a0dab] font-medium mb-0.5 truncate">{form.seoTitle || form.name}</div>
                    <div className="text-[11px] text-[#006621] mb-0.5">https://vinesent.com/products/{form.slug || 'slug'}</div>
                    <div className="text-[11px] text-gray-600 line-clamp-2">{form.seoDescription || 'Опис не вказано'}</div>
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>

        {/* BOTTOM BAR */}
        <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-t border-gray-100 flex-shrink-0">
          {error ? <div className="flex-1 text-[12px] text-red-500 bg-red-50 px-3 py-1.5 rounded-lg">{error}</div> : <div className="flex-1" />}
          <button onClick={onClose} className="h-9 px-5 rounded-xl border border-gray-200 text-[12px] font-medium hover:bg-gray-50 transition">Скасувати</button>
          <button onClick={handleSubmit} disabled={isBusy} className="h-9 px-5 rounded-xl bg-gray-900 text-white text-[12px] font-semibold disabled:opacity-50 hover:bg-gray-800 transition min-w-[150px] text-center">{btnLabel}</button>
        </div>
      </div>
    </div>
  )
}

// ── BulkActions ────────────────────────────────────────────
function BulkActions({ selectedIds, products, onClear, onSuccess, categories }: {
  selectedIds: string[]; products: Product[]; onClear: () => void; onSuccess: () => void; categories: Category[]
}) {
  const [mode, setMode] = useState<'discount' | 'category' | null>(null)
  const [value, setValue] = useState('')
  const [catIds, setCatIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const applyDiscount = async () => {
    setSaving(true)
    await Promise.all(selectedIds.map(id => {
      const product = products.find(p => p.id === id); if (!product) return
      let newSalePrice: number | null = null
      if (value.endsWith('%')) { const p = parseFloat(value); if (!isNaN(p)) newSalePrice = Math.round(product.price * (1 - p / 100)) }
      else { const v = parseFloat(value); if (!isNaN(v)) newSalePrice = v }
      return fetch(`${API_BASE}/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salePrice: newSalePrice }) })
    }))
    setSaving(false); setMode(null); onClear(); onSuccess()
  }

  const applyCategory = async (action: 'add' | 'remove' | 'set') => {
    setSaving(true)
    if (action === 'set' && !confirm(`Замінити категорії у ${selectedIds.length} товарів?`)) { setSaving(false); return }
    if (action === 'remove' && !confirm(`Прибрати категорії у ${selectedIds.length} товарів?`)) { setSaving(false); return }
    await Promise.all(selectedIds.map(id => {
      const product = products.find(p => p.id === id); if (!product) return
      let newCats = product.categories?.map(c => c.id) || (product.categoryId ? [product.categoryId] : [])
      if (action === 'set') newCats = catIds
      else if (action === 'add') newCats = [...new Set([...newCats, ...catIds])]
      else if (action === 'remove') newCats = newCats.filter(c => !catIds.includes(c))
      return fetch(`${API_BASE}/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryIds: newCats, categoryId: newCats[0] || null }) })
    }))
    setSaving(false); setMode(null); onClear(); onSuccess(); setCatIds([])
  }

  if (selectedIds.length === 0) return null

  return (
    <>
      <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 bg-gray-950 text-white px-5 py-2.5 rounded-2xl shadow-2xl flex items-center gap-4 z-40 whitespace-nowrap">
        <div className="text-[12px] font-semibold">{selectedIds.length} обрано</div>
        <div className="h-3.5 w-px bg-white/20" />
        <div className="flex items-center gap-3">
          <button onClick={() => setMode('discount')} className="text-[12px] hover:text-gray-300 transition">Знижка</button>
          <button onClick={() => setMode('category')} className="text-[12px] hover:text-gray-300 transition">Категорія</button>
          <button onClick={async () => { if (confirm(`Видалити ${selectedIds.length} товарів?`)) { await Promise.all(selectedIds.map(id => fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' }))); onClear(); onSuccess() } }} className="text-[12px] text-red-400 hover:text-red-300 transition">Видалити</button>
        </div>
        <button onClick={onClear} className="w-5 h-5 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 text-[10px] transition">✕</button>
      </div>

      {mode === 'discount' && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-[15px] font-bold mb-4">Масова знижка</h3>
            <input value={value} onChange={e => setValue(e.target.value)} placeholder="10% або 500 грн" className="w-full h-10 px-3 rounded-xl border border-gray-200 text-[13px] mb-4 outline-none focus:border-gray-800 bg-white" />
            <div className="flex gap-2">
              <button onClick={() => setMode(null)} className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-medium hover:bg-gray-50 transition">Скасувати</button>
              <button onClick={applyDiscount} disabled={saving} className="flex-1 h-10 rounded-xl bg-gray-950 text-white text-[13px] font-medium disabled:opacity-50 hover:bg-gray-800 transition">Застосувати</button>
            </div>
          </div>
        </div>
      )}

      {mode === 'category' && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center">
          <div className="bg-white rounded-2xl p-6 w-96 shadow-2xl max-h-[80vh] flex flex-col">
            <h3 className="text-[15px] font-bold mb-4">Змінити категорію</h3>
            <div className="flex-1 overflow-y-auto min-h-0 mb-4 border border-gray-100 rounded-xl p-2 space-y-0.5">
              {categories.map(c => (
                <label key={c.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input type="checkbox" checked={catIds.includes(c.id)} onChange={e => e.target.checked ? setCatIds(p => [...p, c.id]) : setCatIds(p => p.filter(id => id !== c.id))} className="rounded border-gray-300 accent-gray-900" />
                  <span className="text-[13px]">{c.name}</span>
                </label>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2">
              <button onClick={() => applyCategory('set')} disabled={saving} className="h-9 rounded-xl bg-gray-950 text-white text-[12px] font-medium disabled:opacity-50 hover:bg-gray-800 transition">Замінити</button>
              <button onClick={() => applyCategory('add')} disabled={saving} className="h-9 rounded-xl border border-gray-200 text-[12px] hover:bg-gray-50 transition">Додати</button>
              <button onClick={() => applyCategory('remove')} disabled={saving} className="h-9 rounded-xl border border-red-200 text-red-500 text-[12px] hover:bg-red-50 transition">Прибрати</button>
            </div>
            <button onClick={() => setMode(null)} className="w-full h-8 text-[12px] text-gray-400 hover:text-gray-600 transition">Скасувати</button>
          </div>
        </div>
      )}
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────
export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [viewProducts, setViewProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [variantsMap, setVariantsMap] = useState<Record<string, Variant[]>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const fetchData = useCallback(async () => {
    const [prodRes, catRes, varRes] = await Promise.all([
      fetch(`${API_BASE}/products`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/categories`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/variants`).then(r => r.ok ? r.json() : []),
    ])
    setProducts(prodRes); setViewProducts(prodRes); setCategories(catRes)
    const map: Record<string, Variant[]> = {}
    if (Array.isArray(varRes)) varRes.forEach((v: Variant) => { if (v.productId) { if (!map[v.productId]) map[v.productId] = []; map[v.productId].push(v) } })
    setVariantsMap(map); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!selectedCategory) { setViewProducts(products); return }
    const cat = categories.find(c => c.id === selectedCategory)
    const slug = (cat?.slug || '').toLowerCase()
    if (slug === 'new') {
      ;(async () => { const res = await fetch(`${API_BASE}/products?new=true`); setViewProducts(res.ok ? await res.json() : []) })()
    } else if (slug === 'sale') {
      ;(async () => {
        const res = await fetch(`${API_BASE}/products?sale=true`)
        const list = res.ok ? await res.json() : []
        setViewProducts((Array.isArray(list) ? list : []).filter((p: any) => (Number(p?.salePrice || 0) > 0) && (Number(p?.price || 0) <= 0 || Number(p.salePrice) < Number(p.price))))
      })()
    } else { setViewProducts(products) }
  }, [selectedCategory, categories, products])

  const filtered = useMemo(() => {
    const selectedSlug = selectedCategory ? String(categories.find(c => c.id === selectedCategory)?.slug || '').toLowerCase() : ''
    const isSpecial = selectedSlug === 'new' || selectedSlug === 'sale'
    const relevantCategoryIds = new Set<string>()
    if (selectedCategory && !isSpecial) {
      relevantCategoryIds.add(selectedCategory)
      categories.forEach(c => { if (c.parentId === selectedCategory) relevantCategoryIds.add(c.id) })
    }
    return viewProducts.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (selectedCategory && !isSpecial) {
        const union = new Set<string>()
        ;(p.categories || []).forEach(c => union.add(c.id))
        if (p.categoryId) union.add(p.categoryId)
        return Array.from(union).some(id => relevantCategoryIds.has(id))
      }
      return true
    })
  }, [viewProducts, search, selectedCategory, categories])

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const selectAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(p => p.id))
  const quickUpdate = async (id: string, data: Partial<Product>) => {
    await fetch(`${API_BASE}/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    fetchData()
  }
  const deleteProduct = async (id: string) => {
    if (!confirm('Видалити товар?')) return
    await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' })
    fetchData()
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3]">

      {/* top bar */}
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <h1 className="text-[16px] font-bold text-gray-900 lg:text-[18px]">Товари</h1>
          <div className="flex items-center gap-2">
            {!loading && (
              <span className="h-7 px-2.5 bg-white border border-gray-100 text-gray-400 text-[11px] font-medium rounded-lg flex items-center">
                {filtered.length} з {products.length}
              </span>
            )}
            <button onClick={() => { setEditingProduct(null); setIsFormOpen(true) }}
              className="h-9 px-4 bg-gray-950 text-white text-[12px] font-semibold rounded-xl hover:bg-gray-800 transition flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
              Додати
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 lg:p-6 pb-24 lg:pb-8">
        <div className="flex flex-col xl:flex-row gap-5">
          <FilterSidebar categories={categories} selectedCategory={selectedCategory} onSelect={setSelectedCategory} products={products} />

          <div className="flex-1 min-w-0 space-y-3">
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input value={search} onChange={e => setSearch(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-gray-200 text-[13px] outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800/10 transition bg-white" placeholder="Пошук товарів…" />
            </div>

            {loading && (
              <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="animate-pulse h-14 bg-white rounded-xl border border-gray-100" />)}</div>
            )}

            {!loading && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="pl-5 py-3 w-10">
                          <input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={selectAll} className="w-4 h-4 rounded border-gray-300 accent-black" />
                        </th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-2 py-3">Фото</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Назва</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3 hidden lg:table-cell">Категорія</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Ціна</th>
                        <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3 hidden lg:table-cell">Залишок</th>
                        <th className="text-right text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3">Дії</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => (
                        <QuickEditRow key={p.id} product={p} categoryName={categories.find(c => c.id === p.categoryId)?.name || '—'}
                          onEdit={(p) => { setEditingProduct(p); setIsFormOpen(true) }}
                          onUpdate={quickUpdate} onDelete={deleteProduct}
                          variantsMap={variantsMap} selected={selectedIds.includes(p.id)} onSelect={toggleSelect} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {filtered.length === 0 && <div className="py-14 text-center text-[13px] text-gray-400">Товарів не знайдено</div>}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} product={editingProduct} categories={categories} onSuccess={fetchData} />
      <BulkActions selectedIds={selectedIds} products={products} onClear={() => setSelectedIds([])} onSuccess={fetchData} categories={categories} />
    </div>
  )
}
