'use client'

import Link from "next/link";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-16">
      <h1
        className="text-[24px] lg:text-[32px] font-bold uppercase mb-4"
        style={{ fontFamily: "var(--font-brand)" }}
      >
        Щось пішло не так
      </h1>
      <p className="text-[14px] text-gray-600 mb-8">
        Спробуйте оновити сторінку або поверніться на головну.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl bg-[#111] text-white text-[12px] font-semibold uppercase hover:bg-black/80 transition"
        >
          Повторити
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-6 rounded-xl border border-black/15 text-[12px] font-semibold uppercase hover:bg-black/5 transition"
        >
          На головну
        </Link>
      </div>
    </div>
  );
}
