export default function ReviewsPage() {
  const reviews = [
    {
      name: 'Марія',
      text: 'Дуже якісний матеріал і ідеальна посадка. Дитина носить із задоволенням.',
    },
    {
      name: 'Олена',
      text: 'Швидка доставка, гарне пакування та ввічлива підтримка. Рекомендую.',
    },
    {
      name: 'Ірина',
      text: 'Розмір підійшов, колір як на фото. Дякую VINESENT!',
    },
  ]

  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
      <h1 className="text-[24px] lg:text-[32px] font-bold uppercase mb-8" style={{ fontFamily: 'var(--font-brand)' }}>
        Відгуки
      </h1>
      <div className="max-w-3xl">
        <div className="text-[14px] text-gray-700 mb-8">
          Нам важлива ваша думка. Якщо хочете залишити відгук або маєте питання — напишіть нам на{' '}
          <a className="underline" href="mailto:helper@vinesent.com">helper@vinesent.com</a>{' '}
          або у соцмережах.
        </div>

        <div className="grid gap-4">
          {reviews.map((r, idx) => (
            <div key={idx} className="border border-black/10 rounded-2xl p-5 bg-white">
              <div className="text-[13px] font-semibold uppercase mb-2">{r.name}</div>
              <div className="text-[14px] text-gray-700 leading-relaxed">{r.text}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

