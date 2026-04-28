import { 
  GenerateRequest, 
  BatchGenerateRequest, 
  PromptTemplate 
} from '@/types/ai-photos'
import { API_BASE } from '@/lib/api'

const BASE = `${API_BASE}/admin/ai-photos`

export const aiPhotosApi = {
  // Товары
  getProducts: (params: { category?: string; hasAiPhoto?: boolean; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params.category) searchParams.append('category', params.category)
    if (params.hasAiPhoto !== undefined) searchParams.append('has_ai_photo', String(params.hasAiPhoto))
    if (params.page) searchParams.append('page', String(params.page))
    if (params.limit) searchParams.append('limit', String(params.limit))
    return fetch(`${BASE}/products?` + searchParams.toString()).then(r => r.json())
  },

  // Генерация
  generate: (data: GenerateRequest) =>
    fetch(`${BASE}/generate`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),

  generateBatch: (data: BatchGenerateRequest) =>
    fetch(`${BASE}/generate-batch`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),

  getBatchStatus: (jobId: string) =>
    fetch(`${BASE}/batch-status/${jobId}`).then(r => r.json()),

  // Шаблоны
  getTemplates: (params?: { category?: string; gender?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.category) searchParams.append('category', params.category)
    if (params?.gender) searchParams.append('gender', params.gender)
    return fetch(`${BASE}/prompt-templates?` + searchParams.toString()).then(r => r.json())
  },

  createTemplate: (data: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>) =>
    fetch(`${BASE}/prompt-templates`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),

  updateTemplate: (id: number, data: Partial<PromptTemplate>) =>
    fetch(`${BASE}/prompt-templates/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),

  testTemplate: (data: { templateText: string; gender: string; colorHex: string; colorName: string; productId: string }) =>
    fetch(`${BASE}/prompt-templates/test`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }).then(r => r.json()),

  // Удаление
  deletePhoto: (id: number) =>
    fetch(`${BASE}/generated/${id}`, { method: 'DELETE' }).then(r => r.json()),
}
