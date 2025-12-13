import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Espace Freelance',
    template: '%s | Espace Freelance | Talentero'
  },
}

export default function TalentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
