'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'

export const dynamic = 'force-dynamic'

const API_BASE = '/api/fastapi'

type Store = {
  id: string
  name: string
  city?: string | null
  address?: string | null
  mapsUrl?: string | null
  createdAt?: string | null
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', city: '', address: '', mapsUrl: '' })

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/stores`, { cache: 'no-store' })
      const data = res.ok ? await res.json() : []
      setStores(Array.isArray(data) ? data : [])
    } catch {
      setStores([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchStores() }, [fetchStores])

  const reset = () => {
    setEditingId(null)
    setForm({ name: '', city: '', address: '', mapsUrl: '' })
    setError('')
  }

  const startEdit = (s: Store) => {
    setEditingId(s.id)
    setForm({
      name: s.name || '',
      city: s.city || '',
      address: s.address || '',
      mapsUrl: s.mapsUrl || '',
    })
    setError('')
  }

  const submit = async () => {
    if (!form.name.trim()) { setError("Вкажіть назву"); return }
    setSaving(true); setError('')
    try {
      const url = editingId ? `${API_BASE}/api/v1/stores/${editingId}` : `${API_BASE}/api/v1/stores`
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          city: form.city.trim() || null,
          address: form.address.trim() || null,
          mapsUrl: form.mapsUrl.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(String(data?.detail || data?.error || 'Помилка збереження'))
        setSaving(false)
        return
      }
      reset()
      fetchStores()
    } catch {
      setError('Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Видалити точку самовивозу?')) return
    await fetch(`${API_BASE}/api/v1/stores/${id}`, { method: 'DELETE' })
    fetchStores()
  }

  const list = useMemo(() => stores, [stores])

  return (
    <div className="min-h-screen bg-[#f5f5f3]">
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <h1 className="text-[16px] font-bold text-gray-900 lg:text-[18px]">Самовивіз</h1>
          {!loading && (
            <span className="h-7 px-2.5 bg-white border border-gray-100 text-gray-500 text-[11px] font-medium rounded-lg flex items-center">
              {list.length} точок
            </span>
          )}
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 pb-24 lg:pb-8 max-w-4xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="text-[12px] font-bold uppercase tracking-widest text-gray-400">{editingId ? 'Редагування точки' : 'Нова точка'}</div>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Назва</div>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-black/15 text-[13px] outline-none focus:border-black/40 transition" placeholder="Напр. Vinesent Store" />
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Місто</div>
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-black/15 text-[13px] outline-none focus:border-black/40 transition" placeholder="Київ" />
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Адреса</div>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-black/15 text-[13px] outline-none focus:border-black/40 transition" placeholder="проспект Київ Василя Порика, 2, Україна, 02000" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Google Maps URL</div>
              <input value={form.mapsUrl} onChange={e => setForm(p => ({ ...p, mapsUrl: e.target.value }))} className="w-full h-11 px-4 rounded-xl border border-black/15 text-[13px] outline-none focus:border-black/40 transition" placeholder="https://maps.app.goo.gl/..." />
            </div>
            {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</div>}
            <div className="flex items-center gap-2 pt-2">
              <button onClick={submit} disabled={saving} className="h-10 px-4 rounded-xl bg-gray-950 text-white text-[12px] font-semibold uppercase disabled:opacity-50 hover:bg-gray-800 transition">
                {saving ? 'Збереження…' : 'Зберегти'}
              </button>
              {editingId && (
                <button onClick={reset} className="h-10 px-4 rounded-xl border border-black/15 text-[12px] font-semibold uppercase hover:bg-gray-50 transition">
                  Скасувати
                </button>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-white rounded-2xl border border-gray-100" />)}</div>
        )}

        {!loading && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="text-[12px] font-bold uppercase tracking-widest text-gray-400">Список</div>
            </div>
            {list.length === 0 ? (
              <div className="py-14 text-center text-[13px] text-gray-400">Немає точок</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {list.map(s => (
                  <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-gray-900">{s.name}</div>
                      <div className="text-[12px] text-gray-500 mt-0.5">
                        {[s.city, s.address].filter(Boolean).join(' · ') || '—'}
                      </div>
                      {s.mapsUrl && (
                        <a href={s.mapsUrl} target="_blank" rel="noreferrer" className="inline-flex mt-1 text-[12px] text-blue-600 hover:underline">
                          Google Maps →
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => startEdit(s)} className="h-8 px-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[12px] font-semibold transition">
                        Редагувати
                      </button>
                      <button onClick={() => remove(s.id)} className="h-8 px-3 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-[12px] font-semibold transition">
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

