import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Módulo de Tarifas y Despacho Radial — Línea Los Patriotas (Táchira)',
  description:
    'Motor inteligente de cálculo de tarifas trimonetario (COP, USD, Bs. BCV) con despacho radial desde Base Central Táriba, matriz oficial de 270+ rutas y estimación topográfica.',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0b1120',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${plusJakarta.className} antialiased bg-[#0b1120] text-slate-100`}>
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
