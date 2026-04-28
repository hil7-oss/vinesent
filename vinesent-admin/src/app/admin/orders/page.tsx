'use client'
import Link from 'next/link'
import { useEffect, useState, useCallback } from 'react'
import { formatPrice } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const API_BASE = '/api/fastapi'

type OrderItem = { productId: string; quantity: number; price: number; name?: string; slug?: string; image?: string | null; size?: string; color?: string }
type Order = {
  id: string; total: number; status: string; createdAt: string; paymentMethod?: string;
  customerFirstName?: string; customerLastName?: string; customerPhone?: string; customerEmail?: string;
  deliveryMethod?: string; deliveryCity?: string; deliveryBranch?: string; deliveryAddress?: string;
  items?: OrderItem[]
}

const STATUS = {
  PENDING:   { label: 'Очікує',       dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700 border-amber-200',     track: 1 },
  CONFIRMED: { label: 'Підтверджено', dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 border-blue-200',        track: 2 },
  SHIPPED:   { label: 'Відправлено',  dot: 'bg-purple-500',  pill: 'bg-purple-50 text-purple-700 border-purple-200',  track: 3 },
  DELIVERED: { label: 'Доставлено',   dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', track: 4 },
  CANCELLED: { label: 'Скасовано',    dot: 'bg-red-400',     pill: 'bg-red-50 text-red-500 border-red-200',           track: 0 },
} as const
type OrderStatus = keyof typeof STATUS
const STATUS_ORDER: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED']
const STATUS_CYCLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED']

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}
const fmtDateLong = (d: string) => {
  try { return new Date(d).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}
const norm = (s: string): OrderStatus => {
  const u = String(s || '').toUpperCase()
  return u in STATUS ? u as OrderStatus : 'PENDING'
}
const nextStatus = (s: string): OrderStatus => {
  const cur = norm(s)
  if (cur === 'CANCELLED') return cur
  const idx = STATUS_CYCLE.indexOf(cur)
  return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length] || 'PENDING'
}

// ── Status badge ─────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const st = STATUS[norm(status)]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border whitespace-nowrap ${st.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
      {st.label}
    </span>
  )
}

