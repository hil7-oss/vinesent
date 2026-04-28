export default function FAQPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>FAQ</h1>
      <div className="max-w-3xl space-y-6">
        <details className="group border-b border-gray-200 pb-4">
          <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
            <span>Як зробити замовлення?</span>
            <span className="transition group-open:rotate-180">
              <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <p className="text-gray-600 mt-3 group-open:animate-fadeIn">
            Оберіть товар, розмір, додайте у кошик та оформіть замовлення, вказавши дані для доставки.
          </p>
        </details>
        <details className="group border-b border-gray-200 pb-4">
          <summary className="flex justify-between items-center font-medium cursor-pointer list-none">
            <span>Скільки чекати на доставку?</span>
            <span className="transition group-open:rotate-180">
              <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <p className="text-gray-600 mt-3 group-open:animate-fadeIn">
            Зазвичай доставка займає 1-3 дні.
          </p>
        </details>
      </div>
    </div>
  )
}
