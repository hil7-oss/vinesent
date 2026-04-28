export default function CareersPage() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>Вакансії</h1>
      <div className="max-w-3xl space-y-8 text-gray-800 leading-relaxed">
        <p>VINESENT — це команда, що постійно зростає. Ми завжди раді талановитим та амбітним людям, які готові розвиватися разом з нами.</p>
        <p>Наразі відкритих вакансій немає, але ви можете надіслати своє резюме на <a href="mailto:hr@vinesent.com" className="text-blue-600 underline">hr@vinesent.com</a>, і ми зв'яжемося з вами, як тільки з'явиться відповідна пропозиція.</p>
      </div>
    </div>
  )
}
