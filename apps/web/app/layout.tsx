import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SHB Digital Expert",
  description: "Đội ngũ chuyên gia số hỗ trợ thẩm định tín dụng doanh nghiệp.",
};

// Apply the saved theme before paint to avoid a flash. Dark mode is by class,
// controlled in-app (not the OS) — see globals.css.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
