import Link from 'next/link'
import { api } from '@/lib/api'
import ProductCard from '@/components/product/ProductCard'

async function getContent() {
  const res = await fetch(api('/content/home'), { next: { revalidate: 3600 } }).catch(() => null)
  return res?.ok ? await res.json() : []
}

export default async function CollectionPage({ params }: { params: { key: string } }) {
  const content = await getContent()
  const productMap = new Map((content?.products || []).map((p: any) => [p.id, p]))
  const col = (content?.collections || []).find((c: any) => (c.key || '').toUpperCase() === (params.key || '').toUpperCase())
  const items = col ? (col.productIds || []).map((id: string) => productMap.get(id)).filter(Boolean) : []

  return (
    <div className="mx-auto">
      <div className="flex items-center justify-between mb-6 lg:mb-10">
        <h1 className="text-[24px] lg:text-[36px] font-bold uppercase" style={{ fontFamily: 'var(--font-brand)' }}>{col?.title || col?.key || params.key}</h1>
        <Link href="/menu" className="flex items-center gap-2 text-[13px] font-medium hover:opacity-60 transition">Каталог</Link>
      </div>
      {items.length === 0 ? (
        <div className="text-center py-20 text-[14px] text-gray-500">Товарів поки немає</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-[6px] gap-y-[6px] md:gap-x-[8px] md:gap-y-[8px] lg:gap-x-[8px] lg:gap-y-[8px]">
          {items.map((p: any) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
