import type { Metadata } from "next";
import { Navbar } from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "ALEI",
  description: "Alei",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col bg-white text-black">
        <Navbar />
        <main className="min-h-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
