import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const SITE_URL = 'https://vinesent.com'
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',           // API не индексируем
          '/admin/',         // Админка не индексируется
          '/_next/',         // Технические файлы Next.js
          '/checkout/',      // Процесс оформления заказа
          '/account/',       // Личный кабинет
          '/cart',           // Корзина
          '/search?*',       // Страницы поиска с параметрами
          '/*?*sort=*',      // Страницы с сортировкой (дубли)
          '/*?*filter=*',    // Страницы с фильтрами (дубли)
        ],
      },
      // Специальные правила для Google
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/_next/',
          '/checkout/',
          '/account/',
        ],
      },
      // Блокируем плохих ботов
      {
        userAgent: [
          'AhrefsBot',
          'SemrushBot',
          'DotBot',
          'MJ12bot',
        ],
        disallow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
