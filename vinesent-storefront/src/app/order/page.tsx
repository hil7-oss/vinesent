'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'
import { API_BASE } from '@/lib/api'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

type Step = 'data' | 'delivery' | 'payment' | 'success'

const NP_API_KEY = process.env.NEXT_PUBLIC_NP_API_KEY || process.env.NEXT_PUBLIC_NOVA_POSHTA_API_KEY || ''

export default function OrderPage() {
  const [step, setStep] = useState<Step>('data')
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string>('')
  const [pickupLocations, setPickupLocations] = useState<Array<{ id: string; name: string; address?: string | null; city?: string | null; mapsUrl?: string | null }>>([])
  const [pickupLocationId, setPickupLocationId] = useState<string>('')
  const npCityRootRef = useRef<HTMLDivElement | null>(null)
  const npWarehouseRootRef = useRef<HTMLDivElement | null>(null)

  const [isNewCustomer, setIsNewCustomer] = useState(true)
  const [form, setForm] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    deliveryMethod: 'nova_branch',
    city: '', branch: '', address: '',
    paymentMethod: 'card',
  })

  useEffect(() => {
    const fetchCart = async () => {
      try {
        const localCart: Array<{ productId: string; quantity: number; price?: number }> =
          JSON.parse(localStorage.getItem('localCart') || '[]')
        const prodRes = await fetch(`${API_BASE}/products`, { cache: 'no-store' })
        const products = prodRes.ok ? await prodRes.json() : []
        const mapped = localCart.map(i => {
          const p = products.find((x: any) => x.id === i.productId)
          const basePrice = Number(p?.price) || 0
          const sp = Number(p?.salePrice)
          const hasSale = !!p && Number.isFinite(sp) && sp > 0 && sp < basePrice
          const unitPrice = hasSale ? sp : (basePrice || Number(i.price) || 0)
          return { ...i, price: unitPrice, originalPrice: hasSale ? basePrice : undefined, hasSale, product: p }
        })
        setItems(mapped)
      } finally {
        setLoading(false)
      }
    }
    fetchCart()
  }, [])

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const user = data?.user
        if (!user) return
        
        const email = String(user.email || '').trim()
        const firstName = String(user.firstName || '').trim()
        const lastName = String(user.lastName || '').trim()
        const phone = String(user.phone || '').trim()
        
        if (email) setUserEmail(email)
        setForm(prev => ({
          ...prev,
          email: email || prev.email,
          firstName: firstName || prev.firstName,
          lastName: lastName || prev.lastName,
          phone: phone || prev.phone,
        }))
      } catch {}
    }
    fetchMe()
  }, [])

  useEffect(() => {
    const fetchPickup = async () => {
      try {
        const res = await fetch(`${API_BASE}/stores`, { cache: 'no-store' })
        const data = res.ok ? await res.json() : []
        const arr = Array.isArray(data) ? data : []
        setPickupLocations(arr)
        if (!pickupLocationId && arr.length > 0) setPickupLocationId(String(arr[0].id))
      } catch {}
    }
    fetchPickup()
  }, [pickupLocationId])

  const total = items.reduce((sum: number, i: any) => sum + (i.price * i.quantity), 0)

  const updateField = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (!NP_API_KEY) return
    if (step !== 'delivery') return
    if (form.deliveryMethod !== 'nova_branch') return
    const cityRoot = npCityRootRef.current
    const whRoot = npWarehouseRootRef.current
    if (!cityRoot || !whRoot) return

    cityRoot.innerHTML = ''
    whRoot.innerHTML = ''

    let active = true
    ;(async () => {
      try {
        const mod: any = await import('np-select')
        if (!active) return
        const NpCitySelect = mod?.NpCitySelect || mod?.default?.NpCitySelect
        const NpWarehouseSelect = mod?.NpWarehouseSelect || mod?.default?.NpWarehouseSelect || mod?.NpWarehoseSelect || mod?.default?.NpWarehoseSelect
        if (!NpCitySelect || !NpWarehouseSelect) return

        NpCitySelect({
          root: cityRoot,
          apiKey: NP_API_KEY,
          input: { name: 'city', placeholder: 'Оберіть місто' },
          button: { text: 'Місто' },
          onSelect: (item: any) => {
            const label = String(item?.label || item?.value || '').trim()
            if (label) {
              updateField('city', label)
              updateField('branch', '')
            }
          },
        })

        NpWarehouseSelect({
          root: whRoot,
          apiKey: NP_API_KEY,
          input: { name: 'warehouse', placeholder: 'Оберіть відділення' },
          button: { text: 'Відділення' },
          city: String(form.city || '').trim() || undefined,
          onSelect: (item: any) => {
            const label = String(item?.label || item?.value || '').trim()
            if (label) updateField('branch', label)
          },
        })
      } catch {}
    })()

    return () => {
      active = false
      try { cityRoot.innerHTML = '' } catch {}
      try { whRoot.innerHTML = '' } catch {}
    }
  }, [step, form.deliveryMethod, form.city])

  const normalizeEmail = (value: string) => value.trim()

  const validateEmail = (value: string) => {
    const v = normalizeEmail(value)
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v)
  }

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, '')
    let d = digits
    if (d.startsWith('380')) d = d.slice(3)
    if (d.startsWith('0')) d = d.slice(1)
    d = d.slice(0, 9)
    const a = d.slice(0, 2)
    const b = d.slice(2, 5)
    const c = d.slice(5, 7)
    const e = d.slice(7, 9)
    let out = '+380'
    if (a) out += ` (${a}`
    if (a && a.length === 2) out += ')'
    if (b) out += ` ${b}`
    if (c) out += ` ${c}`
    if (e) out += ` ${e}`
    return out
  }

  const normalizePhoneDigits = (value: string) => {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('380')) return '380' + digits.slice(3, 12)
    if (digits.startsWith('0')) return '380' + digits.slice(1, 10)
    if (digits.length === 9) return '380' + digits
    return digits.slice(0, 12)
  }

  const validateDataStep = (): { [k: string]: string } => {
    const errs: { [k: string]: string } = {}
    if (!form.firstName.trim()) errs.firstName = "Введіть ім'я"
    if (!form.lastName.trim()) errs.lastName = "Введіть прізвище"
    const phoneDigits = normalizePhoneDigits(form.phone)
    if (!phoneDigits || !/^380\d{9}$/.test(phoneDigits)) errs.phone = "Введіть коректний номер"
    const email = normalizeEmail(form.email)
    if (!email || !validateEmail(email)) errs.email = "Введіть коректний email"
    return errs
  }

  const validateDeliveryStep = (): { [k: string]: string } => {
    const errs: { [k: string]: string } = {}
    if (form.deliveryMethod === 'nova_branch' || form.deliveryMethod === 'nova_courier') {
      if (!form.city || !form.city.trim()) errs.city = "Оберіть місто"
    }
    if (form.deliveryMethod === 'nova_branch') {
      if (!form.branch || !form.branch.trim()) errs.branch = "Оберіть відділення"
    }
    if (form.deliveryMethod === 'nova_courier') {
      if (!form.address || !form.address.trim()) errs.address = "Введіть адресу"
    }
    return errs
  }

  const [errors, setErrors] = useState<{ [k: string]: string }>({})

  const placeOrder = async () => {
    if (items.length === 0) return
    const isOnlinePay = ['card', 'applepay', 'googlepay'].includes(form.paymentMethod)
    const body = {
      items: items.map((i: any) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
      paymentMethod: isOnlinePay ? 'CARD' : 'CASH',
      customer: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: normalizePhoneDigits(form.phone),
        email: normalizeEmail(form.email),
      },
      delivery: {
        method: form.deliveryMethod,
        city: form.city.trim(),
        branch: form.branch.trim(),
        address: form.address.trim(),
        pickupLocationId: form.deliveryMethod === 'pickup' ? pickupLocationId : '',
      },
    }
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const order = await res.json().catch(() => null as any)
      
      if (userEmail) {
        try {
          await fetch(`${API_BASE}/auth/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              firstName: form.firstName.trim(),
              lastName: form.lastName.trim(),
              phone: normalizePhoneDigits(form.phone),
            }),
          })
        } catch {}
      }
      
      if (!isOnlinePay) {
        try {
          localStorage.setItem('localCart', '[]')
          window.dispatchEvent(new Event('cartChanged'))
        } catch {}
        setItems([])
      }
      if (order?.id && isOnlinePay) {
        router.push(`/checkout/${encodeURIComponent(order.id)}/liqpay`)
      } else {
        setStep('success')
      }
    }
  }

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'data', label: 'Дані', num: 1 },
    { key: 'delivery', label: 'Доставка', num: 2 },
    { key: 'payment', label: 'Оплата', num: 3 },
  ]

  if (step === 'success') {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="10"/></svg>
        </div>
        <h1 className="text-[24px] font-bold uppercase mb-3" style={{ fontFamily: 'var(--font-brand)' }}>Дякуємо!</h1>
        <p className="text-[16px] text-gray-600 mb-2">Замовлення успішно створено</p>
        <p className="text-[14px] text-gray-400 mb-8">Ми зв'яжемося з вами найближчим часом</p>
        <Link href="/" className="inline-block bg-[#111] text-white text-[13px] font-semibold uppercase px-8 py-3 rounded-full hover:bg-black/80 transition">
          На головну
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <h1 className="text-[20px] lg:text-[28px] font-bold uppercase mb-6" style={{ fontFamily: 'var(--font-brand)' }}>Оформлення</h1>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <button
              onClick={() => { if (steps.findIndex(x => x.key === step) >= i) setStep(s.key) }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold transition ${
                step === s.key ? 'bg-[#111] text-white' :
                steps.findIndex(x => x.key === step) > i ? 'bg-green-600 text-white' :
                'bg-gray-200 text-gray-500'
              }`}
            >{s.num}</button>
            <span className={`text-[13px] font-medium ${step === s.key ? 'text-[#111]' : 'text-gray-400'}`}>{s.label}</span>
            {i < steps.length - 1 && <div className="w-8 lg:w-16 h-[1px] bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2">
          {/* Step 1: User Data */}
          {step === 'data' && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <button onClick={() => setIsNewCustomer(true)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition ${isNewCustomer ? 'bg-[#111] text-white' : 'border border-black/15'}`}>Новий покупець</button>
                <button onClick={() => setIsNewCustomer(false)} className={`px-5 py-2.5 rounded-full text-[13px] font-medium transition ${!isNewCustomer ? 'bg-[#111] text-white' : 'border border-black/15'}`}>Маю акаунт</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Ім'я</label>
                    <input value={form.firstName} onChange={e => updateField('firstName', e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[14px] outline-none transition ${errors.firstName ? 'border-red-400 focus:border-red-500' : 'border-black/15 focus:border-black/40'}`} placeholder="Ваше ім'я" />
                    {errors.firstName && <div className="mt-1 text-[11px] text-red-600">{errors.firstName}</div>}
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Прізвище</label>
                    <input value={form.lastName} onChange={e => updateField('lastName', e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[14px] outline-none transition ${errors.lastName ? 'border-red-400 focus:border-red-500' : 'border-black/15 focus:border-black/40'}`} placeholder="Ваше прізвище" />
                    {errors.lastName && <div className="mt-1 text-[11px] text-red-600">{errors.lastName}</div>}
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Телефон</label>
                  <input value={form.phone} onChange={e => updateField('phone', formatPhone(e.target.value))} className={`w-full h-12 px-4 rounded-xl border text-[14px] outline-none transition ${errors.phone ? 'border-red-400 focus:border-red-500' : 'border-black/15 focus:border-black/40'}`} placeholder="+380 (XX) XXX XX XX" inputMode="tel" />
                  {errors.phone && <div className="mt-1 text-[11px] text-red-600">{errors.phone}</div>}
                </div>
                <div>
                  <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} className={`w-full h-12 px-4 rounded-xl border text-[14px] outline-none transition ${errors.email ? 'border-red-400 focus:border-red-500' : 'border-black/15 focus:border-black/40'}`} placeholder="you@example.com" inputMode="email" />
                  {errors.email && <div className="mt-1 text-[11px] text-red-600">{errors.email}</div>}
                </div>
              </div>

              <button onClick={() => { const e = validateDataStep(); setErrors(e); if (Object.keys(e).length === 0) setStep('delivery') }} className="mt-8 w-full bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase hover:bg-black/80 transition">
                Далі
              </button>
            </div>
          )}

          {/* Step 2: Delivery */}
          {step === 'delivery' && (
            <div>
              <div className="space-y-3 mb-6">
                {[
                  { id: 'nova_branch', label: 'Нова Пошта - Відділення' },
                  { id: 'nova_courier', label: 'Нова Пошта - Кур\'єр' },
                  { id: 'pickup', label: 'Самовивіз' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateField('deliveryMethod', opt.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border transition ${form.deliveryMethod === opt.id ? 'border-[#111] bg-gray-50' : 'border-black/10 hover:border-black/30'}`}
                  >
                    <span className="w-6 h-6 flex items-center justify-center text-gray-500">
                      {opt.id === 'nova_branch' ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h18v10H3z"/><path d="M3 7l9 6 9-6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      ) : opt.id === 'nova_courier' ? (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 16V6h11v10H3z"/><path d="M14 10h4l3 3v3h-7v-6z"/><circle cx="7" cy="18" r="1.5"/><circle cx="18" cy="18" r="1.5"/></svg>
                      ) : (
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>
                      )}
                    </span>
                    <span className="text-[14px] font-medium">{opt.label}</span>
                    {form.deliveryMethod === opt.id && (
                      <svg className="w-5 h-5 ml-auto text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 12 2 2 4-4" strokeLinecap="round"/><circle cx="12" cy="12" r="10"/></svg>
                    )}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {(form.deliveryMethod === 'nova_branch' || form.deliveryMethod === 'nova_courier') && (
                  <div>
                    <label className={`block text-[12px] font-medium uppercase tracking-wide mb-1.5 transition-colors ${errors.city ? 'text-red-600' : ''}`}>Місто *</label>
                    {form.deliveryMethod === 'nova_branch' && NP_API_KEY ? (
                      <div ref={npCityRootRef} className={`np-select-root ${errors.city ? 'np-error' : ''}`} />
                    ) : (
                      <input value={form.city} onChange={e => { updateField('city', e.target.value); if(errors.city) setErrors(prev => ({...prev, city: ''})) }} className={`w-full h-12 px-4 rounded-xl border text-[14px] outline-none transition ${errors.city ? 'border-red-400 focus:border-red-500' : 'border-black/15 focus:border-black/40'}`} placeholder="Введіть місто" />
                    )}
                    {errors.city && <div className="mt-1 text-[11px] text-red-600">{errors.city}</div>}
                  </div>
                )}
                {form.deliveryMethod === 'nova_branch' && (
                  <div>
                    <label className={`block text-[12px] font-medium uppercase tracking-wide mb-1.5 transition-colors ${errors.branch ? 'text-red-600' : ''}`}>Відділення *</label>
                    {NP_API_KEY ? (
                      <div ref={npWarehouseRootRef} className={`np-select-root ${errors.branch ? 'np-error' : ''}`} />
                    ) : (
                      <input value={form.branch} onChange={e => { updateField('branch', e.target.value); if(errors.branch) setErrors(prev => ({...prev, branch: ''})) }} className={`w-full h-12 px-4 rounded-xl border text-[14px] outline-none transition ${errors.branch ? 'border-red-400 focus:border-red-500' : 'border-black/15 focus:border-black/40'}`} placeholder="Виберіть відділення" />
                    )}
                    {errors.branch && <div className="mt-1 text-[11px] text-red-600">{errors.branch}</div>}
                  </div>
                )}
                {form.deliveryMethod === 'nova_courier' && (
                  <div>
                    <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Адреса</label>
                    <input value={form.address} onChange={e => updateField('address', e.target.value)} className="w-full h-12 px-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition" placeholder="Вулиця, будинок, квартира" />
                  </div>
                )}
                {form.deliveryMethod === 'pickup' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[12px] font-medium uppercase tracking-wide mb-1.5">Місто / точка</label>
                      <select value={pickupLocationId} onChange={e => setPickupLocationId(e.target.value)} className="w-full h-12 px-4 rounded-xl border border-black/15 text-[14px] outline-none focus:border-black/40 transition bg-white">
                        {pickupLocations.map(l => (
                          <option key={l.id} value={l.id}>{[l.city, l.name].filter(Boolean).join(' — ')}</option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const loc = pickupLocations.find(x => String(x.id) === String(pickupLocationId))
                      const address = loc?.address || 'проспект Київ Василя Порика, 2, Україна, 02000'
                      const mapsUrl = loc?.mapsUrl || 'https://maps.app.goo.gl/bfygmdMtt7XciqvU9'
                      return (
                        <div className="rounded-xl border border-black/10 bg-gray-50 p-4">
                          <div className="text-[12px] font-semibold text-gray-800 mb-1">{loc?.name || 'Самовивіз'}</div>
                          <div className="text-[12px] text-gray-600">{address}</div>
                          <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex mt-2 text-[12px] text-blue-600 hover:underline">
                            Відкрити в Google Maps →
                          </a>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => { setErrors({}); setStep('data') }} className="flex-1 py-4 rounded-2xl border border-black/15 text-[14px] font-semibold uppercase hover:bg-gray-50 transition">Назад</button>
                <button onClick={() => { const e = validateDeliveryStep(); setErrors(e); if (Object.keys(e).length === 0) setStep('payment') }} className="flex-1 bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase hover:bg-black/80 transition">Далі</button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <div>
              <div className="space-y-3 mb-8">
                {[
                  { id: 'card', label: 'Оплата карткою онлайн' },
                  { id: 'applepay', label: 'Apple Pay' },
                  { id: 'googlepay', label: 'Google Pay' },
                  { id: 'cod', label: 'Накладений платіж' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => updateField('paymentMethod', opt.id)}
                    className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${form.paymentMethod === opt.id ? 'border-[#111] bg-gray-50' : 'border-black/10 hover:border-black/30'}`}
                  >
                    <span className="text-[14px] font-medium">{opt.label}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${form.paymentMethod === opt.id ? 'border-[#111]' : 'border-gray-300'}`}>
                      {form.paymentMethod === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[#111]" />}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('delivery')} className="flex-1 py-4 rounded-2xl border border-black/15 text-[14px] font-semibold uppercase hover:bg-gray-50 transition">Назад</button>
                <button onClick={placeOrder} className="flex-1 bg-[#111] text-white py-4 rounded-2xl text-[14px] font-semibold uppercase hover:bg-black/80 transition">Підтвердити</button>
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-24 bg-gray-50 rounded-2xl p-6">
            <h3 className="text-[16px] font-bold uppercase mb-4">Замовлення</h3>
            <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
              {items.map((i: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[13px]">
                  <span className="truncate mr-2">{i.product?.name || 'Товар'} x{i.quantity}</span>
                  <span className="font-bold flex-shrink-0">{formatPrice(i.price * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-black/10 pt-4">
              <div className="flex justify-between text-[16px] font-bold">
                <span>Всього</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
