import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import { I18nProvider } from "@/lib/i18n/provider";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-be-vietnam",
});

export const metadata: Metadata = {
  title: "Aulacys - Vay Vốn Dễ Dàng, Nhanh Chóng",
  description:
    "Các giải pháp vay vốn linh hoạt của Aulacys — thủ tục đơn giản, phê duyệt nhanh chóng.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={beVietnamPro.variable}>
      <body className={`${beVietnamPro.className} min-h-screen bg-background text-foreground antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
