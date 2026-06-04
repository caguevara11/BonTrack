import type { Metadata } from "next";
import { Fraunces, Public_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Providers } from "./providers";
import "./globals.css";

// Display editorial con gravitas institucional.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Tipografía diseñada para uso gubernamental (USWDS) — legible y on-theme.
const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
});

// Monoespaciada para IDs de bono y llaves públicas.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BonTrack — Trazabilidad de bonos de deuda política",
  description:
    "Registro público e inmutable de la cadena de custodia de bonos de deuda política (TSE).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${publicSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
