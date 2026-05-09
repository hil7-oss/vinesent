'use client'
import Link from 'next/link'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { formatPrice, getFirstImage } from '@/lib/utils'
import { fetchApi } from '@/lib/api'

// ── Types ──────────────────────────────────────────────────
export type Product = {
  id: string; slug: string; name: string; price: number; salePrice?: number;
  cost?: number; stock: number; images?: string; categoryId?: string;
  categories?: Category[]; description?: string;
  seoTitle?: string; seoDescription?: string;
  isArchived?: boolean;
  gender?: string;
}
export type Category = { id: string; name: string; slug: string; parentId?: string; productCount?: number }
export type Variant = { id?: string; productId?: string; size: string; color: string; stock: number; price?: number | null; salePrice?: number | null; cost?: number; sku?: string; barcode?: string; images?: string | null }
export type ColorOption = { name: string; hex: string }
type ProductImage = { id: string; url: string; file?: File }

// ── Constants ──────────────────────────────────────────────
const API_BASE = '/api/fastapi'
export const SIZE_OPTIONS = (() => {
  const out: string[] = []
  for (let s = 92; s <= 190; s += 6) out.push(String(s))
  if (!out.includes('190')) out.push('190')
  return out
})()
export const COLOR_OPTIONS: ColorOption[] = [
  { name: 'Чорний', hex: '#000000' }, { name: 'Білий', hex: '#ffffff' },
  { name: 'Червоний', hex: '#AF0000' }, { name: 'Синій', hex: '#1e40af' },
  { name: 'Зелений', hex: '#006400' }, { name: 'Рожевий', hex: '#ec4899' },
  { name: 'Бежевий', hex: '#d4a574' }, { name: 'Фіолетовий', hex: '#5b21b6' },
]

