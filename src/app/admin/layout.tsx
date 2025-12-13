import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    default: 'Administration',
    template: '%s | Admin | Talentero'
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
