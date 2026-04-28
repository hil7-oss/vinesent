'use client'

import { useState, useEffect } from 'react'
import { aiPhotosApi } from '@/lib/api/ai-photos'
import { ProductWithAiStatus, PromptTemplate, GeneratedPhoto } from '@/types/ai-photos'
import { getFirstImage } from '@/lib/utils'

// Simple UI components to avoid dependency on shadcn for this prototype if missing
// In a real app, import from @/components/ui/...

const Tabs = ({ children, active, onChange }: any) => (
  <div className="space-y-4">
    <div className="flex border-b border-gray-200">
      {children.map((child: any) => (
        <button
          key={child.props.value}
          onClick={() => onChange(child.props.value)}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            active === child.props.value
              ? 'border-black text-black'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {child.props.label}
        </button>
      ))}
    </div>
    {children.find((child: any) => child.props.value === active)}
  </div>
)

const Tab = ({ children }: any) => <div className="py-4">{children}</div>

export default function AiPhotosPage() {
  const [activeTab, setActiveTab] = useState('generation')
  const [products, setProducts] = useState<ProductWithAiStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [templates, setTemplates] = useState<PromptTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [gender, setGender] = useState<string>('female')
  const [colorSource, setColorSource] = useState<'auto' | 'manual'>('auto')
  const [colorHex, setColorHex] = useState('#000000')
  const [colorName, setColorName] = useState('black')
  
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<any>(null)

  useEffect(() => {
    fetchData()
    fetchTemplates()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (jobId) {
      interval = setInterval(async () => {
        const status = await aiPhotosApi.getBatchStatus(jobId)
        setJobStatus(status)
        if (status.status === 'completed') {
          setJobId(null)
          fetchData() // Refresh products
        }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [jobId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const data = await aiPhotosApi.getProducts({ limit: 50 })
      setProducts(data)
    } finally {
      setLoading(false)
    }
  }

  const fetchTemplates = async () => {
    const data = await aiPhotosApi.getTemplates()
    setTemplates(data)
  }

  const handleGenerate = async () => {
    if (selectedIds.length === 0 || !selectedTemplate) return

    if (selectedIds.length === 1) {
      await aiPhotosApi.generate({
        productId: selectedIds[0],
        promptTemplateId: parseInt(selectedTemplate),
        gender: gender as any,
        colorSource,
        colorHex: colorSource === 'manual' ? colorHex : undefined,
        colorName: colorSource === 'manual' ? colorName : undefined
      })
      fetchData()
      setSelectedIds([])
    } else {
      const res = await aiPhotosApi.generateBatch({
        productIds: selectedIds,
        promptTemplateId: parseInt(selectedTemplate),
        gender: gender as any,
        colorSource,
        colorHex: colorSource === 'manual' ? colorHex : undefined,
        colorName: colorSource === 'manual' ? colorName : undefined
      })
      setJobId(res.job_id)
      setSelectedIds([])
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">AI Фотостудія</h1>
      
      <Tabs active={activeTab} onChange={setActiveTab}>
        <Tab value="generation" label="Генерація">
          <div className="flex gap-8">
            <div className="flex-1">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="w-10 px-4 py-3"><input type="checkbox" /></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Фото</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Товар</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AI Фото</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {products.map(p => (
                      <tr key={p.id} className={selectedIds.includes(p.id) ? 'bg-blue-50' : ''}>
                        <td className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.includes(p.id)} 
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="w-12 h-16 bg-gray-100 rounded overflow-hidden">
                            <img src={getFirstImage(p.images)} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.category?.name}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${p.aiPhotosCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {p.aiPhotosCount}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-80 space-y-6">
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="font-semibold mb-4">Налаштування генерації</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Шаблон</label>
                    <select 
                      value={selectedTemplate} 
                      onChange={e => setSelectedTemplate(e.target.value)}
                      className="w-full rounded-lg border-gray-300 shadow-sm focus:border-black focus:ring-black"
                    >
                      <option value="">Оберіть шаблон</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name} ({t.gender})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={gender === 'female'} onChange={() => setGender('female')} />
                        <span className="text-sm">Жінка</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={gender === 'male'} onChange={() => setGender('male')} />
                        <span className="text-sm">Чоловік</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Колір</label>
                    <div className="flex gap-4 mb-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={colorSource === 'auto'} onChange={() => setColorSource('auto')} />
                        <span className="text-sm">Авто</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" checked={colorSource === 'manual'} onChange={() => setColorSource('manual')} />
                        <span className="text-sm">Вручну</span>
                      </label>
                    </div>
                    {colorSource === 'manual' && (
                      <div className="flex gap-2">
                        <input type="color" value={colorHex} onChange={e => setColorHex(e.target.value)} className="h-9 w-9 p-0 border rounded" />
                        <input 
                          type="text" 
                          value={colorName} 
                          onChange={e => setColorName(e.target.value)}
                          placeholder="Назва кольору"
                          className="flex-1 rounded-lg border-gray-300 text-sm" 
                        />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleGenerate}
                    disabled={selectedIds.length === 0 || !selectedTemplate}
                    className="w-full py-2 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Сгенерувати ({selectedIds.length})
                  </button>
                </div>
              </div>

              {jobStatus && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="font-semibold mb-2">Статус завдання</h3>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Прогрес</span>
                    <span>{jobStatus.done} / {jobStatus.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${(jobStatus.done / jobStatus.total) * 100}%` }}></div>
                  </div>
                  {jobStatus.failed > 0 && (
                    <div className="mt-2 text-xs text-red-600">Помилок: {jobStatus.failed}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Tab>
        <Tab value="templates" label="Шаблони">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-medium mb-4">Список шаблонів</h3>
            <div className="space-y-4">
              {templates.map(t => (
                <div key={t.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold">{t.name}</h4>
                    <span className="text-xs px-2 py-1 bg-gray-200 rounded-full">{t.category}</span>
                  </div>
                  <p className="text-sm text-gray-600 font-mono whitespace-pre-wrap">{t.templateText}</p>
                </div>
              ))}
              {templates.length === 0 && <div className="text-gray-500">Немає шаблонів</div>}
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  )
}
