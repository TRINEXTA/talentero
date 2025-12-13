import type { Metadata } from 'next'
import { Inter, Montserrat } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-montserrat'
})

export const metadata: Metadata = {
  title: {
    default: 'Talentero - Where IT talent meets opportunity',
    template: '%s | Talentero'
  },
  description: 'Plateforme de recrutement freelance IT nouvelle génération. Matching instantané, inscription en 30 secondes. Opérée par TRINEXTA.',
  keywords: ['freelance', 'IT', 'développeur', 'recrutement', 'mission', 'Java', 'React', 'Angular', 'DevOps'],
  authors: [{ name: 'TRINEXTA' }],
  creator: 'TRINEXTA',
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://talentero.io',
    siteName: 'Talentero',
    title: 'Talentero - Where IT talent meets opportunity',
    description: 'Plateforme de recrutement freelance IT nouvelle génération',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Talentero',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Talentero - Where IT talent meets opportunity',
    description: 'Plateforme de recrutement freelance IT nouvelle génération',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={`${inter.className} ${montserrat.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
