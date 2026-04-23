import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "صيدليتي - منتجات العناية بالبشرة الأصلية",
  description:
    "متجر صيدليتي للمنتجات الأصلية - عناية بالبشرة، حماية من الشمس، ترطيب وتفتيح. الدفع عند الاستلام فقط.",
  keywords: [
    "صيدليتي",
    "عناية بالبشرة",
    "منتجات أصلية",
    "دفع عند الاستلام",
    "فيتامين C",
    "واقي شمس",
  ],
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💊</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-[#FFFBF0] text-[#1A1A1A] min-h-screen flex flex-col bg-pattern">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
