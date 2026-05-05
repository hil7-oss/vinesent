/**
 * lib/api/prompts.ts — API client for Prompts management
 * Communicates with GET/PUT/DELETE /api/admin/prompts/*
 */

const BASE = '/api/fastapi/api/admin/prompts'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.detail || body?.error?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PhotoViewInfo {
  view: string
  label?: string
  prompt: string
  has_custom: boolean
}

export interface PhotoAccentInfo {
  accent: string
  label: string
  views: PhotoViewInfo[]
}

export interface PhotoOverviewAccent {
  label: string
  views: { view: string; has_custom: boolean }[]
}

export type PhotoOverview = Record<string, PhotoOverviewAccent>

export interface SeoPromptInfo {
  key: string
  label: string
  prompt: string
  has_custom: boolean
}

export interface PreviewPhotoBody {
  accent: string
  view: string
  category?: string
  gender?: string
  color_hex?: string
}

export interface PreviewSeoBody {
  key: string
  product_name?: string
  product_description?: string
  category?: string
  seed_text?: string
  audience?: string
  brand?: string
}

// ---------------------------------------------------------------------------
// Photo prompts
// ---------------------------------------------------------------------------

export const promptsApi = {
  /** Full prompts.json dump */
  getAll: () => req<{ photo: Record<string, any>; seo: Record<string, string> }>(''),

  /** Overview: accent → views with custom status */
  getPhotoOverview: () => req<PhotoOverview>('/photo'),

  /** All views for a given accent (with actual prompt text) */
  getPhotoAccent: (accent: string) => req<PhotoAccentInfo>(`/photo/${accent}`),

  /** Built-in defaults for a given accent (ignores custom overrides) */
  getPhotoDefaults: (accent: string) => req<PhotoAccentInfo>(`/photo/defaults/${accent}`),

  /** Built-in _STRICT block text */
  getStrictBlock: () => req<{ strict: string }>('/photo/defaults/strict'),

  /** Built-in gender description blocks */
  getGenderBlocks: () => req<Record<string, string>>('/photo/defaults/gender'),

  /** Save custom prompt override for accent/view */
  setPhotoPrompt: (accent: string, view: string, prompt: string) =>
    req<{ ok: boolean }>(`/photo/${accent}/${view}`, {
      method: 'PUT',
      body: JSON.stringify({ prompt }),
    }),

  /** Reset single view to default */
  resetPhotoView: (accent: string, view: string) =>
    req<{ ok: boolean }>(`/photo/${accent}/${view}`, { method: 'DELETE' }),

  /** Reset all views for accent to defaults */
  resetPhotoAccent: (accent: string) =>
    req<{ ok: boolean }>(`/photo/${accent}`, { method: 'DELETE' }),

  /** Preview rendered photo prompt */
  previewPhoto: (body: PreviewPhotoBody) =>
    req<{ accent: string; view: string; rendered: string }>('/photo/preview', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ---------------------------------------------------------------------------
  // SEO prompts
  // ---------------------------------------------------------------------------

  /** Overview of all SEO prompts */
  getSeoOverview: () => req<SeoPromptInfo[]>('/seo'),

  /** Built-in SEO defaults */
  getSeoDefaults: () => req<{ key: string; label: string; prompt: string }[]>('/seo/defaults'),

  /** Single SEO prompt by key */
  getSeoPrompt: (key: string) => req<SeoPromptInfo>(`/seo/${key}`),

  /** Save custom SEO prompt */
  setSeoPrompt: (key: string, prompt: string) =>
    req<{ ok: boolean }>(`/seo/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ prompt }),
    }),

  /** Reset single SEO prompt to default */
  resetSeoPrompt: (key: string) =>
    req<{ ok: boolean }>(`/seo/${key}`, { method: 'DELETE' }),

  /** Reset all SEO prompts to defaults */
  resetAllSeo: () => req<{ ok: boolean }>('/seo', { method: 'DELETE' }),

  /** Preview rendered SEO prompt (no Gemini call) */
  previewSeo: (body: PreviewSeoBody) =>
    req<{ key: string; rendered: string; has_custom: boolean }>('/seo/preview', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
