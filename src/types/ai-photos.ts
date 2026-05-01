export type Gender = 'male' | 'female'
export type ColorSource = 'auto' | 'manual'
export type GeneratedPhotoStatus = 'processing' | 'done' | 'failed'
export type BatchJobStatus = 'running' | 'completed' | 'partial'

export interface PromptTemplate {
  id: number
  name: string
  category: string
  gender: Gender | 'unisex'
  templateText: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface GeneratedPhoto {
  id: number
  productId: string
  cloudinaryUrl: string
  gender: Gender
  colorHex: string
  colorName: string
  status: GeneratedPhotoStatus
  errorMessage?: string
  batchJobId?: string
  createdAt: string
}

export interface BatchJob {
  jobId: string
  total: number
  done: number
  failed: number
  status: BatchJobStatus
  items: (GeneratedPhoto & { productName?: string; productImage?: string })[]
}

export interface ProductWithAiStatus {
  id: string
  name: string
  category?: { name: string }
  images: string // JSON string
  aiPhotosCount: number
  generatedPhotos?: GeneratedPhoto[]
}

export interface GenerateRequest {
  productId: string
  promptTemplateId: number
  gender: Gender
  colorSource: ColorSource
  colorHex?: string
  colorName?: string
}

export interface BatchGenerateRequest {
  productIds: string[]
  promptTemplateId: number
  gender: Gender
  colorSource: ColorSource
  colorHex?: string
  colorName?: string
}