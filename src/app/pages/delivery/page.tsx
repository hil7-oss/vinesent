export default function DeliveryPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Доставка і оплата</h1>
      <div className="max-w-3xl space-y-12">
        <section>
          <h2 className="text-[20px] font-bold mb-4">Доставка</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-800">
            <li>Доставка "Новою Поштою" по всій Україні.</li>
            <li>Кур'єрська доставка по Києву.</li>
            <li>Самовивіз з нашого шоуруму.</li>
            <li>Відправка замовлень здійснюється протягом 1-3 робочих днів.</li>
          </ul>
        </section>
        <section>
          <h2 className="text-[20px] font-bold mb-4">Оплата</h2>
          <ul className="list-disc pl-5 space-y-2 text-gray-800">
            <li>Оплата на карту.</li>
            <li>Післяплата при отриманні ("Нова Пошта").</li>
            <li>Готівкою при самовивозі.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
