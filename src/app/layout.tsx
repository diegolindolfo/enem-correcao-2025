import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ENEM 2025 • Plataforma de Correção em Massa",
  description: "Avaliação automatizada de redações do ENEM seguindo estritamente a Grade Específica 2025 com Motor Determinístico Anti-Alucinação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 selection:bg-indigo-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
