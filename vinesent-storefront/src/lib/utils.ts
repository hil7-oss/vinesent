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

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
