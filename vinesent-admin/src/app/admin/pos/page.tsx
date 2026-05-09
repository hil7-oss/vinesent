'use client'
import { useState, useRef, useEffect } from 'react'

export const dynamic = 'force-dynamic'

const API_BASE = ''

export default function PosPage() {
  const [barcode, setBarcode] = useState('')
  const [scannedItem, setScannedItem] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcode) return

    setLoading(true)
    setMessage('')
    try {
      // First lookup
      const res = await fetch(`/barcodes/lookup?barcode=${barcode}`)
      const data = await res.json()
      
      if (res.ok) {
        setScannedItem(data)
        // Auto-sell (Quick Sale) logic or just show?
        // Let's implement Quick Sale on Enter for now, but ask for confirmation or quantity.
        // Actually, user said "удаление  за счет сканирование", implies fast action.
        // Let's do: Scan -> Show -> Click "Sell" or Scan again to sell immediately if "Auto-Sell" is checked.
      } else {
        setMessage('Товар не знайдено')
        setScannedItem(null)
      }
    } catch (err) {
      setMessage('Помилка при пошуку')
    } finally {
      setLoading(false)
    }
  }

  const handleSell = async (qty: number) => {
    if (!scannedItem) return
    setLoading(true)
    try {
      const res = await fetch(`/pos/simple-sale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: scannedItem.barcode, quantity: qty })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Продано! Залишок: ${data.variant.stock}`)
        setScannedItem({ scannedItem, stock: data.variant.stock })
        setBarcode('')
        inputRef.current?.focus()
      } else {
        setMessage(`Помилка: ${data.error}`)
      }
    } catch (err) {
      setMessage('Помилка при продажу')
    } finally {
      setLoading(false)
    }
  }
  
  const handleAdjust = async () => {
    if (!scannedItem) return
    const newStockStr = prompt('Введіть нову кількість:', scannedItem.stock)
    if (newStockStr === null) return
    
    const newStock = parseInt(newStockStr, 10)
    if (isNaN(newStock) || newStock < 0) {
      alert('Будь ласка, введіть коректне число (>= 0)')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ barcode: scannedItem.barcode, newStock })
      })
      const data = await res.json()
      if (res.ok) {
        setMessage(`Оновлено! Новий залишок: ${data.variant.stock}`)
        setScannedItem({ scannedItem, stock: data.variant.stock })
      } else {
        setMessage(`Помилка: ${data.error}`)
      }
    } catch (err) {
      setMessage('Помилка при оновленні')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">POS / Сканер</h1>
      
      <form onSubmit={handleScan} className="mb-8">
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={e => setBarcode(e.target.value)}
          placeholder="Скануйте штрихкод"
          className="w-full h-16 px-6 text-xl border-2 border-black rounded-xl focus:outline-none focus:ring-4 focus:ring-black/10"
          autoFocus
        />
        <button type="submit" className="hidden">Scan</button>
      </form>

      {message && (
        <div className={`p-4 rounded-xl mb-6 ${message.includes('Помилка') || message.includes('не знайдено') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
          {message}
        </div>
      )}

      {scannedItem && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex gap-6 mb-6">
            {scannedItem.product?.images && (
              <div className="w-24 h-32 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                <img 
                  src={JSON.parse(scannedItem.product.images)[0] || ''} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold mb-1">{scannedItem.product?.name}</h2>
              <div className="text-gray-500 mb-2">
                {scannedItem.size && <span className="mr-3">Розмір: {scannedItem.size}</span>}
                {scannedItem.color && <span>Колір: {scannedItem.color}</span>}
              </div>
              <div className="text-2xl font-bold mb-1">{scannedItem.product?.price} ₴</div>
              <div className={`text-sm ${scannedItem.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                В наявності: {scannedItem.stock} шт.
              </div>
              <div className="text-xs text-gray-400 mt-1">Barcode: {scannedItem.barcode}</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button 
                onClick={() => setPaymentMethod('CASH')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${paymentMethod === 'CASH' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                Готівка
              </button>
              <button 
                onClick={() => setPaymentMethod('CARD')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${paymentMethod === 'CARD' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-gray-200'}`}
              >
                Картка
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleSell(1)}
              disabled={loading || scannedItem.stock < 1}
              className="h-14 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ПРОДАТИ (1 шт)
            </button>
            <button
              onClick={handleAdjust}
              disabled={loading}
              className="h-14 bg-gray-100 text-black rounded-xl font-bold text-lg hover:bg-gray-200 transition disabled:opacity-50"
            >
              Коригувати
            </button>
          </div>
        </div>
      )}
      
      {!scannedItem && !loading && (
        <div className="text-center text-gray-400 py-12">
            Скануйте товар для початку роботи
        </div>
      )}
    </div>
  )
}
