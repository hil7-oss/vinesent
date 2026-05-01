import { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.FASTAPI_URL || 'https://api.vinesent.com'
const SITE_URL = 'https://vinesent.com'

interface SitemapData {
  products: Array<{ slug: string; updatedAt?: string }>
  categories: Array<{ slug: string; updatedAt?: string }>
}

async function getSitemapData(): Promise<SitemapData> {
  try {
    const res = await fetch(`${API_URL}/sitemap-data`, {
      next: { revalidate: 3600 } // Кеш на 1 час
    })
    if (!res.ok) return { products: [], categories: [] }
    return await res.json()
  } catch {
    return { products: [], categories: [] }
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData()

  // Статические страницы
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]

  // Динамические страницы товаров
  const productPages: MetadataRoute.Sitemap = data.products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Динамические страницы категорий
  const categoryPages: MetadataRoute.Sitemap = data.categories.map((category) => ({
    url: `${SITE_URL}/categories/${category.slug}`,
    lastModified: category.updatedAt ? new Date(category.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}
