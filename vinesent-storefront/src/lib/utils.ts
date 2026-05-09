export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value)
  if (isNaN(n)) return `${value}`
  return `${n.toLocaleString('uk-UA')} \u20B4`
}

export function getFirstImage(images: string | null | undefined): string {
  if (!images) return ''
  try {
    const arr = JSON.parse(images)
    if (!Array.isArray(arr) || arr.length === 0) return ''
    const first = arr[0]
    if (typeof first === 'string') return first
    if (typeof first === 'object' && first !== null) return first.url || ''
    return ''
  } catch {
    return images.startsWith('http') || images.startsWith('/') ? images : ''
  }
}

export function getAllImages(images: string | null | undefined): string[] {
  if (!images) return []
  try {
    const arr = JSON.parse(images)
    if (!Array.isArray(arr)) return []
    return arr.map(item => {
      if (typeof item === 'string') return item
      if (typeof item === 'object' && item !== null) return item.url || ''
      return ''
    }).filter(Boolean)
  } catch {
    return images.startsWith('http') || images.startsWith('/') ? [images] : []
  }
}

export function cn(classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function getOptimizedImage(url: string | null | undefined, options: { width?: number; quality?: number; blur?: number } = {}): string {
  if (!url || typeof url !== 'string') return ''
  
  if (url.includes('res.cloudinary.com')) {
    const { width = 800, quality = 'auto', blur } = options
    const transformations = [
      `f_auto`,
      `q_${quality}`,
      `c_limit`,
      width ? `w_${width}` : '',
      blur ? `e_blur:${blur}` : ''
    ].filter(Boolean).join(',')

    if (url.includes('/upload/')) {
      // If there are already transformations (between /upload/ and /v123/ or path), replace them
      // Otherwise, insert after /upload/
      const parts = url.split('/upload/')
      const afterUpload = parts[1]
      
      // Check if there's a transformation block before the version/path
      // Transformations usually don't start with 'v' followed by digits (version) or look like a file path
      const hasTransform = !afterUpload.startsWith('v') && afterUpload.includes('/')
      
      if (hasTransform) {
        const remaining = afterUpload.split('/').slice(1).join('/')
        return `${parts[0]}/upload/${transformations}/${remaining}`
      }
      return `${parts[0]}/upload/${transformations}/${afterUpload}`
    }
  }
  
  return url
}
