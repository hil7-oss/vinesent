'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice } from '@/lib/utils'
import Link from 'next/link'

export default function ProductClientPage({ params }: { params: { slug: string } }) {
  const [product, setProduct]: any = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(api('/products'), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : [])
      .then(list => {
        const p = list?.find((x: any) => x.slug === params.slug || x.id === params.slug)
        setProduct(p)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.slug])

  if (loading) return <div className="flex items-center justify-center min-h-screen">Загрузка...</div>
  if (!product) return <div className="flex items-center justify-center min-h-screen">Товар не знайдено</div>

  const images = (() => {
    try { return JSON.parse(product.images || '[]') } catch { return [] }
  })()
  const mainImg = images[0] || ''

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Link href="/" className="text-sm text-gray-500 hover:text-black mb-4 inline-block">← На главную</Link>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
          <div className="space-y-4">
            {mainImg && (
              <img src={mainImg} alt={product.name} className="w-full aspect-[2/3] object-cover rounded-lg" />
            )}
          </div>
          
          <div>
            <h1 className="text-2xl font-bold mb-2">{product.name}</h1>
            <div className="flex items-center gap-3 mb-4">
              {product.salePrice ? (
                <>
                  <span className="text-xl font-bold text-red-600">{formatPrice(product.salePrice)}</span>
                  <span className="text-gray-400 line-through">{formatPrice(product.price)}</span>
                </>
              ) : (
                <span className="text-xl font-bold">{formatPrice(product.price)}</span>
              )}
            </div>
            {product.description && <p className="text-gray-600 mb-4">{product.description}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}