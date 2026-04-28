import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body
        className={`${inter.variable} ${montserrat.variable} antialiased bg-white text-[#111]`}
        style={{ fontFamily: "var(--font-body)" }}
      >
        <Header />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
