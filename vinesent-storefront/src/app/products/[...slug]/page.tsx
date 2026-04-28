import type { Metadata } from 'next'
import { api } from '@/lib/api'
import { getFirstImage, getAllImages } from '@/lib/utils'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function resolveProductSlug(slug: string): Promise<any | null> {
  try {
    const res = await fetch(api('/products'), { cache: 'no-store' })
    if (!res.ok) return null
    const products = await res.json()
    if (!Array.isArray(products)) return null
    
    return products.find((p: any) => 
      p.slug === slug || 
      (p as any).fullSlug === slug ||
      `${(p as any).categorySlug}/${p.slug}` === slug ||
      `${(p as any).parentSlug}/${(p as any).categorySlug}/${p.slug}` === slug ||
      p.id === slug
    ) || null
  } catch {
    return null
  }
}

export async function generateMetadata(
  { params }: { params: { slug: string[] } }
): Promise<Metadata> {
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    'https://vinesent.com'
  ).replace(/\/+$/, '')

  const product = await resolveProductSlug(slug)

  if (!product) {
    return {
      title: 'Товар | VINESENT',
    }
  }

  const name = String(product.name || '')
  const seoTitle = product.seoTitle || null
  const catName = product.category?.name || product.categories?.[0]?.name || 'VINESENT'
  const finalTitle = seoTitle || `${name} | ${catName}`

  const firstImage = getFirstImage(product.images)
  const imageUrl = firstImage?.startsWith('http') ? firstImage : `${siteUrl}${firstImage || '/og-default.jpg'}`

  const parent = (product as any).parentSlug
  const cat = (product as any).categorySlug
  const prodSlug = product.slug
  
  let canonicalPath = `/products/${prodSlug}`
  if (parent && cat) canonicalPath = `/products/${parent}/${cat}/${prodSlug}`
  else if (cat) canonicalPath = `/products/${cat}/${prodSlug}`

  return {
    title: finalTitle,
    alternates: { canonical: `${siteUrl}${canonicalPath}` },
  }
}

export default async function ProductPage({ params }: { params: { slug: string[] } }) {
  const slug = Array.isArray(params.slug) ? params.slug.join('/') : params.slug
  const product = await resolveProductSlug(slug)
  
  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Товар не знайдено</h1>
        </div>
      </div>
    )
  }
  
  const parent = (product as any).parentSlug
  const cat = (product as any).categorySlug
  const prodSlug = product.slug
  
  let canonicalPath = `/products/${prodSlug}`
  if (parent && cat) canonicalPath = `/products/${parent}/${cat}/${prodSlug}`
  else if (cat) canonicalPath = `/products/${cat}/${prodSlug}`

  const requestPath = Array.isArray(params.slug) ? params.slug.join('/') : params.slug
  if (requestPath !== canonicalPath.replace('/products/', '')) {
    redirect(canonicalPath)
  }

  const { default: ProductClientPage } = await import('../ProductClient')
  return <ProductClientPage params={{ slug: prodSlug }} />
}