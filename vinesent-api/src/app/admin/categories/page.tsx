'use client'
import { useEffect, useState, useCallback } from 'react'
import { slugify } from '@/lib/slug'
import { fetchApi } from '@/lib/api'

type Category = {
  id: string; name: string; slug: string; image?: string
  description?: string; parentId?: string; productCount?: number
}

const API_BASE = ''

const formatError = (value: any): string => {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(formatError).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const v = value as any
    return formatError(v.detail || v.error || v.message || v.msg || JSON.stringify(value))
  }
  return String(value)
}

// ─── tiny ui primitives ──────────────────────
const inp = "w-full h-11 px-4 rounded-xl border border-gray-200 text-[14px] bg-white outline-none focus:border-gray-800 focus:ring-1 focus:ring-gray-800/10 transition placeholder:text-gray-300"

function IconEdit() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
    </svg>
  )
}
function IconDelete() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
    </svg>
  )
}

// ─── category form modal ─────────────────────
function CategoryForm({
  editId, form, setForm, categories, saving, error, autoSlug, setAutoSlug,
  onSubmit, onClose, onImageUpload,
}: {
  editId: string | null
  form: { name: string; slug: string; description: string; image: string; parentId: string }
  setForm: React.Dispatch<React.SetStateAction<any>>
  categories: Category[]
  saving: boolean
  error: string
  autoSlug: boolean
  setAutoSlug: (v: boolean) => void
  onSubmit: () => void
  onClose: () => void
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-end sm:items-center justify-center">
      {/* Sheet on mobile, centered modal on desktop */}
      <div className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h3 className="text-[16px] font-bold text-gray-900">
            {editId ? 'Редагувати категорію' : 'Нова категорія'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {error && (
            <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 px-4 py-3 rounded-xl">{error}</div>
          )}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Назва</label>
            <input
              value={form.name}
              onChange={e => {
                const name = e.target.value
                setForm((p: any) => ({ p, name, slug: autoSlug ? slugify(name) : p.slug }))
              }}
              className={inp}
              placeholder="Наприклад: Дівчатка"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Батьківська категорія</label>
            <select
              value={form.parentId}
              onChange={e => setForm((p: any) => ({ p, parentId: e.target.value }))}
              className={inp + ' appearance-none cursor-pointer'}
            >
              <option value="">— Коренева категорія —</option>
              {categories.filter(c => c.id !== editId && !c.parentId).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Slug</label>
            <input
              value={form.slug}
              onChange={e => { setForm((p: any) => ({ p, slug: e.target.value })); setAutoSlug(e.target.value.length === 0) }}
              className={inp + ' font-mono text-[13px]'}
              placeholder="auto-generated"
            />
            <div className="text-[10px] text-gray-400 mt-1">Частина URL: /category/<span className="font-mono text-gray-600">{form.slug || 'slug'}</span></div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Опис</label>
            <textarea
              value={form.description}
              onChange={e => setForm((p: any) => ({ p, description: e.target.value }))}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-[14px] bg-white outline-none focus:border-gray-800 transition resize-none placeholder:text-gray-300"
              placeholder="Необов'язково"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Зображення</label>
            <div className="flex gap-2">
              <input
                value={form.image}
                onChange={e => setForm((p: any) => ({ p, image: e.target.value }))}
                className={inp + ' flex-1'}
                placeholder="https://"
              />
              <label className="h-11 w-11 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-xl cursor-pointer hover:bg-gray-200 transition">
                <svg className="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                <input type="file" className="hidden" onChange={onImageUpload} accept="image/*" />
              </label>
            </div>
            {form.image && (
              <div className="mt-2 h-32 rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                <img src={form.image} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        </div>

        {/* footer */}
        <div className="flex gap-2.5 px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl border border-gray-200 text-[14px] font-medium hover:bg-gray-50 transition">
            Скасувати
          </button>
          <button onClick={onSubmit} disabled={saving || !form.name.trim()}
            className="flex-1 h-11 rounded-xl bg-gray-950 text-white text-[14px] font-medium disabled:opacity-40 hover:bg-gray-800 transition">
            {saving ? 'Збереження…' : editId ? 'Зберегти' : 'Створити'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── parent card ─────────────────────────────
function ParentCard({
  parent, children, onEdit, onDelete, onAddChild,
}: {
  parent: Category
  children: Category[]
  onEdit: (c: Category) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
}) {
  const [open, setOpen] = useState(true)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Parent row */}
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Image / placeholder */}
        <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {parent.image
            ? <img src={parent.image} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-[16px] font-bold text-gray-300">{parent.name[0]}</div>
          }
        </div>

        {/* Text — tap to toggle children */}
        <button className="flex-1 text-left min-w-0" onClick={() => children.length > 0 && setOpen(o => !o)}>
          <div className="text-[15px] font-bold text-gray-900 leading-tight">{parent.name}</div>
          <div className="text-[11px] text-gray-400 font-mono mt-0.5 truncate">
            {parent.slug}
            {(parent.productCount || 0) > 0 && <span className="ml-2 not-italic font-sans text-gray-400">· {parent.productCount} шт.</span>}
          </div>
        </button>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onAddChild(parent.id)}
            className="h-8 px-2.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition text-[11px] font-semibold text-gray-600 whitespace-nowrap">
            + Підкат.
          </button>
          <button onClick={() => onEdit(parent)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
            <IconEdit />
          </button>
          <button onClick={() => onDelete(parent.id)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition">
            <IconDelete />
          </button>
          {children.length > 0 && (
            <button onClick={() => setOpen(o => !o)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition">
              <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 9l-7 7-7-7" strokeLinecap="round"/></svg>
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {open && children.length > 0 && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {children.map(child => (
            <div key={child.id} className="flex items-center gap-3 pl-7 pr-4 py-2.5 bg-gray-50/50">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {child.image
                  ? <img src={child.image} alt="" className="w-full h-full object-cover" />
                  : <div className="w-full h-full flex items-center justify-center text-[11px] font-bold text-gray-300">{child.name[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-gray-800 leading-tight">{child.name}</div>
                <div className="text-[10px] text-gray-400 font-mono truncate">
                  {child.slug}
                  {(child.productCount || 0) > 0 && <span className="ml-1.5 not-italic font-sans">· {child.productCount}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(child)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white text-gray-400 hover:text-gray-700 transition">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                </button>
                <button onClick={() => onDelete(child.id)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── main page ───────────────────────────────
export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', description: '', image: '', parentId: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [autoSlug, setAutoSlug] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetchApi('/categories')
      const data = await res.json()
      setCategories(Array.isArray(data) ? data : [])
    } catch { setCategories([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const resetForm = () => {
    setForm({ name: '', slug: '', description: '', image: '', parentId: '' })
    setEditId(null); setShowForm(false); setError(''); setAutoSlug(true)
  }

  const startEdit = (c: Category) => {
    setEditId(c.id)
    setForm({ name: c.name, slug: c.slug, description: c.description || '', image: c.image || '', parentId: c.parentId || '' })
    setShowForm(true); setAutoSlug(false); setError('')
  }

  const startCreateChild = (parentId: string) => {
    resetForm()
    setForm(p => ({ p, parentId }))
    setShowForm(true)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const fd = new FormData(); fd.append('file', file)
    try {
      const res = await fetchApi('/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setForm(p => ({ p, image: data.url }))
    } catch { setError('Не вдалося завантажити зображення') }
  }

  const handleSubmit = async () => {
    setSaving(true); setError('')
    const body = {
      name: form.name,
      slug: form.slug.trim() || slugify(form.name),
      description: form.description,
      image: form.image,
      parentId: form.parentId || undefined,
    }
    const url = editId ? `${API_BASE}/categories/${editId}` : `${API_BASE}/categories`
    const res = await fetch(url, { method: editId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const data = await res.json().catch(() => null)
      setError(formatError(data?.detail || data?.error || data || 'Помилка збереження'))
      setSaving(false); return
    }
    setSaving(false); resetForm(); fetchData()
  }

  const deleteCategory = async (id: string) => {
    if (!window.confirm('Видалити категорію?')) return
    await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' })
    fetchData()
  }

  const parents = categories.filter(c => !c.parentId)
  const orphans = categories.filter(c => c.parentId && !categories.some(p => p.id === c.parentId))
  const totalProducts = categories.reduce((s, c) => s + (c.productCount || 0), 0)

  return (
    <div className="min-h-screen bg-[#f5f5f3]">

      {/* ── top bar ── */}
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <div>
            <h1 className="text-[16px] font-bold text-gray-900 lg:text-[18px]">Категорії</h1>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="h-9 px-4 bg-gray-950 text-white text-[12px] font-semibold rounded-xl hover:bg-gray-800 transition flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 4v16m8-8H4"/></svg>
            Додати
          </button>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 pb-24 lg:pb-8 max-w-3xl mx-auto space-y-4">

        {/* Summary chips */}
        {!loading && (
          <div className="flex gap-2 flex-wrap">
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[12px]">
              <span className="text-gray-400">Категорій: </span>
              <span className="font-bold text-gray-900">{categories.length}</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[12px]">
              <span className="text-gray-400">Кореневих: </span>
              <span className="font-bold text-gray-900">{parents.length}</span>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl px-3 py-2 text-[12px]">
              <span className="text-gray-400">Товарів: </span>
              <span className="font-bold text-gray-900">{totalProducts}</span>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-16 bg-white rounded-2xl border border-gray-100" />
            ))}
          </div>
        )}

        {/* Category tree */}
        {!loading && (
          <div className="space-y-3">
            {parents.map(parent => (
              <ParentCard
                key={parent.id}
                parent={parent}
                children={categories.filter(c => c.parentId === parent.id)}
                onEdit={startEdit}
                onDelete={deleteCategory}
                onAddChild={startCreateChild}
              />
            ))}

            {/* Orphans */}
            {orphans.map(orphan => (
              <div key={orphan.id} className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-orange-800">{orphan.name}</div>
                  <div className="text-[11px] text-orange-500">Батьківська категорія не знайдена</div>
                </div>
                <button onClick={() => startEdit(orphan)}
                  className="h-8 px-3 rounded-lg bg-orange-100 text-orange-700 text-[12px] font-medium hover:bg-orange-200 transition">
                  Виправити
                </button>
              </div>
            ))}

            {parents.length === 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 10h16M4 14h10M4 18h7" strokeLinecap="round"/></svg>
                </div>
                <div className="text-[14px] font-semibold text-gray-700 mb-1">Немає категорій</div>
                <div className="text-[12px] text-gray-400 mb-4">Додайте першу категорію товарів</div>
                <button onClick={() => { resetForm(); setShowForm(true) }}
                  className="h-9 px-5 bg-gray-950 text-white text-[13px] font-medium rounded-xl hover:bg-gray-800 transition">
                  + Додати категорію
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <CategoryForm
          editId={editId}
          form={form}
          setForm={setForm}
          categories={categories}
          saving={saving}
          error={error}
          autoSlug={autoSlug}
          setAutoSlug={setAutoSlug}
          onSubmit={handleSubmit}
          onClose={resetForm}
          onImageUpload={handleImageUpload}
        />
      )}
    </div>
  )
}
