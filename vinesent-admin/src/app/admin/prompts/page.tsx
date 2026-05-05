'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  promptsApi,
  PhotoAccentInfo,
  SeoPromptInfo,
} from '@/lib/api/prompts'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
const IconPhoto = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
  </svg>
)
const IconSeo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><path d="M11 8v6M8 11h6" />
  </svg>
)
const IconCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M20 6L9 17l-5-5" />
  </svg>
)
const IconReset = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" />
  </svg>
)
const IconEye = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
)
const IconEdit = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const ACCENTS = [
  { key: 'top', label: 'Верх', desc: 'Футболки, куртки, худі, блузки', color: 'blue' },
  { key: 'bottom', label: 'Низ', desc: 'Штани, джинси, шорти, спідниці', color: 'green' },
  { key: 'accessory', label: 'Аксесуари', desc: 'Шапки, сумки, ремені, шарфи', color: 'amber' },
  { key: 'set', label: 'Сет / Образ', desc: 'Повний комплект одягу', color: 'purple' },
]

const SEO_KEYS = [
  { key: 'generate_seo_text', label: 'SEO метадані', desc: 'Генерує Title / Description / Keywords для товару (UK + RU)' },
  { key: 'generate_product_content', label: 'Контент товару', desc: 'Генерує назву, опис, SEO контент з зерна менеджера' },
  { key: 'parse_product_autofill', label: 'Автозаповнення', desc: 'Парсить неструктурований текст менеджера → JSON товару' },
]

const ACCENT_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  purple: 'bg-violet-50 border-violet-200 text-violet-700',
}

// ---------------------------------------------------------------------------
// PromptEditor component
// ---------------------------------------------------------------------------
interface EditorProps {
  title: string
  subtitle?: string
  currentPrompt: string
  defaultPrompt?: string
  hasCustom: boolean
  onSave: (text: string) => Promise<void>
  onReset: () => Promise<void>
  onPreview?: (text: string) => void
  saving: boolean
}