// ── Status cycle (click to advance) ──────────
function StatusCycle({ status, onCycle, onCancel }: {
  status: string; onCycle: () => void; onCancel: () => void
}) {
  const key = norm(status)
  const st = STATUS[key]
  const isDone = key === 'DELIVERED'
  const isCancelled = key === 'CANCELLED'

  return (
    <div className="flex items-center gap-1">
      <button
        type="button" onClick={onCycle} disabled={isCancelled || isDone}
        title={isCancelled ? st.label : isDone ? st.label : `→ ${STATUS[nextStatus(status)].label}`}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-semibold border transition
          ${isCancelled || isDone
            ? `${st.pill} opacity-70 cursor-default`
            : `${st.pill} hover:opacity-80 active:scale-95 cursor-pointer`
          }`}>
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${st.dot}`} />
        {st.label}
        {!isCancelled && !isDone && (
          <svg className="w-3 h-3 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
        )}
      </button>
      {!isCancelled && (
        <button
          type="button" onClick={onCancel}
          title="Скасувати"
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
      {isCancelled && (
        <button
          type="button" onClick={() => onCycle()}
          title="Відновити"
          className="w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-200 transition flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/></svg>
        </button>
      )}
    </div>
  )
}

const getImageUrl = (img: any | null) => {
  if (!img) return null;
  let path = '';
  if (typeof img === 'string') {
    if (img.startsWith('[') || img.startsWith('{')) {
      try {
        const parsed = JSON.parse(img);
        path = Array.isArray(parsed) ? (parsed[0] || '') : (parsed?.url || parsed || '');
      } catch {
        path = img;
      }
    } else {
      path = img;
    }
  } else if (Array.isArray(img)) {
    path = img[0] || '';
  } else if (typeof img === 'object') {
    path = img.url || img.path || '';
  }

  if (!path || typeof path !== 'string') return null;
  if (path.startsWith('http')) return path;
  if (path.startsWith('/uploads/')) return path; 
  if (path.startsWith('uploads/')) return `/${path}`;
  return `/uploads/${path}`;
}

// ── Order thumbnail strip ─────────────────────
function ItemsStrip({ items }: { items?: OrderItem[] }) {
  if (!items || items.length === 0) return <span className="text-[11px] text-gray-300">—</span>
  const show = items.slice(0, 3)
  const rest = items.length - 3
  return (
    <div className="flex items-center gap-1.5">
      {show.map((it, i) => {
        const imgUrl = getImageUrl(it.image || null)
        return (
          <div key={i} title={it.name || it.productId} className="w-9 h-11 rounded-md overflow-hidden bg-gray-100 border border-black/5 flex-shrink-0 relative group">
            {imgUrl
              ? <img src={imgUrl} alt={it.name || ''} className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-[9px] text-gray-400 font-mono text-center p-0.5 leading-tight">{it.name?.slice(0,4) || '?'}</div>
            }
          </div>
        )
      })}
      {rest > 0 && (
        <div className="w-9 h-11 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">+{rest}</div>
      )}
    </div>
  )
}

// ── Order detail sheet ────────────────────────
function OrderSheet({ order, onClose, onStatusChange }: {
  order: Order; onClose: () => void; onStatusChange: (id: string, s: OrderStatus) => void
}) {
  const key = norm(order.status)
  const trackStep = STATUS[key].track

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px]">
      <div className="bg-white w-full sm:max-w-lg sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <div className="text-[15px] font-bold text-gray-900">Замовлення #{order.id.slice(0, 8)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">{fmtDateLong(order.createdAt)}</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* total */}
          <div className="bg-gray-950 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Сума</div>
              <div className="text-[28px] font-black text-white leading-none">{formatPrice(order.total)}</div>
            </div>
            {order.paymentMethod && (
              <div className="bg-white/10 px-3 py-1.5 rounded-xl text-[11px] font-semibold text-white/60 uppercase tracking-wide">
                {order.paymentMethod === 'CASH' ? '💵 Готівка' : order.paymentMethod}
              </div>
            )}
          </div>

          {/* progress track */}
          {key !== 'CANCELLED' && (
            <div className="bg-gray-50 rounded-2xl p-4">
              <div className="flex items-center gap-0">
                {STATUS_CYCLE.map((s, i) => {
                  const st = STATUS[s]
                  const done = st.track <= trackStep
                  const active = st.track === trackStep
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <button
                        onClick={() => onStatusChange(order.id, s)}
                        className="flex flex-col items-center gap-1 flex-shrink-0 group"
                        title={`Поставити: ${st.label}`}>
                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition
                          ${active ? `border-current ${st.pill.split(' ')[1]} ${st.pill.split(' ')[0]} scale-110`
                            : done ? 'border-emerald-400 bg-emerald-50'
                            : 'border-gray-200 bg-white group-hover:border-gray-400'}`}>
                          {done && !active
                            ? <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7"/></svg>
                            : <span className={`w-2 h-2 rounded-full ${active ? st.dot : done ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                          }
                        </div>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide leading-tight text-center w-14 ${active ? 'text-gray-800' : done ? 'text-emerald-600' : 'text-gray-400'}`}>
                          {st.label}
                        </span>
                      </button>
                      {i < STATUS_CYCLE.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 mx-0.5 ${st.track < trackStep ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* status controls */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Управління статусом</div>
            <StatusCycle
              status={order.status}
              onCycle={() => onStatusChange(order.id, nextStatus(order.status))}
              onCancel={() => onStatusChange(order.id, 'CANCELLED')}
            />
            {key === 'CANCELLED' && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {STATUS_CYCLE.map(s => {
                  const st = STATUS[s]
                  return (
                    <button key={s} onClick={() => onStatusChange(order.id, s)}
                      className={`h-8 px-3 rounded-lg text-[11px] font-semibold border transition ${st.pill} hover:opacity-80`}>
                      {st.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* customer */}
          {(order.customerFirstName || order.customerLastName || order.customerPhone || order.customerEmail || order.deliveryAddress || order.deliveryCity || order.deliveryBranch) && (
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Покупець та доставка</div>
              {(order.customerFirstName || order.customerLastName) && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/></svg>
                  <span className="text-[13px] font-semibold text-gray-800">{[order.customerFirstName, order.customerLastName].filter(Boolean).join(' ')}</span>
                </div>
              )}
              {order.customerPhone && (
                <a href={`tel:${order.customerPhone}`} className="flex items-center gap-2 group">
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 012 2.18 2 2 0 014 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/></svg>
                  <span className="text-[13px] text-blue-600 group-hover:underline">{order.customerPhone}</span>
                </a>
              )}
              {order.customerEmail && (
                <a href={`mailto:${order.customerEmail}`} className="flex items-center gap-2 group">
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16v10H4z"/><path d="M4 7l8 6 8-6" strokeLinejoin="round"/></svg>
                  <span className="text-[13px] text-blue-600 group-hover:underline">{order.customerEmail}</span>
                </a>
              )}
              {order.deliveryMethod && (
                <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                  <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 18a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/></svg>
                  <div className="flex-1">
                    <div className="text-[11px] font-semibold text-gray-700 uppercase tracking-wide">{order.deliveryMethod}</div>
                    {order.deliveryCity && <div className="text-[12px] text-gray-600 mt-0.5">{order.deliveryCity}</div>}
                    {order.deliveryBranch && <div className="text-[12px] text-gray-600">{order.deliveryBranch}</div>}
                    {order.deliveryAddress && <div className="text-[12px] text-gray-600">{order.deliveryAddress}</div>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* items */}
          {order.items && order.items.length > 0 && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Товари ({order.items.length})</div>
              <div className="space-y-2">
                {order.items.map((it, i) => {
                  const imgUrl = getImageUrl(it.image);
                  return (
                    <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-12 rounded-lg overflow-hidden bg-white border border-black/5 flex-shrink-0">
                          {imgUrl
                            ? <img src={imgUrl} alt={it.name || ''} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
                          }
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-gray-800 truncate">
                            {it.slug
                              ? <Link href={`/products/${it.slug}`} className="hover:underline">{it.name || it.productId.slice(0, 8)}</Link>
                              : (it.name || it.productId.slice(0, 8))
                            }
                          </div>
                          <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                            {it.size && <span>{it.size}</span>}
                            {it.size && it.color && <span>·</span>}
                            {it.color && <span>{it.color}</span>}
                            <span>·</span><span>×{it.quantity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[14px] font-bold text-gray-900 ml-3 flex-shrink-0">{formatPrice(it.price * it.quantity)}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Mobile card ───────────────────────────────
function OrderCard({ order, onClick }: { order: Order; onClick: () => void }) {
  const customerName = [order.customerFirstName, order.customerLastName].filter(Boolean).join(' ')
  return (
    <button onClick={onClick} className="w-full bg-white rounded-2xl border border-gray-100 p-4 text-left active:bg-gray-50 transition">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-gray-400">#{order.id.slice(0, 8)}</span>
            <StatusBadge status={order.status} />
          </div>
          {/* items strip on mobile */}
          {order.items && order.items.length > 0 && (
            <div className="mb-2">
              <ItemsStrip items={order.items} />
            </div>
          )}
          <div className="text-[20px] font-black text-gray-900 leading-none">{formatPrice(order.total)}</div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[11px] text-gray-400">{fmtDate(order.createdAt)}</span>
            {customerName && <><span className="text-gray-200">·</span><span className="text-[12px] text-gray-600 font-medium">{customerName}</span></>}
          </div>
        </div>
        <svg className="w-4 h-4 text-gray-300 flex-shrink-0 mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
      </div>
    </button>
  )
}

// ── Main page ─────────────────────────────────
export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Order | null>(null)
  const [filterStatus, setFilterStatus] = useState<'ALL' | OrderStatus>('ALL')

  const fetchOrders = useCallback(async () => {
    const res = await fetch(`${API_BASE}/api/v1/orders`)
    const data = res.ok ? await res.json() : []
    setOrders(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const next = norm(status)
    setOrders(p => p.map(o => o.id === orderId ? { ...o, status: next } : o))
    setSelected(p => p?.id === orderId ? { ...p, status: next } : p)
    try {
      const res = await fetch(`${API_BASE}/api/v1/orders/${orderId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next }) })
      if (!res.ok) await fetchOrders()
    } catch { await fetchOrders() }
  }

  const filtered = filterStatus === 'ALL' ? orders : orders.filter(o => norm(o.status) === filterStatus)
  const revenue = orders.filter(o => ['PAID','CONFIRMED','SHIPPED','DELIVERED'].includes(String(o.status||'').toUpperCase())).reduce((s, o) => s + Number(o.total || 0), 0)
  const pending = orders.filter(o => norm(o.status) === 'PENDING').length

  return (
    <div className="min-h-screen bg-[#f5f5f3]">

      {/* top bar */}
      <div className="sticky top-14 lg:top-0 z-20 bg-[#f5f5f3]/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="flex items-center justify-between px-4 lg:px-8 h-14">
          <h1 className="text-[16px] font-bold text-gray-900 lg:text-[18px]">Замовлення</h1>
          <div className="flex items-center gap-2">
            {pending > 0 && <span className="h-7 px-2.5 bg-amber-100 text-amber-700 text-[11px] font-bold rounded-lg flex items-center">{pending} нових</span>}
            <span className="h-7 px-2.5 bg-white border border-gray-100 text-gray-500 text-[11px] font-medium rounded-lg flex items-center">{orders.length} всього</span>
          </div>
        </div>
      </div>

      <div className="px-4 lg:px-8 py-5 pb-24 lg:pb-8 max-w-5xl mx-auto space-y-4">

        {/* summary strip */}
        {!loading && orders.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-950 rounded-2xl p-4 col-span-2 sm:col-span-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">Загальний дохід</div>
              <div className="text-[20px] font-black text-white leading-none">{formatPrice(revenue)}</div>
            </div>
            {STATUS_ORDER.slice(0, 3).map(key => {
              const st = STATUS[key]
              const count = orders.filter(o => norm(o.status) === key).length
              return (
                <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'ALL' : key)}
                  className={`rounded-2xl p-4 text-left transition border ${filterStatus === key ? `${st.pill} border-current` : 'bg-white border-gray-100 hover:border-gray-200'}`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{st.label}</span>
                  </div>
                  <div className="text-[22px] font-black leading-none text-gray-900">{count}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* filter tabs */}
        {!loading && orders.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <button onClick={() => setFilterStatus('ALL')}
              className={`h-8 px-3 rounded-lg text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition ${filterStatus === 'ALL' ? 'bg-gray-950 text-white' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
              Всі ({orders.length})
            </button>
            {STATUS_ORDER.map(key => {
              const count = orders.filter(o => norm(o.status) === key).length
              if (count === 0) return null
              const st = STATUS[key]
              return (
                <button key={key} onClick={() => setFilterStatus(filterStatus === key ? 'ALL' : key)}
                  className={`h-8 px-3 rounded-lg text-[11px] font-bold whitespace-nowrap flex-shrink-0 transition border flex items-center gap-1.5 ${filterStatus === key ? `${st.pill} border-current` : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${filterStatus === key ? st.dot : 'bg-gray-300'}`} />
                  {st.label} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* loading */}
        {loading && <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="animate-pulse h-24 bg-white rounded-2xl border border-gray-100" />)}</div>}

        {/* empty */}
        {!loading && orders.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <div className="text-[14px] font-semibold text-gray-700 mb-1">Замовлень поки немає</div>
            <div className="text-[12px] text-gray-400">Вони з'являться тут після перших продажів</div>
          </div>
        )}

        {/* MOBILE cards */}
        {!loading && filtered.length > 0 && (
          <div className="lg:hidden space-y-2.5">
            {filtered.map(o => <OrderCard key={o.id} order={o} onClick={() => setSelected(o)} />)}
          </div>
        )}

        {/* DESKTOP table */}
        {!loading && filtered.length > 0 && (
          <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  {['Товари', 'Покупець', 'Дата', 'Сума', 'Статус', ''].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 px-4 py-3.5">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition group">
                    {/* items column */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <ItemsStrip items={o.items} />
                        <div className="min-w-0">
                          <div className="text-[11px] font-mono text-gray-400">#{o.id.slice(0, 6)}</div>
                          {o.items && o.items.length > 0 && (
                            <div className="text-[11px] text-gray-500 truncate max-w-[120px]">
                              {o.items.map(it => it.name || '?').join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* customer */}
                    <td className="px-4 py-3">
                      <div className="text-[13px] font-semibold text-gray-800">{[o.customerFirstName, o.customerLastName].filter(Boolean).join(' ') || '—'}</div>
                      {o.customerPhone && <div className="text-[11px] text-gray-400">{o.customerPhone}</div>}
                      {o.deliveryCity && <div className="text-[10px] text-gray-400 truncate max-w-[160px]">{o.deliveryCity}{o.deliveryBranch ? `, ${o.deliveryBranch}` : ''}</div>}
                    </td>
                    {/* date */}
                    <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    {/* total */}
                    <td className="px-4 py-3 text-[15px] font-black text-gray-900 whitespace-nowrap">{formatPrice(o.total)}</td>
                    {/* status */}
                    <td className="px-4 py-3">
                      <StatusCycle
                        status={o.status}
                        onCycle={() => updateStatus(o.id, nextStatus(o.status))}
                        onCancel={() => updateStatus(o.id, 'CANCELLED')}
                      />
                    </td>
                    {/* detail */}
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(o)}
                        className="h-8 px-3 rounded-lg text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-600 transition opacity-0 group-hover:opacity-100 whitespace-nowrap">
                        Деталі →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <OrderSheet order={selected} onClose={() => setSelected(null)} onStatusChange={updateStatus} />
      )}
    </div>
  )
}