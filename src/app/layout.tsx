import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CondominiumProvider } from "@/contexts/CondominiumContext";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DoorsERP - Sistema de Gestão de Condomínio",
  description: "Sistema completo de gestão de condomínio com reconhecimento facial e controle financeiro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 font-sans antialiased`}
      >
        <AuthProvider>
          <CondominiumProvider>
            <div className="min-h-screen relative">
              {/* Background decorativo */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-orange-500/5 pointer-events-none" />
              <div className="relative z-10">
                {children}
              </div>
            </div>
          </CondominiumProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
