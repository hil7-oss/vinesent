export default function ContactPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Контакти</h1>
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h3 className="text-[16px] font-bold uppercase mb-4">Телефони</h3>
            <a href="tel:+380993708028" className="block text-xl hover:text-gray-600 transition">+38 (99) 370-80-28</a>
          </div>
          <div>
            <h3 className="text-[16px] font-bold uppercase mb-4">Email</h3>
            <a href="mailto:info@vinesent.com" className="block text-xl hover:text-gray-600 transition">info@vinesent.com</a>
          </div>
          <div>
            <h3 className="text-[16px] font-bold uppercase mb-4">Адреса</h3>
            <p className="text-xl">м. Київ, вул. Прикладна, 1</p>
          </div>
          <div>
            <h3 className="text-[16px] font-bold uppercase mb-4">Графік роботи</h3>
            <p className="text-xl">Пн-Пт: 10:00 - 19:00</p>
            <p className="text-xl">Сб-Нд: 11:00 - 18:00</p>
          </div>
        </div>
        <div className="bg-gray-100 rounded-2xl h-[400px] flex items-center justify-center text-gray-400">
          Карта
        </div>
      </div>
    </div>
  )
}
