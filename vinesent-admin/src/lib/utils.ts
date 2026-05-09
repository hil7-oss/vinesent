export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value)
  if (isNaN(n)) return `${value}`
  return `${n.toLocaleString('uk-UA')} \u20B4`
}

export function getFirstImage(images: string | null | undefined): string {
  if (!images) return ''
  try {
    const arr = JSON.parse(images)
    if (!Array.isArray(arr)) {
      console.error('[getFirstImage] Not an array:', typeof arr, arr)
      return ''
    }
    
    // Поддержка нового формата (массив объектов) и старого (массив строк)
    const first = arr[0]
    if (!first) return ''
    if (typeof first === 'string') return first
    if (typeof first === 'object' && first.url) return first.url
    console.error('[getFirstImage] Unknown format:', first)
    return ''
  } catch (e) {
    console.error('[getFirstImage] Parse error:', e, 'Input:', images?.substring(0, 100))
    return images.startsWith('http') || images.startsWith('/') ? images : ''
  }
}

export function getAllImages(images: string | null | undefined): string[] {
  if (!images) return []
  try {
    const arr = JSON.parse(images)
    if (!Array.isArray(arr)) return []
    
    // Поддержка нового формата (массив объектов) и старого (массив строк)
    return arr.map((item: any) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && item.url) return item.url
      return ''
    }).filter(Boolean)
  } catch {
    return images.startsWith('http') || images.startsWith('/') ? [images] : []
  }
}

export function cn(classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
