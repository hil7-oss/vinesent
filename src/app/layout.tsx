import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Script from "next/script";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
});

const montserrat = Montserrat({
  variable: "--font-brand",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "VINESENT | Premium Kids Fashion",
  description: "VINESENT - Premium Kids Fashion. Дитячий одяг преміум класу.",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  verification: {
    google: "cYmFSjh0fa9EXdnaL4DVYNpJD7FKjbmFbm4Btff19rk",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = "G-8ESH1X22SX";
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID || "";
  const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID || "";

  // Organization Schema для всего сайта
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "VINESENT",
    "url": "https://vinesent.com",
    "logo": "https://vinesent.com/logo-liqpay-symbol.png",
    "description": "VINESENT - Premium Kids Fashion. Дитячий одяг преміум класу для дітей.",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "Customer Service",
      "availableLanguage": ["Ukrainian", "Russian"]
    },
    "sameAs": [
      "https://www.instagram.com/vinesent.shop/",
      "https://www.facebook.com/vinesent.shop/"
    ]
  };

  // WebSite Schema для пошуку
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "VINESENT",
    "url": "https://vinesent.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://vinesent.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="uk">
      <head>
        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {/* WebSite Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        {gtmId && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
        {gaId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`}
            </Script>
          </>
        )}
        {metaPixelId && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaPixelId}');fbq('track','PageView');`}
          </Script>
        )}
      </head>
      <body
        className={`${inter.variable} ${montserrat.variable} antialiased bg-white text-[#111]`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {metaPixelId && (
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        )}
        <Header />
        <main className="min-h-screen overflow-x-hidden">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