function PromptEditor({ title, subtitle, currentPrompt, defaultPrompt, hasCustom, onSave, onReset, onPreview, saving }: EditorProps) {
  const [text, setText] = useState(currentPrompt)
  const [dirty, setDirty] = useState(false)
  const [showDefault, setShowDefault] = useState(false)

  useEffect(() => {
    setText(currentPrompt)
    setDirty(false)
  }, [currentPrompt])

  const handleChange = (v: string) => {
    setText(v)
    setDirty(v !== currentPrompt)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 text-[15px]">{title}</h3>
            {hasCustom && (
              <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Кастом</span>
            )}
          </div>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {defaultPrompt && (
            <button
              onClick={() => setShowDefault(s => !s)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition"
            >
              <IconEye />
              {showDefault ? 'Сховати' : 'Дефолт'}
            </button>
          )}
          {hasCustom && (
            <button
              onClick={onReset}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition disabled:opacity-40"
            >
              <IconReset />
              Скинути
            </button>
          )}
          {onPreview && (
            <button
              onClick={() => onPreview(text)}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition"
            >
              <IconEye />
              Превью
            </button>
          )}
        </div>
      </div>

      {/* Default prompt view */}
      {showDefault && defaultPrompt && (
        <div className="px-5 py-3 bg-gray-50 border-b border-dashed border-gray-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Вбудований дефолт</p>
          <pre className="text-xs text-gray-600 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">{defaultPrompt}</pre>
        </div>
      )}

      {/* Editor */}
      <div className="p-5">
        <textarea
          value={text}
          onChange={e => handleChange(e.target.value)}
          rows={12}
          className="w-full text-[13px] font-mono leading-relaxed border border-gray-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 resize-y bg-gray-50 transition"
          placeholder="Введіть промпт..."
        />
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-gray-400">{text.length} символів</p>
          <button
            onClick={() => onSave(text)}
            disabled={!dirty || saving || !text.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-950 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
            ) : (
              <IconCheck />
            )}
            Зберегти
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Preview modal
// ---------------------------------------------------------------------------
function PreviewModal({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Превью промпту</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <pre className="text-[13px] font-mono leading-relaxed whitespace-pre-wrap text-gray-700">{text}</pre>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function PromptsPage() {
  const [tab, setTab] = useState<'photo' | 'seo'>('photo')
  const [selectedAccent, setSelectedAccent] = useState('top')
  const [selectedSeoKey, setSelectedSeoKey] = useState('generate_seo_text')

  const [photoData, setPhotoData] = useState<PhotoAccentInfo | null>(null)
  const [photoDefaults, setPhotoDefaults] = useState<Record<string, PhotoAccentInfo>>({})
  const [seoData, setSeoData] = useState<SeoPromptInfo[]>([])
  const [seoDefaults, setSeoDefaults] = useState<Record<string, string>>({})

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const loadPhotoAccent = useCallback(async (accent: string) => {
    try {
      const [current, defaults] = await Promise.all([
        promptsApi.getPhotoAccent(accent),
        photoDefaults[accent] ? Promise.resolve(photoDefaults[accent]) : promptsApi.getPhotoDefaults(accent),
      ])
      setPhotoData(current)
      if (!photoDefaults[accent]) {
        setPhotoDefaults(prev => ({ ...prev, [accent]: defaults }))
      }
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }, [photoDefaults])

  const loadSeo = useCallback(async () => {
    try {
      const [overview, defaults] = await Promise.all([
        promptsApi.getSeoOverview(),
        promptsApi.getSeoDefaults(),
      ])
      setSeoData(overview)
      const map: Record<string, string> = {}
      defaults.forEach(d => { map[d.key] = d.prompt })
      setSeoDefaults(map)
    } catch (e: any) {
      showToast(e.message, 'error')
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      try {
        await Promise.all([loadPhotoAccent('top'), loadSeo()])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  useEffect(() => {
    if (!loading) loadPhotoAccent(selectedAccent)
  }, [selectedAccent])

  // Photo save
  const handlePhotoSave = async (view: string, text: string) => {
    setSaving(true)
    try {
      await promptsApi.setPhotoPrompt(selectedAccent, view, text)
      showToast('Промпт збережено ✓')
      await loadPhotoAccent(selectedAccent)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Photo reset
  const handlePhotoReset = async (view: string) => {
    setSaving(true)
    try {
      await promptsApi.resetPhotoView(selectedAccent, view)
      showToast('Скинуто до дефолту ✓')
      await loadPhotoAccent(selectedAccent)
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Photo preview
  const handlePhotoPreview = async (view: string, text: string) => {
    try {
      const res = await promptsApi.previewPhoto({ accent: selectedAccent, view, category: 'Футболка', gender: 'male', color_hex: '#3A7BD5' })
      setPreview(res.rendered)
    } catch {
      setPreview(text)
    }
  }

  // SEO save
  const handleSeoSave = async (key: string, text: string) => {
    setSaving(true)
    try {
      await promptsApi.setSeoPrompt(key, text)
      showToast('SEO промпт збережено ✓')
      await loadSeo()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // SEO reset
  const handleSeoReset = async (key: string) => {
    setSaving(true)
    try {
      await promptsApi.resetSeoPrompt(key)
      showToast('Скинуто до дефолту ✓')
      await loadSeo()
    } catch (e: any) {
      showToast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // SEO preview
  const handleSeoPreview = async (key: string, text: string) => {
    try {
      const res = await promptsApi.previewSeo({ key, product_name: 'Дитяча куртка', product_description: 'Зимова куртка', category: 'Куртки' })
      setPreview(res.rendered)
    } catch {
      setPreview(text)
    }
  }

  const currentSeoItem = seoData.find(s => s.key === selectedSeoKey)

  return (
    <div className="min-h-screen bg-gray-50/60">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 transition-all ${
          toast.type === 'success' ? 'bg-gray-950 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <IconCheck /> : '⚠'}
          {toast.msg}
        </div>
      )}

      {/* Preview modal */}
      {preview && <PreviewModal text={preview} onClose={() => setPreview(null)} />}

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-950">Управління промптами</h1>
          <p className="text-sm text-gray-500 mt-1">Редагуйте промпти для AI-генерації фото та автоматичного SEO</p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-1 bg-white border border-gray-200 rounded-2xl w-fit mb-8 shadow-sm">
          <button
            onClick={() => setTab('photo')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'photo' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <IconPhoto />
            Генерація фото
          </button>
          <button
            onClick={() => setTab('seo')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === 'seo' ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <IconSeo />
            SEO автогенерація
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-3">
              <svg className="w-8 h-8 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0 1 10 10" /></svg>
              <p className="text-sm text-gray-400">Завантаження...</p>
            </div>
          </div>
        ) : tab === 'photo' ? (
          /* ══════════════════ PHOTO TAB ══════════════════ */
          <div className="flex gap-6">
            {/* Accent sidebar */}
            <div className="w-52 flex-shrink-0 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-3">Тип одягу</p>
              {ACCENTS.map(a => (
                <button
                  key={a.key}
                  onClick={() => setSelectedAccent(a.key)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm ${
                    selectedAccent === a.key
                      ? 'bg-gray-950 text-white shadow-sm'
                      : 'bg-white border border-gray-100 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="font-medium">{a.label}</div>
                  <div className={`text-[11px] mt-0.5 ${selectedAccent === a.key ? 'text-gray-400' : 'text-gray-400'}`}>{a.desc}</div>
                </button>
              ))}

              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-2">Змінні в промпті</p>
                {['{item}', '{gen}', '{color_hex}', '{STRICT}'].map(v => (
                  <div key={v} className="px-3 py-1.5 bg-gray-100 rounded-lg text-[11px] font-mono text-gray-600">{v}</div>
                ))}
              </div>
            </div>

            {/* Views list */}
            <div className="flex-1 space-y-4">
              {photoData ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-950">{photoData.label}</h2>
                      <p className="text-xs text-gray-500">{photoData.views.length} ракурсів</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm('Скинути ВСІ промпти для цього акценту до дефолту?')) return
                        setSaving(true)
                        try {
                          await promptsApi.resetPhotoAccent(selectedAccent)
                          showToast('Всі промпти скинуто ✓')
                          await loadPhotoAccent(selectedAccent)
                        } catch (e: any) {
                          showToast(e.message, 'error')
                        } finally {
                          setSaving(false)
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs text-rose-500 border border-rose-200 rounded-xl hover:bg-rose-50 transition"
                    >
                      <IconReset />
                      Скинути всі
                    </button>
                  </div>

                  {photoData.views.map(v => (
                    <PromptEditor
                      key={v.view}
                      title={v.label || v.view}
                      subtitle={`Ракурс: ${v.view}`}
                      currentPrompt={v.prompt}
                      defaultPrompt={photoDefaults[selectedAccent]?.views.find(d => d.view === v.view)?.prompt}
                      hasCustom={v.has_custom}
                      saving={saving}
                      onSave={text => handlePhotoSave(v.view, text)}
                      onReset={() => handlePhotoReset(v.view)}
                      onPreview={text => handlePhotoPreview(v.view, text)}
                    />
                  ))}
                </>
              ) : (
                <div className="text-center text-gray-400 py-16">Оберіть тип одягу</div>
              )}
            </div>
          </div>
        ) : (
          /* ══════════════════ SEO TAB ══════════════════ */
          <div className="flex gap-6">
            {/* SEO key sidebar */}
            <div className="w-52 flex-shrink-0 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-3">Функція генерації</p>
              {SEO_KEYS.map(k => {
                const item = seoData.find(s => s.key === k.key)
                return (
                  <button
                    key={k.key}
                    onClick={() => setSelectedSeoKey(k.key)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm ${
                      selectedSeoKey === k.key
                        ? 'bg-gray-950 text-white shadow-sm'
                        : 'bg-white border border-gray-100 text-gray-700 hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{k.label}</span>
                      {item?.has_custom && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] mt-0.5 text-gray-400 leading-snug">{k.desc}</div>
                  </button>
                )
              })}

              <div className="mt-6 pt-4 border-t border-gray-100 space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 px-1 mb-2">Змінні</p>
                {['{product_name}', '{product_description}', '{category}', '{brand}', '{audience}', '{seed_text}', '{input_text}'].map(v => (
                  <div key={v} className="px-3 py-1.5 bg-gray-100 rounded-lg text-[11px] font-mono text-gray-600">{v}</div>
                ))}
              </div>
            </div>

            {/* SEO editor */}
            <div className="flex-1">
              {currentSeoItem ? (
                <PromptEditor
                  title={SEO_KEYS.find(k => k.key === selectedSeoKey)?.label || selectedSeoKey}
                  subtitle={SEO_KEYS.find(k => k.key === selectedSeoKey)?.desc}
                  currentPrompt={currentSeoItem.prompt}
                  defaultPrompt={seoDefaults[selectedSeoKey]}
                  hasCustom={currentSeoItem.has_custom}
                  saving={saving}
                  onSave={text => handleSeoSave(selectedSeoKey, text)}
                  onReset={() => handleSeoReset(selectedSeoKey)}
                  onPreview={text => handleSeoPreview(selectedSeoKey, text)}
                />
              ) : (
                <div className="text-center text-gray-400 py-16">Оберіть функцію SEO</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
