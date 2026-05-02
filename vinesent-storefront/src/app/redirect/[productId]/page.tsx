import { api } from '@/lib/api'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

async function getRedirectPath(productId: string): Promise<string | null> {
  try {
    const res = await fetch(api(`/products/${productId}`), { next: { revalidate: 300 } })
    if (!res.ok) return null
    const product = await res.json()
    if (!product?.slug) return null
    
    const parent = (product as any).parentSlug
    const cat = (product as any).categorySlug
    const slug = product.slug
    
    if (parent && cat) return `/products/${parent}/${cat}/${slug}`
    if (cat) return `/products/${cat}/${slug}`
    return `/products/${slug}`
  } catch {
    return null
  }
}

export default async function RedirectPage({ params }: { params: { productId: string } }) {
  const path = await getRedirectPath(params.productId)
  
  if (!path) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Товар не знайдено</h1>
          <p className="text-gray-500">Цей товар був видалений або більше не доступний</p>
        </div>
      </div>
    )
  }
  
  redirect(path)
}