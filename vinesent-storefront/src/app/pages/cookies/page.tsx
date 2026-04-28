export default function CookiesPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>
        Cookies Policy
      </h1>
      <div className="max-w-3xl space-y-6 text-gray-800 leading-relaxed">
        <p>
          Cookies — це невеликі файли, які зберігаються у вашому браузері. Вони допомагають сайту працювати коректно, запам’ятовувати
          налаштування та покращувати користувацький досвід.
        </p>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">1. Які cookies ми використовуємо</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="font-semibold">Необхідні</span>: забезпечують базову роботу сайту (навігація, кошик, сесія).</li>
            <li><span className="font-semibold">Аналітичні</span>: допомагають зрозуміти, як відвідувачі користуються сайтом (наприклад, Google Analytics).</li>
            <li><span className="font-semibold">Маркетингові</span>: використовуються для вимірювання рекламних кампаній (наприклад, Meta Pixel) — за наявності налаштувань/інтеграцій.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">2. Як керувати cookies</h2>
          <p>
            Ви можете видалити cookies або заблокувати їх у налаштуваннях браузера. Зверніть увагу: вимкнення деяких cookies може
            вплинути на роботу сайту (наприклад, збереження кошика).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">3. Контакти</h2>
          <p>
            Питання щодо cookies: <a className="underline" href="mailto:helper@vinesent.com">helper@vinesent.com</a>.
          </p>
        </section>

        <p className="text-[12px] text-gray-500">
          Дата останнього оновлення: 2026-03-18
        </p>
      </div>
    </div>
  )
}

