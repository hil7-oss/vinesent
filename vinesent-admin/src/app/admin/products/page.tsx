'use client'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { fetchApi } from '@/lib/api'
import { ProductForm, Product, Category, SIZE_OPTIONS, COLOR_OPTIONS, Variant } from '@/components/admin/ProductForm'

export const dynamic = 'force-dynamic'

const API_BASE = '/api/fastapi'

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
function Field({ label, children, hint, error }: { label: string; children: React.ReactNode; hint?: string; error?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-400">{label}</label>
        {error && (
          <div className="flex items-center animate-pulse">
            <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>
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

  const isArchived = Boolean(product.isArchived) || (product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0)

  return (
    <tr className={`border-b border-gray-50 transition ${isArchived ? 'opacity-50 grayscale-[0.3]' : ''} ${isQuickEditing ? 'bg-amber-50/60' : selected ? 'bg-blue-50/50' : 'hover:bg-gray-50/40'}`}>
      <td className="pl-5 py-3 w-10">
        <input type="checkbox" checked={selected} onChange={() => onSelect(product.id)} className="w-4 h-4 rounded border-gray-300 accent-black" />
      </td>
      <td className="px-2 py-3">
        <div className="w-11 h-[52px] bg-gray-100 rounded-lg overflow-hidden relative group cursor-pointer" onClick={() => onEdit(product)}>
          {img ? (
            <img
              src={img}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // Avoid broken-image icon; keep gray background container
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full bg-gray-200" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="text-[13px] font-semibold text-gray-800">{product.name}</div>
          {isArchived && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gray-500 text-white rounded-full uppercase tracking-tighter shadow-sm">АРХІВ</span>}
        </div>
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

      <div className="pt-2 mt-2 border-t border-gray-100">

        <NavItem label="Архів" count={products.filter(p => !!p.isArchived || Number(p.stock) <= 0).length} active={selectedCategory === 'archive'} onClick={() => onSelect('archive')} />

      </div>

    </div>
  )
}

// ── BulkActions
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
      return fetch(`${API_BASE}/api/v1/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ salePrice: newSalePrice }) })
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
      return fetch(`${API_BASE}/api/v1/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categoryIds: newCats, categoryId: newCats[0] || null }) })
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
          <button onClick={async () => { if (confirm(`Видалити ${selectedIds.length} товарів?`)) { await Promise.all(selectedIds.map(id => fetch(`${API_BASE}/api/v1/products/${id}`, { method: 'DELETE' }))); onClear(); onSuccess() } }} className="text-[12px] text-red-400 hover:text-red-300 transition">Видалити</button>
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
      fetch(`${API_BASE}/api/v1/products?includeOutOfStock=true`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/categories`).then(r => r.ok ? r.json() : []),
      fetch(`${API_BASE}/api/v1/variants`).then(r => r.ok ? r.json() : []),
    ])
    setProducts(prodRes); setViewProducts(prodRes); setCategories(catRes)
    const map: Record<string, Variant[]> = {}
    if (Array.isArray(varRes)) varRes.forEach((v: Variant) => { if (v.productId) { if (!map[v.productId]) map[v.productId] = []; map[v.productId].push(v) } })
    setVariantsMap(map); setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (!selectedCategory) { setViewProducts(products); return }
    if (selectedCategory === 'archive') {
      setViewProducts(products.filter(p => !!p.isArchived || Number(p.stock) <= 0))
      return
    }
    const cat = categories.find(c => c.id === selectedCategory)
    const slug = (cat?.slug || '').toLowerCase()
    if (slug === 'new') {
      ;(async () => { const res = await fetch(`${API_BASE}/api/v1/products?new=true&includeOutOfStock=true`); setViewProducts(res.ok ? await res.json() : []) })()
    } else if (slug === 'sale') {
      ;(async () => {
        const res = await fetch(`${API_BASE}/api/v1/products?sale=true&includeOutOfStock=true`)
        const list = res.ok ? await res.json() : []
        setViewProducts((Array.isArray(list) ? list : []).filter((p: any) => (Number(p?.salePrice || 0) > 0) && (Number(p?.price || 0) <= 0 || Number(p.salePrice) < Number(p.price))))
      })()
    } else { setViewProducts(products) }
  }, [selectedCategory, categories, products])

  const filtered = useMemo(() => {
    const selectedSlug = selectedCategory ? String(categories.find(c => c.id === selectedCategory)?.slug || '').toLowerCase() : ''
    const isArchive = selectedCategory === 'archive'
    const isSpecial = isArchive || selectedSlug === 'new' || selectedSlug === 'sale'
    const relevantCategoryIds = new Set<string>()
    if (selectedCategory && !isSpecial) {
      relevantCategoryIds.add(selectedCategory)
      categories.forEach(c => { if (c.parentId === selectedCategory) relevantCategoryIds.add(c.id) })
    }
    return viewProducts.filter(p => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      if (isArchive) return true
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
    await fetch(`${API_BASE}/api/v1/products/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    fetchData()
  }
  const deleteProduct = async (id: string) => {
    if (!confirm('Видалити товар?')) return
    await fetch(`${API_BASE}/api/v1/products/${id}`, { method: 'DELETE' })
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

      <ProductForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} product={editingProduct} categories={categories} onSuccess={fetchData} allProducts={products} />
      <BulkActions selectedIds={selectedIds} products={products} onClear={() => setSelectedIds([])} onSuccess={fetchData} categories={categories} />

    </div>
  )
}