// ── Helpers ────────────────────────────────────────────────
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
    <div className="mb-2.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[11px] font-semibold text-gray-600">{label}</span>
        {error && <svg className="w-3 h-3 text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z" /></svg>}
      </div>
      {children}
      {hint && <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>}
    </div>
  )
}
function Pill({ children, active, onClick }: { children: React.ReactNode; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`h-7 px-3 rounded-lg text-[11px] font-medium transition ${active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{children}</button>
}
function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl bg-white p-4 shadow-sm">{children}</div>
}

// ── ProductForm ────────────────────────────────────────────
export function ProductForm({ isOpen, onClose, product, categories, onSuccess, allProducts }: {
  isOpen: boolean; onClose: () => void; product: Product | null; categories: Category[]; onSuccess: () => void; allProducts: Product[]
}) {
  const [form, setForm] = useState({ name:'', slug:'', price:'', salePrice:'', cost:'0', stock:'0', description:'', categoryId:'', categoryIds:[] as string[], seoTitle:'', seoDescription:'', gender:'' })
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
  const [aiFileBack, setAiFileBack] = useState<File | null>(null)
  const [aiPreviewBack, setAiPreviewBack] = useState('')
  const [aiHex, setAiHex] = useState('#000000')
  const [aiRgb, setAiRgb] = useState<{ r: number; g: number; b: number } | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiMessage, setAiMessage] = useState('')
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [aiGender, setAiGender] = useState<'male' | 'female' | 'unisex'>('male')
  const [aiAccent, setAiAccent] = useState('auto')
  const [aiGenerateOnSave, setAiGenerateOnSave] = useState(false)
  const [aiAutoText, setAiAutoText] = useState('')
  const [aiAutoLoading, setAiAutoLoading] = useState(false)
  const [aiAutoError, setAiAutoError] = useState('')
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [measurementsText, setMeasurementsText] = useState('')
  const [measurementsLoading, setMeasurementsLoading] = useState(false)
  const [relatedIds, setRelatedIds] = useState<string[]>([])
  const [relatedCategoryIds, setRelatedCategoryIds] = useState<string[]>([])
  const [setProductIds, setSetProductIds] = useState<string[]>([])
  const [relatedQuery, setRelatedQuery] = useState('')
  const [validationErrors, setValidationErrors] = useState<string[]>([])

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

  const groupedVariants = useMemo(() => {
    const groups: Record<string, { color: string; items: { v: Variant; originalIndex: number }[] }> = {}
    variants.forEach((v, idx) => {
      const c = v.color || ''
      if (!groups[c]) groups[c] = { color: c, items: [] }
      groups[c].items.push({ v, originalIndex: idx })
    })
    return Object.values(groups).sort((a, b) => (a.color || 'zz').localeCompare(b.color || 'zz'))
  }, [variants])

  useEffect(() => { setAiGender(derivedGender) }, [derivedGender])

  useEffect(() => {
    if (!isOpen) return
    if (product) {
      let imgs: string[] = []
      try {
        const parsed = JSON.parse(product.images || '[]')
        if (Array.isArray(parsed)) {
          imgs = parsed.map((item: any) => {
            if (typeof item === 'string') return item
            if (item && typeof item === 'object' && item.url) return item.url
            return ''
          }).filter(Boolean)
        }
      } catch {}
      const categoryIds =
        (product.categories?.filter(c => !['sale', 'new'].includes(String(c.slug || '').toLowerCase())).map(c => c.id)) ||
        (product.categoryId ? [product.categoryId] : [])
      setForm({ name: product.name, slug: product.slug, price: String(product.price), salePrice: String(product.salePrice || ''), cost: String(product.cost || 0), stock: String(product.stock || 0), description: product.description || '', categoryId: product.categoryId || '', categoryIds, seoTitle: product.seoTitle || '', seoDescription: product.seoDescription || '', gender: product.gender || '' })
      setImages(imgs.map(url => ({ id: Math.random().toString(36).slice(2), url })))
      setAutoSlug(false)
      fetch(`/variants?productId=${product.id}`).then(r => r.ok ? r.json() : []).then(data => setVariants(Array.isArray(data) ? data : []))
      fetch(`/products/${product.id}/related`).then(r => r.ok ? r.json() : { relatedProductIds: [], setProductIds: [] }).then(d => {
        const ids = Array.isArray(d?.relatedProductIds) ? d.relatedProductIds.filter((x: any) => typeof x === 'string' && x) : []
        const setIds = Array.isArray(d?.setProductIds) ? d.setProductIds.filter((x: any) => typeof x === 'string' && x) : []
        setRelatedIds(ids)
        setSetProductIds(setIds)
      }).catch(() => { setRelatedIds([]); setSetProductIds([]) })
      setMeasurementsLoading(true)
      fetch(`/products/${product.id}/measurements`).then(r => r.ok ? r.json() : { measurements: {} }).then(d => {
        try { setMeasurementsText(JSON.stringify(d?.measurements || {}, null, 2)) } catch { setMeasurementsText('') }
        setMeasurementsLoading(false)
      }).catch(() => { setMeasurementsText(''); setMeasurementsLoading(false) })
    } else {
      setForm({ name:'', slug:'', price:'', salePrice:'', cost:'0', stock:'0', description:'', categoryId:'', categoryIds:[], seoTitle:'', seoDescription:'', gender:'' })
      setImages([]); setVariants([]); setAutoSlug(true)
      setRelatedIds([])
      setRelatedCategoryIds([])
      setSetProductIds([])
    }
    setAiFile(null); setAiPreview(''); setAiFileBack(null); setAiPreviewBack(''); setAiHex('#000000'); setAiRgb(null); setAiMessage('')
    setAiGenerateOnSave(false); setAiAutoText(''); setAiAutoLoading(false); setAiAutoError(''); setAiAccent('auto')
    try {
      const w = window as any
      setVoiceSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
    } catch {
      setVoiceSupported(false)
    }
    if (recognitionRef.current) {
      setListening(false)
      try { recognitionRef.current.abort() } catch {}
      recognitionRef.current = null
    }
    setError(''); setSelectedSizes([]); setSelectedColors([]); setActiveTab('main')
  }, [product, isOpen])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        setListening(false)
        try { recognitionRef.current.abort() } catch {}
        recognitionRef.current = null
      }
    }
  }, [])

  const toggleVoice = () => {
    try {
      const w = window as any
      const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition
      setAiAutoError('')
      const secureOk = Boolean((window as any).isSecureContext) || ['localhost', '127.0.0.1'].includes(window.location.hostname)
      if (!secureOk) { setAiAutoError('Голосовий ввід вимагає HTTPS'); return }
      if (!SpeechRecognition) { setAiAutoError('Браузер не підтримує Speech Recognition'); return }
      if (listening && recognitionRef.current) {
        setListening(false)
        try { recognitionRef.current.abort() } catch {}
        recognitionRef.current = null
        return
      }
      const rec = new SpeechRecognition()
      rec.lang = 'uk-UA'; rec.continuous = true; rec.interimResults = true; rec.maxAlternatives = 1
      rec.onstart = () => setListening(true)
      rec.onresult = (event: any) => {
        let finalTranscript = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript + ' '
        }
        if (finalTranscript.trim()) {
          const t = finalTranscript.trim()
          setAiAutoText((prev) => { const p = String(prev || ''); return p.trim() ? `${p.trim()} ${t}`.trim() : t })
        }
      }
      rec.onend = () => { if (listening && recognitionRef.current) { try { recognitionRef.current.start() } catch { setListening(false); recognitionRef.current = null } } else { setListening(false); recognitionRef.current = null } }
      rec.onerror = (e: any) => { const et = e?.error || 'unknown'; if (et === 'no-speech') return; if (et === 'aborted') { setListening(false); recognitionRef.current = null; return }; setAiAutoError(`Помилка: ${et}`); setListening(false); recognitionRef.current = null }
      recognitionRef.current = rec
      rec.start()
    } catch (err) { setAiAutoError(`Не вдалося запустити: ${err}`); setListening(false); recognitionRef.current = null }
  }

  const moveImage = (id: string, dir: -1 | 1) => {
    setImages((prev) => {
      const idx = prev.findIndex((x) => x.id === id)
      if (idx < 0) return prev
      const nextIdx = idx + dir
      if (nextIdx < 0 || nextIdx >= prev.length) return prev
      const next = [...prev]; const tmp = next[idx]; next[idx] = next[nextIdx]; next[nextIdx] = tmp
      return next
    })
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    Array.from(e.target.files).forEach(f => {
      const reader = new FileReader()
      reader.onload = () => setImages(prev => [...prev, { id: Math.random().toString(36).slice(2), url: reader.result as string, file: f }])
      reader.readAsDataURL(f)
    })
  }

  const handleAiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setAiFile(file)
    const reader = new FileReader(); reader.onload = () => setAiPreview(reader.result as string); reader.readAsDataURL(file)
  }

  const handleAiFileBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setAiFileBack(file)
    const reader = new FileReader(); reader.onload = () => setAiPreviewBack(reader.result as string); reader.readAsDataURL(file)
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

  const parentCategories = useMemo(
    () => categories.filter(c => !c.parentId && !['sale', 'new'].includes(String(c.slug || '').toLowerCase())).sort((a, b) => {
      const aSlug = String(a.slug || '').toLowerCase(); const bSlug = String(b.slug || '').toLowerCase()
      const p = ['boy', 'girl']; const ai = p.indexOf(aSlug); const bi = p.indexOf(bSlug)
      if (ai !== -1 && bi !== -1) return ai - bi; if (ai !== -1) return -1; if (bi !== -1) return 1
      return a.name.localeCompare(b.name)
    }),
    [categories],
  )
  const childByParent = useMemo(() => {
    const map: Record<string, Category[]> = {}
    categories.forEach(c => { if (!c.parentId) return; if (['sale', 'new'].includes(String(c.slug || '').toLowerCase())) return; if (!map[c.parentId]) map[c.parentId] = []; map[c.parentId].push(c) })
    return map
  }, [categories])

  const handleSubmit = async () => {
    const errors: string[] = []
    if (!form.name.trim()) errors.push('name')
    if (!form.price || parseFloat(form.price) <= 0) errors.push('price')
    if (!form.categoryId && !form.categoryIds.length) errors.push('category')
    const totalInventory = (variants.length > 0) ? variants.reduce((s,v) => s + (Number(v.stock) || 0), 0) : (Number(form.stock) || 0)
    if (totalInventory <= 0 && !product?.isArchived) errors.push('stock')
    if (errors.length > 0) { setValidationErrors(errors); setError('Будь ласка, заповніть обов\'язкові поля'); return }

    setSaving(true); setError('')
    const existingUrls = images.filter(i => !i.file).map(i => i.url)
    const filesToUpload = images.filter(i => i.file).map(i => i.file!)
    if (filesToUpload.length > 0) { setUploading(true); existingUrls.push(...(await uploadImages(filesToUpload))); setUploading(false) }
    const reservedCategoryIds = new Set(categories.filter(c => ['sale', 'new'].includes(String(c.slug || '').toLowerCase())).map(c => c.id))
    const cleanCategoryIds = (form.categoryIds || []).filter(id => id && !reservedCategoryIds.has(id))
    const selectedCategoryId = (!reservedCategoryIds.has(form.categoryId) && form.categoryId) ? form.categoryId : (cleanCategoryIds[0] || '')
    const overallStock = Math.max(0, Number(form.stock) || 0)
    let variantsToSend = variants
    let totalVariantStock = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0)
    if (variants.length > 0 && totalVariantStock <= 0 && overallStock > 0) {
      const base = Math.floor(overallStock / variants.length); let rem = overallStock - base * variants.length
      variantsToSend = variants.map(v => { const add = rem > 0 ? 1 : 0; if (rem > 0) rem -= 1; return { ...v, stock: base + add } })
      totalVariantStock = overallStock; setVariants(variantsToSend)
    }
    const body: any = { name: form.name, price: parseFloat(form.price) || 0, salePrice: parseFloat(form.salePrice) || null, cost: parseFloat(form.cost) || 0, stock: variants.length ? totalVariantStock : overallStock, description: form.description, categoryIds: cleanCategoryIds, images: JSON.stringify(existingUrls), seoTitle: form.seoTitle, seoDescription: form.seoDescription, gender: form.gender || undefined }
    if (selectedCategoryId) body.categoryId = selectedCategoryId
    if (form.slug.trim()) body.slug = form.slug.trim()
    const url = product ? `/products/${product.id}` : `/products`
    const res = await fetch(url, { method: product ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) {
      const saved = await res.json()
      if (variantsToSend.length > 0) await fetch(`/variants/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: saved.id, variants: variantsToSend }) })
      const mtxt = (measurementsText || '').trim()
      if (mtxt) { try { const parsed = JSON.parse(mtxt); if (parsed && typeof parsed === 'object') await fetch(`/products/${saved.id}/measurements`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed) }) } catch {} }
      await fetch(`/products/${saved.id}/related`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relatedProductIds: relatedIds, relatedCategoryIds, setProductIds }) }).catch(() => null as any)
      const shouldGenerate = Boolean(aiFile) || filesToUpload.length > 0
      if (shouldGenerate) {
        setAiGenerating(true); setAiMessage('Запуск генерації')
        const fd = new FormData()
        if (aiFile) fd.append('file', aiFile)
        if (aiFileBack) fd.append('fileBack', aiFileBack)
        fd.append('category', categoryKey || 'clothing'); fd.append('colorHex', aiHex); fd.append('gender', aiGender); fd.append('accent', aiAccent); fd.append('productId', saved.id)
        try {
          const aiRes = await fetch(`${API_BASE}/api/admin/ai-photos/generate-multiple`, { method: 'POST', body: fd })
          if (aiRes.ok) {
            const data = await aiRes.json()
            const m = data?.measurements
            if (m && typeof m === 'object') { try { setMeasurementsText(JSON.stringify(m, null, 2)); await fetch(`/products/${saved.id}/measurements`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(m) }).catch(() => null as any) } catch {} }
            setAiGenerating(false); setAiMessage(data.jobId ? `Генерація ${data.total || 6} фото запущена` : 'Завершено'); onSuccess(); onClose()
          } else { const errText = await aiRes.text(); let detail = ''; try { detail = JSON.parse(errText)?.detail || '' } catch {}; setAiGenerating(false); setAiMessage(aiRes.status === 429 ? 'Ліміт AI вичерпано' : detail ? `Помилка: ${detail}` : 'Помилка AI') }
        } catch { setAiGenerating(false); setAiMessage('Помилка') }
      } else { onSuccess(); onClose() }
    } else { const err = await res.json().catch(() => null); setError(formatError(err)) }
    setSaving(false)
  }

  const handleAutoFill = async () => {
    const seed = (aiAutoText || '').trim()
    if (seed.length < 3) { setAiAutoError('Введіть опис товару'); return }
    setAiAutoLoading(true); setAiAutoError('')
    try {
      const res = await fetch(`/products/ai-autofill`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: seed }) })
      const data = await res.json().catch(() => null)
      if (!res.ok) { setAiAutoError(typeof data?.detail === 'string' ? data.detail : 'Помилка автозаповнення'); setAiAutoLoading(false); return }
      setForm(prev => ({ ...prev, name: data?.name || prev.name, description: data?.description || prev.description, seoTitle: data?.seoTitle || prev.seoTitle, seoDescription: data?.seoDescription || prev.seoDescription, price: String(typeof data?.price === 'number' ? data.price : prev.price), salePrice: String(typeof data?.salePrice === 'number' ? (data.salePrice || '') : prev.salePrice), stock: String(typeof data?.stock === 'number' ? data.stock : prev.stock), categoryId: data?.categoryId || prev.categoryId, categoryIds: data?.categoryId ? [data.categoryId] : prev.categoryIds, gender: data?.audience || prev.gender }))
      if (data?.audience === 'female') setAiGender('female'); else if (data?.audience === 'male') setAiGender('male'); else setAiGender('unisex')
      const sizes = Array.isArray(data?.sizes) ? data.sizes.filter((s: any) => typeof s === 'string' && s) : []
      const colors = Array.isArray(data?.colors) ? data.colors.filter((c: any) => typeof c === 'string' && c) : []
      if (sizes.length) setSelectedSizes(sizes)
      if (colors.length) setSelectedColors(colors)
      const vars = Array.isArray(data?.variants) ? data.variants.filter((v: any) => v && (v.size || v.color)) : []
      if (vars.length) setVariants(vars.map((v: any) => ({ size: String(v.size || ''), color: String(v.color || ''), stock: Number(v.stock || 0), price: (v.price != null ? Number(v.price) : (parseFloat(form.price) || 0)), salePrice: (v.salePrice != null ? Number(v.salePrice) : (form.salePrice ? (parseFloat(form.salePrice) || null) : null)), cost: parseFloat(form.cost) || 0 })))
    } catch (e: any) { setAiAutoError(e?.message || 'Помилка мережі') }
    finally { setAiAutoLoading(false) }
  }

  const toggleCategory = (id: string, checked: boolean) => {
    setForm(prev => {
      const has = prev.categoryIds.includes(id)
      let nextIds = checked && !has ? [...prev.categoryIds, id] : !checked && has ? prev.categoryIds.filter(x => x !== id) : prev.categoryIds
      if (nextIds.length > 0) setValidationErrors(v => v.filter(x => x !== 'category'))
      return { ...prev, categoryIds: nextIds }
    })
  }

  const toggleSize = (s: string) => {
    setSelectedSizes(prev => {
      if (!prev.includes(s)) {
        setVariants(v => { const next = [...v]; (selectedColors.length > 0 ? selectedColors : ['']).forEach(color => { if (!next.some(x => x.size === s && x.color === color)) next.push({ size: s, color, stock: 0, price: parseFloat(form.price) || 0, salePrice: form.salePrice ? (parseFloat(form.salePrice) || null) : null, cost: parseFloat(form.cost) || 0 }) }); if (next.length > 0) setValidationErrors(e => e.filter(x => x !== 'stock')); return next })
        return [...prev, s]
      } else { setVariants(v => v.filter(x => x.size !== s)); return prev.filter(x => x !== s) }
    })
  }

  const toggleColor = (c: string) => {
    setSelectedColors(prev => {
      if (!prev.includes(c)) {
        setVariants(v => { const next = [...v]; (selectedSizes.length > 0 ? selectedSizes : ['']).forEach(size => { if (!next.some(x => x.size === size && x.color === c)) next.push({ size, color: c, stock: 0, price: parseFloat(form.price) || 0, salePrice: form.salePrice ? (parseFloat(form.salePrice) || null) : null, cost: parseFloat(form.cost) || 0 }) }); return next })
        return [...prev, c]
      } else { setVariants(v => v.filter(x => x.color !== c)); return prev.filter(x => x !== c) }
    })
  }

  const clearAllVariants = () => { if (confirm('Видалити всі варіанти?')) { setVariants([]); setSelectedColors([]); setSelectedSizes([]) } }
  const syncAllPrices = () => { setVariants(prev => prev.map(v => ({ ...v, price: parseFloat(form.price) || 0, salePrice: form.salePrice ? (parseFloat(form.salePrice) || null) : null }))) }
  const addVariantRows = () => {
    if (!selectedSizes.length || !selectedColors.length) return
    setVariants(prev => { const next = [...prev]; selectedSizes.forEach(size => selectedColors.forEach(color => { if (!next.some(v => v.size === size && v.color === color)) next.push({ size, color, stock: 0, price: parseFloat(form.price) || 0, salePrice: form.salePrice ? (parseFloat(form.salePrice) || null) : null, cost: parseFloat(form.cost) || 0 }) })); return next })
    setSelectedSizes([]); setSelectedColors([])
  }

  const updateVariant = (i: number, patch: Partial<Variant>) => setVariants(p => p.map((v, idx) => idx === i ? { ...v, ...patch } : v))
  const removeVariant = (i: number) => setVariants(p => p.filter((_, idx) => idx !== i))

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
                  <textarea value={aiAutoText} onChange={e => setAiAutoText(e.target.value)} rows={4} className={textareaCls} placeholder="Назва, категорія, кольори, розміри, ціна/знижка, залишок, ключові особливості" />
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleVoice} className={`h-9 w-9 rounded-lg border text-[12px] font-medium transition flex items-center justify-center ${listening ? 'bg-red-50 border-red-200 text-red-600' : voiceSupported ? 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50' : 'bg-gray-50 border-gray-200 text-gray-400'}`} aria-label="voice input">
                      {listening ? <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" /></svg> : <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z" /><path d="M19 11a7 7 0 0 1-14 0" strokeLinecap="round" /><path d="M12 18v3" strokeLinecap="round" /></svg>}
                    </button>
                    <button type="button" onClick={handleAutoFill} disabled={aiAutoLoading} className="h-9 px-4 rounded-lg bg-gray-900 text-white text-[12px] font-medium disabled:opacity-50 hover:bg-gray-800 transition whitespace-nowrap">
                      {aiAutoLoading ? 'Автозаповнення' : 'Заповнити поля'}
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
                  <Field label="Назва товару" error={validationErrors.includes('name')}>
                    <input value={form.name} onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setValidationErrors(p => p.filter(x => x !== 'name')) }} className={inputCls} placeholder="Наприклад: Куртка зимова хлопчик" />
                  </Field>
                  <Field label="Slug" hint="Якщо порожньо — генерується автоматично">
                    <input value={form.slug} onChange={e => { setForm(p => ({ ...p, slug: e.target.value })); setAutoSlug(e.target.value.length === 0) }} className={inputCls} placeholder="auto-generated" />
                  </Field>
                </Panel>

                <Panel>
                  <SectionLabel>Ціноутворення</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Ціна (грн)" error={validationErrors.includes('price')}><input type="number" value={form.price} onChange={e => { setForm(p => ({...p, price: e.target.value})); setValidationErrors(p => p.filter(x => x !== 'price')) }} className={inputCls} placeholder="0" /></Field>
                    <Field label="Ціна зі знижкою"><input type="number" value={form.salePrice} onChange={e => setForm(p => ({...p, salePrice: e.target.value}))} className={inputCls} placeholder="—" /></Field>
                  </div>
                  <Field label="Собівартість"><input type="number" value={form.cost} onChange={e => setForm(p => ({...p, cost: e.target.value}))} className={inputCls} placeholder="0" /></Field>
                </Panel>

                <Panel>
                  <SectionLabel>Опис</SectionLabel>
                  <textarea value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} rows={5} className={textareaCls} placeholder="Детальний опис товару" />
                </Panel>

                <Panel>
                  <SectionLabel>Фото товару</SectionLabel>
                  <div className="grid grid-cols-4 gap-2">
                    {images.map((img, idx) => (
                      <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                          <button type="button" onClick={() => moveImage(img.id, -1)} disabled={idx === 0} className="w-6 h-6 rounded-full bg-white/90 text-gray-700 flex items-center justify-center disabled:opacity-30 hover:bg-white transition">←</button>
                          <button type="button" onClick={() => setImages(prev => prev.filter(i => i.id !== img.id))} className="w-6 h-6 rounded-full bg-white/90 text-red-600 flex items-center justify-center hover:bg-white transition">×</button>
                          <button type="button" onClick={() => moveImage(img.id, 1)} disabled={idx === images.length - 1} className="w-6 h-6 rounded-full bg-white/90 text-gray-700 flex items-center justify-center disabled:opacity-30 hover:bg-white transition">→</button>
                        </div>
                        {idx === 0 && <div className="absolute top-1 left-1 text-[9px] font-bold uppercase bg-gray-900/80 text-white px-1.5 py-0.5 rounded">Головне</div>}
                      </div>
                    ))}
                    {images.length < 8 && (
                      <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                        <svg className="w-6 h-6 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span className="text-[10px] text-gray-400">Додати</span>
                        <input type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
                      </label>
                    )}
                  </div>
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
                    <Field label="Опорне фото спереду (основне)">
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                        <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span className="text-[11px] text-gray-400">{aiFile ? aiFile.name : 'Обрати фото спереду'}</span>
                        <input type="file" accept="image/*" onChange={handleAiFileSelect} className="hidden" />
                      </label>
                    </Field>

                    <Field label="Опорне фото ззаду (опціонально)" hint="Для товарів з дизайном на спині">
                      <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition">
                        <svg className="w-5 h-5 text-gray-300 mb-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                        <span className="text-[11px] text-gray-400">{aiFileBack ? aiFileBack.name : 'Обрати фото ззаду'}</span>
                        <input type="file" accept="image/*" onChange={handleAiFileBackSelect} className="hidden" />
                      </label>
                    </Field>

                    {aiPreview && (
                      <div>
                        <div className="text-[10px] text-gray-400 mb-1">Клікніть на фото, щоб обрати колір</div>
                        <canvas ref={canvasRef} onClick={handleCanvasPick} className="w-full rounded-xl border border-gray-200 cursor-crosshair" />
                      </div>
                    )}

                    {aiPreviewBack && (
                      <div>
                        <div className="text-[10px] text-gray-400 mb-1">Фото ззаду (preview)</div>
                        <img src={aiPreviewBack} alt="Back preview" className="w-full rounded-xl border border-gray-200" />
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
                    <Field label="Акцент фото" hint="Що фокусувати при генерації">
                      <div className="grid grid-cols-2 gap-1.5">
                        {[
                          { value: 'auto', label: 'Авто', desc: 'За категорією' },
                          { value: 'top', label: 'Верх', desc: 'Футболки, куртки' },
                          { value: 'bottom', label: 'Низ', desc: 'Штани, джинси' },
                          { value: 'accessory', label: 'Аксесуар', desc: 'Шапки, сумки' },
                          { value: 'set', label: 'Сет', desc: 'Повний образ' },
                        ].map(t => (
                          <button key={t.value} type="button" onClick={() => setAiAccent(t.value)}
                            className={`flex flex-col items-start h-auto px-3 py-2 rounded-xl text-[11px] font-medium transition ${aiAccent === t.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                            <span>{t.label}</span>
                            <span className={`text-[9px] ${aiAccent === t.value ? 'text-gray-300' : 'text-gray-400'}`}>{t.desc}</span>
                          </button>
                        ))}
                      </div>
                    </Field>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={aiGenerateOnSave} onChange={e => setAiGenerateOnSave(e.target.checked)} className="accent-gray-900 w-3.5 h-3.5" />
                      <span className="text-[12px] text-gray-600">Генерувати після збереження</span>
                    </label>
                    {aiMessage && <div className="text-[12px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">{aiMessage}</div>}
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Категорії</SectionLabel>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Обрані категорії</span>
                    {validationErrors.includes('category') && (
                      <div className="flex items-center animate-pulse">
                        <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L1 21h22L12 2zm1 14h-2v-2h2v2zm0-4h-2V8h2v4z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
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
                    <div className="space-y-0.5 mb-2">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c.hex} type="button" onClick={() => toggleColor(c.hex)}
                          className={`w-full flex items-center gap-2.5 px-2.5 h-8 rounded-lg transition ${selectedColors.includes(c.hex) ? 'bg-gray-100 ring-1 ring-gray-300' : 'hover:bg-gray-50'}`}>
                          <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ backgroundColor: c.hex }} />
                          <span className="text-[12px] text-gray-700">{c.name}</span>
                          {selectedColors.includes(c.hex) && <span className="ml-auto text-[10px] text-gray-400">✓</span>}
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-gray-100 pt-2">
                      <div className="text-[10px] text-gray-400 mb-1.5">Власний колір</div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={aiHex} onChange={e => { const hex = e.target.value; setAiHex(hex); const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); setAiRgb({r,g,b}) }} className="h-8 w-12 rounded border border-gray-200 cursor-pointer" />
                        <input type="text" value={aiHex} onChange={e => { const hex = e.target.value; if (/^#[0-9A-Fa-f]{6}$/.test(hex)) { setAiHex(hex); const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16); setAiRgb({r,g,b}) } }} className="flex-1 h-8 px-2 rounded border border-gray-200 text-[11px] font-mono uppercase" placeholder="#000000" />
                        <button type="button" onClick={() => { if (!selectedColors.includes(aiHex)) { toggleColor(aiHex) } }} className="h-8 px-3 rounded border border-gray-200 text-[11px] hover:bg-gray-50 transition whitespace-nowrap">Додати</button>
                      </div>
                    </div>
                  </div>
                  <button type="button" onClick={addVariantRows} disabled={!selectedSizes.length || !selectedColors.length}
                    className="w-full h-9 rounded-lg bg-gray-900 text-white text-[12px] font-medium disabled:opacity-30 hover:bg-gray-800 transition">
                    Створити варіанти {selectedSizes.length > 0 && selectedColors.length > 0 ? `(${selectedSizes.length}x${selectedColors.length})` : ''}
                  </button>
                </Panel>

                {variants.length > 0 && (
                  <Panel>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">Варіанти</span>
                        <span className="ml-2 text-[10px] text-gray-400">({variants.length})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={syncAllPrices} className="text-[10px] text-blue-500 hover:underline">Синх. ціни</button>
                        <button type="button" onClick={clearAllVariants} className="text-[10px] text-red-400 hover:text-red-500">Очистити</button>
                      </div>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {groupedVariants.map(group => (
                        <div key={group.color || 'nocolor'} className="space-y-1">
                          {group.color && <div className="text-[10px] font-semibold text-gray-500 uppercase">{group.color}</div>}
                          {group.items.map(({ v, originalIndex }) => (
                            <div key={originalIndex} className="flex items-center gap-1.5">
                              <input type="text" value={v.size} onChange={e => updateVariant(originalIndex, { size: e.target.value })} className="w-14 h-7 px-2 rounded border border-gray-200 text-[11px] text-center bg-white" />
                              <input type="text" value={v.color || ''} onChange={e => updateVariant(originalIndex, { color: e.target.value })} className="w-16 h-7 px-2 rounded border border-gray-200 text-[11px] bg-white" />
                              <input type="number" value={v.stock} onChange={e => updateVariant(originalIndex, { stock: Number(e.target.value) })} className="w-14 h-7 px-2 rounded border border-gray-200 text-[11px] text-center bg-white" />
                              <input type="number" value={v.price ?? ''} onChange={e => updateVariant(originalIndex, { price: e.target.value ? Number(e.target.value) : null })} className="w-16 h-7 px-2 rounded border border-gray-200 text-[11px] text-center bg-white" />
                              <input type="number" value={v.salePrice ?? ''} onChange={e => updateVariant(originalIndex, { salePrice: e.target.value ? Number(e.target.value) : null })} className="w-16 h-7 px-2 rounded border border-gray-200 text-[11px] text-center bg-white" />
                              <button type="button" onClick={() => removeVariant(originalIndex)} className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 text-[10px]">×</button>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </Panel>
                )}

                <Panel>
                  <SectionLabel>Залишок</SectionLabel>
                  {variants.length > 0 ? (
                    <div className="text-[11px] text-gray-500">Управління через варіанти вище</div>
                  ) : (
                    <input type="number" value={form.stock} onChange={e => { setForm(p => ({...p, stock: e.target.value})); setValidationErrors(p => p.filter(x => x !== 'stock')) }} className={inputCls} placeholder="0" />
                  )}
                </Panel>
              </div>

              {/* COL 2 - between 1 and 3 */}
              <div className="space-y-3">
                <Panel>
                  <SectionLabel>Супутні товари</SectionLabel>
                  <div className="text-[11px] text-gray-400 mb-2">Товари, які можна купити разом</div>
                  <input type="text" value={relatedQuery} onChange={e => setRelatedQuery(e.target.value)} placeholder="Пошук" className={`${inputCls} mb-2`} />
                  <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
                    {(allProducts || [])
                      .filter(p => !product || p.id !== product.id)
                      .filter(p => { const q = relatedQuery.trim().toLowerCase(); if (!q) return true; return String(p.name || '').toLowerCase().includes(q) || String(p.slug || '').toLowerCase().includes(q) })
                      .slice(0, 80)
                      .map(p => {
                        const checked = relatedIds.includes(p.id)
                        const img = getFirstImage(p.images || '')
                        return (
                          <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={e => setRelatedIds(prev => e.target.checked ? Array.from(new Set([...prev, p.id])) : prev.filter(x => x !== p.id))} className="w-4 h-4 rounded border-gray-300 accent-gray-900" />
                            <div className="w-9 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12px] font-medium text-gray-800 truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono truncate">{p.slug}</div>
                            </div>
                          </label>
                        )
                      })}
                    {(allProducts || []).length === 0 && (
                      <div className="px-3 py-6 text-center text-[12px] text-gray-400">Немає списку товарів</div>
                    )}
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Сети товарів</SectionLabel>
                  <div className="text-[11px] text-gray-400 mb-2">Виберіть товари, які входять в один сет з цим товаром</div>
                  <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
                    {(allProducts || [])
                      .filter(p => !product || p.id !== product.id)
                      .slice(0, 80)
                      .map(p => {
                        const checked = setProductIds.includes(p.id)
                        const img = getFirstImage(p.images || '')
                        return (
                          <label key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                            <input type="checkbox" checked={checked} onChange={e => setSetProductIds(prev => e.target.checked ? Array.from(new Set([...prev, p.id])) : prev.filter(x => x !== p.id))} className="w-4 h-4 rounded border-gray-300 accent-gray-900" />
                            <div className="w-9 h-11 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                              {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-200" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[12px] font-medium text-gray-800 truncate">{p.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono truncate">{p.slug}</div>
                            </div>
                          </label>
                        )
                      })}
                    {(allProducts || []).length === 0 && (
                      <div className="px-3 py-6 text-center text-[12px] text-gray-400">Немає списку товарів</div>
                    )}
                  </div>
                </Panel>

                <Panel>
                  <SectionLabel>Заміри</SectionLabel>
                  {measurementsLoading ? (
                    <div className="text-[11px] text-gray-400">Завантаження</div>
                  ) : (
                    <textarea value={measurementsText} onChange={e => setMeasurementsText(e.target.value)} rows={6} className={textareaCls} placeholder='{"XS": {"chest": 80, "waist": 60}}' />
                  )}
                </Panel>
              </div>
            </div>
          )}

          {activeTab === 'seo' && (
            <div className="p-4 max-w-2xl mx-auto space-y-3">
              <Panel>
                <SectionLabel>SEO налаштування</SectionLabel>
                <Field label="Стать / аудиторія">
                  <select value={form.gender} onChange={e => setForm(p => ({...p, gender: e.target.value}))} className={inputCls}>
                    <option value="">— Не вибрано —</option>
                    <option value="male">Хлопчик (male)</option>
                    <option value="female">Дівчинка (female)</option>
                    <option value="unisex">Унісекс (unisex)</option>
                  </select>
                </Field>
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
