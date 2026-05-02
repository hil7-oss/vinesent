import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { getFirstImage, getAllImages } from '@/lib/utils'
import ProductClientPage from './ProductClient'

export const revalidate = 300

// ─── Server-side product fetch ────────────────────────────────────────────────
async function fetchProductBySlug(slug: string) {
  try {
    const res = await fetch(api('/products'), { next: { revalidate: 300 } })
    if (!res.ok) return null
    const products = await res.json()
    if (!Array.isArray(products)) return null
    return products.find((p: any) => p.slug === slug || p.id === slug) || null
  } catch {
    return null
  }
}

// ─── SEO Metadata ─────────────────────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://vinesent.com'
  ).replace(/\/+$/, '')

  const product = await fetchProductBySlug(params.slug)

  if (!product) {
    return {
      title: 'Товар | VINESENT',
      description: 'VINESENT — Преміум дитячий одяг.',
    }
  }

  const name = String(product.name || '')
  
  // Favor database SEO fields over auto-generated values
  const seoTitle = product.seoTitle ? String(product.seoTitle) : null
  const seoDescription = product.seoDescription ? String(product.seoDescription) : null
  
  const finalTitle = seoTitle || `${name} | ${product.categories?.[0]?.name || product.category?.name || 'VINESENT'}`
  const finalDescription = seoDescription || (product.description
    ? String(product.description).replace(/\s+/g, ' ').trim().slice(0, 155)
    : `Купити ${name} у VINESENT — преміум дитячий одяг. Широкий вибір розмірів.`)

  const firstImage = getFirstImage(product.images)
  const imageUrl = firstImage
    ? firstImage.startsWith('http') ? firstImage : `${siteUrl}${firstImage}`
    : `${siteUrl}/og-default.jpg`

  return {
    title: finalTitle,
    description: finalDescription,
    openGraph: {
      title: `${name} | VINESENT`,
      description: finalDescription,
      url: `${siteUrl}/products/${params.slug}`,
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 1067,
          alt: name,
        },
      ],
      type: 'website',
      locale: 'uk_UA',
      siteName: 'VINESENT',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | VINESENT`,
      description: finalDescription,
      images: [imageUrl],
    },
    alternates: {
      canonical: `${siteUrl}/products/${params.slug}`,
    },
    robots: {
      index: true,
      follow: true,
    },
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function ProductPage({ params }: { params: { slug: string } }) {
  const [product, allProducts] = await Promise.all([
    fetchProductBySlug(params.slug),
    fetchAllProducts(),
  ])
  
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://vinesent.com'
  ).replace(/\/+$/, '')

  // Structured Data (JSON-LD) for Google - расширенная версия
  const jsonLd = product ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || product.seoDescription || `Купити ${product.name} у VINESENT - преміум дитячий одяг`,
    image: getAllImages(product.images).map((img: string) => 
      img.startsWith('http') ? img : `${siteUrl}${img}`
    ),
    brand: {
      '@type': 'Brand',
      name: 'VINESENT'
    },
    offers: {
      '@type': 'Offer',
      price: product.salePrice || product.price,
      priceCurrency: 'UAH',
      availability: Number(product.stock || 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${siteUrl}/products/${params.slug}`,
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +30 дней
      seller: {
        '@type': 'Organization',
        name: 'VINESENT'
      },
      ...(product.salePrice && product.salePrice < product.price ? {
        priceSpecification: {
          '@type': 'PriceSpecification',
          price: product.salePrice,
          priceCurrency: 'UAH'
        }
      } : {})
    },
    ...(product.categories && product.categories.length > 0 ? {
      category: product.categories[0].name
    } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.colors && product.colors.length > 0 ? {
      color: product.colors
    } : {})
  } : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <ProductClientPage product={product} allProducts={allProducts || []} />
    </>
  )
}

async function fetchAllProducts() {
  try {
    const res = await fetch(api('/products'), { next: { revalidate: 300 } })
    if (!res.ok) return []
    return await res.json()
  } catch {
    return []
  }
}
