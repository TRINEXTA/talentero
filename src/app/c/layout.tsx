import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Espace Entreprise',
    template: '%s | Espace Entreprise | Talentero'
  },
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
