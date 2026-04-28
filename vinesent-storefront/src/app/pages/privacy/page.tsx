export default function PrivacyPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>
        Політика конфіденційності
      </h1>
      <div className="max-w-3xl space-y-6 text-gray-800 leading-relaxed">
        <p>
          Ця Політика описує, які персональні дані ми можемо збирати під час використання сайту VINESENT, як ми їх обробляємо, з якою
          метою та які права має користувач.
        </p>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">1. Які дані ми збираємо</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Контактні дані: ім’я, телефон, email.</li>
            <li>Дані для доставки: місто, відділення/адреса, інші дані, потрібні для відправлення.</li>
            <li>Дані замовлення: склад кошика, сума, обрані опції (розмір/колір), історія звернень.</li>
            <li>Технічні дані: IP‑адреса, тип браузера, сторінки перегляду, cookies та подібні ідентифікатори.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">2. Мета обробки</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Обробка замовлень, доставка та комунікація з покупцем.</li>
            <li>Покращення роботи сайту, аналітика та персоналізація.</li>
            <li>Маркетингові повідомлення за наявності вашої згоди.</li>
            <li>Виконання вимог законодавства та захист законних інтересів.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">3. Підстави обробки</h2>
          <p>
            Ми обробляємо дані на підставі вашої згоди, необхідності виконання договору (оформлення та виконання замовлення), а також у
            випадках, передбачених законодавством.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">4. Передача даних третім особам</h2>
          <p>
            Ми можемо передавати дані лише в обсязі, необхідному для виконання замовлення та підтримки сервісу (служби доставки,
            платіжні сервіси, хостинг/аналітика). Ми не продаємо персональні дані третім особам.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">5. Аналітика та маркетинг (Pixel / Google Analytics)</h2>
          <p>
            На сайті можуть використовуватися інструменти веб‑аналітики та маркетингу (наприклад, Google Analytics, Google Tag Manager,
            Meta Pixel) для вимірювання ефективності та покращення сервісу. Дані можуть збиратися у вигляді псевдонімізованих
            ідентифікаторів і технічних параметрів. Ви можете керувати cookies у налаштуваннях браузера.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">6. Зберігання даних</h2>
          <p>
            Ми зберігаємо персональні дані протягом строку, необхідного для виконання цілей обробки та/або передбаченого законодавством.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">7. Права користувача</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Отримати інформацію про обробку ваших даних.</li>
            <li>Вимагати виправлення або видалення даних у передбачених законом випадках.</li>
            <li>Відкликати згоду на маркетингові комунікації.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-[18px] font-bold">8. Контакти</h2>
          <p>
            Для запитів щодо конфіденційності: <a className="underline" href="mailto:helper@vinesent.com">helper@vinesent.com</a>.
          </p>
        </section>

        <p className="text-[12px] text-gray-500">
          Дата останнього оновлення: 2026-03-18
        </p>
      </div>
    </div>
  )
}

