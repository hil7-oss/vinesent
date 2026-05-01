import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16">
      <h1
        className="text-[24px] lg:text-[32px] font-bold uppercase mb-4"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        Сторінку не знайдено
      </h1>
      <p className="text-[14px] text-gray-600 mb-8">
        Можливо, посилання застаріло або сторінку перенесли.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#111] text-white text-[12px] font-semibold uppercase hover:bg-black/80 transition"
      >
        На головну
      </Link>
    </div>
  );
}
