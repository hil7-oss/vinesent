import { MetadataRoute } from 'next'

const API_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || process.env.FASTAPI_URL || 'https://api.vinesent.com'
const SITE_URL = 'https://vinesent.com'

interface SitemapProduct {
  slug: string
  fullSlug: string
  categorySlug?: string
  parentSlug?: string
  updatedAt?: string
}

interface SitemapData {
  products: SitemapProduct[]
  categories: Array<{ slug: string; updatedAt?: string }>
}

async function getSitemapData(): Promise<SitemapData> {
  try {
    const res = await fetch(`${API_URL}/sitemap-data`, {
      cache: 'no-store'
    })
    if (!res.ok) return { products: [], categories: [] }
    return await res.json()
  } catch {
    return { products: [], categories: [] }
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await getSitemapData()

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/category/girl`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/category/boy`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/sale`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/new`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const productPages: MetadataRoute.Sitemap = data.products.map((product) => ({
    url: `${SITE_URL}/products/${product.fullSlug}`,
    lastModified: product.updatedAt ? new Date(product.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const categoryPages: MetadataRoute.Sitemap = data.categories.map((category) => ({
    url: `${SITE_URL}/category/${category.slug}`,
    lastModified: category.updatedAt ? new Date(category.updatedAt) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticPages, ...categoryPages, ...productPages]
}
