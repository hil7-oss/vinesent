'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
const API_BASE = ''

export default function AdminContentPage() {
  const [content, setContent] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'banners' | 'collections'>('banners')
  const getProductImage = (p: any): string => {
    const raw = p?.images
    if (!raw) return ''
    if (Array.isArray(raw)) return String(raw[0] || '')
    if (typeof raw === 'string') {
      try {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr)) return String(arr[0] || '')
      } catch {}
    }
    return ''
  }

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [contentRes, productsRes] = await Promise.all([
        fetch(`${API_BASE}/content`),
        fetch(`${API_BASE}/products`)
      ])
      if (contentRes.ok) setContent(await contentRes.json())
      if (productsRes.ok) setProducts(await productsRes.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const updateCollection = async (key: string, data: { productIds?: string[], title?: string, description?: string }) => {
    setSaving(true)
    try {
      await fetch(`${API_BASE}/content/collections/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      await fetchData()
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const updateBanner = async (banner: any) => {
    // Basic implementation for banner update
    // For now, we focus on collections as requested
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 h-16">
          <Link href="/admin" className="lg:hidden text-[14px]">← Назад</Link>
          <h2 className="text-[18px] font-bold">Управління контентом</h2>
        </div>
      </div>

      <main className="min-w-0 p-6 lg:p-8">
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('collections')}
            className={`pb-3 text-[14px] font-medium transition ${activeTab === 'collections' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}
          >
            Колекції (NEW, SALE, CASUAL)
          </button>
          <button 
            onClick={() => setActiveTab('banners')}
            className={`pb-3 text-[14px] font-medium transition ${activeTab === 'banners' ? 'border-b-2 border-black text-black' : 'text-gray-500'}`}
          >
            Банери
          </button>
        </div>

        {activeTab === 'collections' && (
          <div className="space-y-8">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-6">
              <span className="font-bold">Примітка:</span> Сезонні колекції (WINTER, SPRING, SUMMER, AUTUMN) керуються в розділі <Link href="/admin/categories" className="underline hover:text-blue-900">Категорії</Link>. Там ви можете змінити їх назви та додати фото.
            </div>

            {['NEW', 'SALE', 'CASUAL'].map(key => {
              const collection = content?.collections?.find((c: any) => c.key === key) || { key, productIds: [] }
              const currentIds = collection.productIds || []
              
              return (
                <div key={key} className="bg-white rounded-2xl border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[18px] font-bold">
                      {collection.title || key} 
                      <span className="text-gray-400 text-sm font-normal ml-2">({key})</span>
                    </h3>
                    <div className="text-[12px] text-gray-400">ID: {collection.id}</div>
                  </div>
                  
                  <div className="grid gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                    <div>
                        <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Заголовок (Title)</label>
                        <input 
                            defaultValue={collection.title || key}
                            onBlur={(e) => updateCollection(key, { title: e.target.value })}
                            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[14px]"
                        />
                    </div>
                    <div>
                        <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Опис (Description)</label>
                        <input 
                            defaultValue={collection.description || ''}
                            onBlur={(e) => updateCollection(key, { description: e.target.value })}
                            className="w-full h-10 px-3 rounded-lg border border-gray-200 text-[14px]"
                        />
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-[12px] font-medium uppercase tracking-wide mb-2">Виберіть товари</label>
                    <div className="border border-gray-200 rounded-xl p-4 max-h-60 overflow-y-auto grid grid-cols-1 lg:grid-cols-2 gap-2">
                      {products.map(p => (
                        <label key={p.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={currentIds.includes(p.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked 
                                ? [currentIds, p.id]
                                : currentIds.filter((id: string) => id !== p.id)
                              updateCollection(key, { productIds: newIds })
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black accent-black"
                          />
                          <div className="flex items-center gap-3">
                             {getProductImage(p) && (
                               <img src={getProductImage(p) || '/file.svg'} className="w-10 h-10 rounded-md object-cover bg-gray-100" />
                             )}
                             <div>
                               <div className="text-[13px] font-medium">{p.name}</div>
                               <div className="text-[11px] text-gray-400">{formatPrice(p.price)}</div>
                             </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-[12px] font-medium uppercase tracking-wide mb-2">Порядок відображення</label>
                    <div className="space-y-2">
                      {currentIds.map((id: string, idx: number) => {
                        const p = products.find(x => x.id === id)
                        if (!p) return null
                        const move = (dir: -1 | 1) => {
                          const ni = idx + dir
                          if (ni < 0 || ni >= currentIds.length) return
                          const arr = [currentIds]
                          const [item] = arr.splice(idx, 1)
                          arr.splice(ni, 0, item)
                          updateCollection(key, { productIds: arr })
                        }
                        return (
                          <div key={id} className="flex items-center gap-3 p-2 border border-gray-200 rounded-lg">
                            {getProductImage(p) && <img src={getProductImage(p) || '/file.svg'} className="w-10 h-10 rounded-md object-cover bg-gray-100" />}
                            <div className="flex-1">
                              <div className="text-[13px] font-medium">{p.name}</div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => move(-1)} className="w-7 h-7 rounded-lg border text-[12px]">↑</button>
                              <button onClick={() => move(1)} className="w-7 h-7 rounded-lg border text-[12px]">↓</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  <div className="text-[12px] text-gray-400">
                    Обрано: {currentIds.length} товарів
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'banners' && (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center text-gray-500">
            Функціонал управління банерами в розробці
          </div>
        )}
      </main>
    </div>
  )
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH', minimumFractionDigits: 0 }).format(value).replace('UAH', 'грн')
}
