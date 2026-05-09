'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'
import { formatPrice, getAllImages } from '@/lib/utils'
import Link from 'next/link'
import ProductCard from '@/components/product/ProductCard'
import RecommendationSection from '@/components/product/RecommendationSection'

export default function ProductClientPage({ params }: { params: { slug: string } }) {
  const [product, setProduct]: any = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedColor, setSelectedColor] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState('description')
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [fav, setFav] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch(api('/products'), { cache: 'no-store' }).then(r => r.ok ? r.json() : []),
    ]).then(([products]) => {
      setAllProducts(products)
      const p = products?.find((x: any) => x.slug === params.slug || x.id === params.slug)
      setProduct(p)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [params.slug])

  useEffect(() => {
    if (product?.variants && product.variants.length > 0 && !selectedSize) {
      setSelectedSize(product.variants[0].size)
    }
    if (product) {
      try {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]')
        setFav(favs.some((f: any) => f.id === product.id))
      } catch {}
    }
  }, [product])

  if (loading) return <div className="flex items-center justify-center min-h-screen">Завантаження</div>
  if (!product) return <div className="flex items-center justify-center min-h-screen">Товар не знайдено</div>

  const images = getAllImages(product.images)
  const mainImg = images[selectedImage] || images[0] || ''

  const variants = product.variants || []
  const sizes = [new Set(variants.map((v: any) => v.size))].sort()
  const colors = product.colors || []

  const availableStock = variants
    .filter((v: any) => v.size === selectedSize)
    .reduce((sum: number, v: any) => sum + (v.stock || 0), 0)

  const relatedProducts = allProducts
    .filter((p: any) => p.id !== product.id && p.categoryId === product.categoryId && p.stock > 0)
    .slice(0, 8)

  const toggleFav = () => {
    try {
      const raw = localStorage.getItem('favorites') || '[]'
      let favs = JSON.parse(raw)
      if (favs.some((f: any) => f.id === product.id)) {
        favs = favs.filter((f: any) => f.id !== product.id)
        setFav(false)
      } else {
        favs.push({ id: product.id, slug: product.slug, name: product.name, price: product.price, images: product.images })
        setFav(true)
      }
      localStorage.setItem('favorites', JSON.stringify(favs))
      window.dispatchEvent(new Event('favoritesChanged'))
    } catch {}
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <nav className="text-xs text-gray-400 mb-6 flex gap-1">
          <Link href="/" className="hover:text-gray-600">Головна</Link>
          <span>/</span>
          <Link href="/menu" className="hover:text-gray-600">Каталог</Link>
          <span>/</span>
          <span className="text-gray-600">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery */}
          <div className="flex flex-col-reverse lg:flex-row gap-3">
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:w-20 lg:flex-shrink-0">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-16 h-20 lg:w-full lg:h-24 rounded overflow-hidden border-2 transition ${
                      selectedImage === idx ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main Image */}
            <div className="flex-1 aspect-[3/4] rounded-lg overflow-hidden bg-gray-50">
              {mainImg && (
                <img src={mainImg} alt={product.name} className="w-full h-full object-cover" />
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <h1 className="text-2xl lg:text-3xl font-bold uppercase mb-3">{product.name}</h1>
            
            {/* Price */}
            <div className="flex items-center gap-3 mb-6">
              {product.salePrice ? (
                <>
                  <span className="text-3xl font-bold text-red-600">{formatPrice(product.salePrice)}</span>
                  <span className="text-xl text-gray-400 line-through">{formatPrice(product.price)}</span>
                </>
              ) : (
                <span className="text-3xl font-bold">{formatPrice(product.price)}</span>
              )}
            </div>

            {/* Colors */}
            {colors.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Колір: {colors[selectedColor]}</p>
                <div className="flex gap-2">
                  {colors.map((color: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(idx)}
                      className={`w-10 h-10 rounded-full border-2 transition ${
                        selectedColor === idx ? 'border-black scale-110' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.toLowerCase().startsWith('#') ? color : undefined }}
                      title={color}
                    >
                      {!color.toLowerCase().startsWith('#') && (
                        <span className="text-xs">{color.charAt(0)}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-2">Розмір: {selectedSize}</p>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size: any) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[48px] h-10 px-3 rounded-md border-2 text-sm font-medium transition ${
                        selectedSize === size
                          ? 'border-black bg-black text-white'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Кількість</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center border border-gray-200 rounded-md">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black transition"
                  >
                    −
                  </button>
                  <span className="w-10 h-10 flex items-center justify-center font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(availableStock || 99, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-black transition"
                  >
                    +
                  </button>
                </div>
                {availableStock > 0 && (
                  <span className="text-sm text-green-600">В наявності: {availableStock} шт</span>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mb-8">
              <button className="flex-1 h-12 bg-black text-white font-medium rounded-md hover:bg-gray-800 transition">
                Купити
              </button>
              <button
                onClick={toggleFav}
                className={`h-12 w-12 flex items-center justify-center border-2 rounded-md transition ${
                  fav ? 'border-red-500 text-red-500' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill={fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 20.5l-1.45-1.32C6.4 15.36 4 13.28 4 10.5 4 8.42 5.57 7 7.5 7c1.11 0 2.2.5 2.9 1.33C11.3 7.5 12.39 7 13.5 7 15.43 7 17 8.42 17 10.5c0 2.78-2.4 4.86-6.55 8.68L12 20.5z"/>
                </svg>
              </button>
            </div>

            {/* Description */}
            {product.description && (
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-lg font-bold mb-2">Опис</h3>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12 border-t border-gray-100">
          <div className="flex gap-6 border-b border-gray-100">
            {[
              { key: 'description', label: 'Опис' },
              { key: 'specs', label: 'Характеристика' },
              { key: 'reviews', label: 'Відгуки' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 text-sm font-medium border-b-2 transition ${
                  activeTab === tab.key
                    ? 'border-black text-black'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="py-8">
            {activeTab === 'description' && (
              <p className="text-gray-600 text-sm leading-relaxed max-w-3xl whitespace-pre-line">{product.description || 'Опис відсутній'}</p>
            )}
            {activeTab === 'specs' && (
              <div className="max-w-3xl">
                {product.measurements && typeof product.measurements === 'object' ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 font-medium text-gray-500">Розмір</th>
                        <th className="text-left py-3 font-medium text-gray-500">Груди</th>
                        <th className="text-left py-3 font-medium text-gray-500">Талія</th>
                        <th className="text-left py-3 font-medium text-gray-500">Стегна</th>
                        <th className="text-left py-3 font-medium text-gray-500">Довжина</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(product.measurements).map(([size, m]: [string, any]) => (
                        <tr key={size} className="border-b border-gray-50">
                          <td className="py-3 font-medium">{size}</td>
                          <td className="py-3">{m.chest || '—'}</td>
                          <td className="py-3">{m.waist || '—'}</td>
                          <td className="py-3">{m.hips || '—'}</td>
                          <td className="py-3">{m.length || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-400 text-sm">Характеристики відсутні</p>
                )}
              </div>
            )}
            {activeTab === 'reviews' && (
              <p className="text-gray-400 text-sm">Відгуків поки немає</p>
            )}
          </div>
        </div>

        {/* Recommended Products */}
        {relatedProducts.length > 0 && (
          <RecommendationSection
            title="Вам також може сподобатись"
            products={relatedProducts}
          />
        )}
      </div>
    </div>
  )
}
