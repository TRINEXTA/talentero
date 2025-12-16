'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Shield, Download, FileText, Users, Building2, Briefcase,
  LogOut, Calendar, Euro, FileSignature, Star, TrendingUp,
  BarChart3, PieChart, Filter
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ReportStats {
  periode: { debut: string; fin: string }
  global: {
    talents: number
    clients: number
    offres: number
    candidatures: number
    contratsActifs: number
  }
  facturation: {
    totalFactures: number
    totalHT: number
    totalTTC: number
  }
  candidaturesParStatut: Record<string, number>
  offresParStatut: Record<string, number>
}

interface ExportType {
  id: string
  label: string
  description: string
  icon: React.ElementType
}

const exportTypes: ExportType[] = [
  { id: 'talents', label: 'Talents', description: 'Liste des freelances', icon: Users },
  { id: 'clients', label: 'Clients', description: 'Liste des entreprises', icon: Building2 },
  { id: 'offres', label: 'Offres', description: 'Liste des missions', icon: Briefcase },
  { id: 'candidatures', label: 'Candidatures', description: 'Liste des candidatures', icon: FileText },
  { id: 'contrats', label: 'Contrats', description: 'Liste des contrats', icon: FileSignature },
  { id: 'factures', label: 'Factures', description: 'Liste des factures', icon: Euro },
  { id: 'reviews', label: 'Évaluations', description: 'Liste des avis', icon: Star },
]

const candidatureStatuts: Record<string, string> = {
  NOUVELLE: 'Nouvelle',
  VUE: 'Vue',
  EN_REVUE: 'En revue',
  PRE_SELECTIONNE: 'Pré-sélectionné',
  SHORTLIST: 'Shortlist',
  PROPOSEE_CLIENT: 'Proposée',
  ENTRETIEN_DEMANDE: 'Entretien demandé',
  ENTRETIEN_PLANIFIE: 'Entretien planifié',
  ENTRETIEN_REALISE: 'Entretien réalisé',
  ACCEPTEE: 'Acceptée',
  REFUSEE: 'Refusée',
}

const offreStatuts: Record<string, string> = {
  BROUILLON: 'Brouillon',
  ENVOYEE: 'Envoyée',
  EN_ATTENTE_VALIDATION: 'En attente',
  PUBLIEE: 'Publiée',
  SHORTLIST_ENVOYEE: 'Shortlist envoyée',
  ENTRETIENS_EN_COURS: 'Entretiens',
  POURVUE: 'Pourvue',
  FERMEE: 'Fermée',
  ANNULEE: 'Annulée',
}

export default function AdminExportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<ReportStats | null>(null)
  const [exporting, setExporting] = useState<string | null>(null)
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading) {
      fetchStats()
    }
  }, [dateDebut, dateFin, loading])

  const checkAuth = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/admin/login')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'ADMIN') {
        router.push('/')
        return
      }
      setLoading(false)
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/admin/login')
    }
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ action: 'stats' })
      if (dateDebut) params.set('dateDebut', dateDebut)
      if (dateFin) params.set('dateFin', dateFin)

      const res = await fetch(`/api/admin/exports?${params}`)
      if (res.ok) {
        const data = await res.json()
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const handleExport = async (type: string) => {
    setExporting(type)
    try {
      const params = new URLSearchParams({ type })
      if (dateDebut) params.set('dateDebut', dateDebut)
      if (dateFin) params.set('dateFin', dateFin)

      const res = await fetch(`/api/admin/exports?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const filename = res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || `${type}.csv`

        // Télécharger le fichier
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Erreur export:', error)
    } finally {
      setExporting(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-2xl font-bold text-white">
                Talentero
              </Link>
              <Badge className="bg-red-600 text-white">
                <Shield className="w-3 h-3 mr-1" />
                ADMIN
              </Badge>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-gray-400 hover:text-white">
                Analytics
              </Link>
              <Link href="/admin/facturation" className="text-gray-400 hover:text-white">
                Facturation
              </Link>
              <Link href="/admin/contrats" className="text-gray-400 hover:text-white">
                Contrats
              </Link>
              <Link href="/admin/exports" className="text-white font-medium">
                Exports
              </Link>
            </nav>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-7 h-7" />
              Exports & Rapports
            </h1>
            <p className="text-gray-400 mt-1">Exportez vos données et consultez les statistiques</p>
          </div>
        </div>

        {/* Filtres de période */}
        <Card className="bg-gray-800 border-gray-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres de période
            </CardTitle>
            <CardDescription className="text-gray-400">
              Filtrez les données par période
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <Label className="text-gray-300">Date de début</Label>
                <Input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Date de fin</Label>
                <Input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => { setDateDebut(''); setDateFin('') }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Statistiques globales */}
        {stats && (
          <>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Rapport de la période
              <span className="text-sm font-normal text-gray-400 ml-2">
                ({stats.periode.debut} - {stats.periode.fin})
              </span>
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600/20 rounded-lg">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.global.talents}</p>
                      <p className="text-sm text-gray-400">Talents</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-600/20 rounded-lg">
                      <Building2 className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.global.clients}</p>
                      <p className="text-sm text-gray-400">Clients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-600/20 rounded-lg">
                      <Briefcase className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.global.offres}</p>
                      <p className="text-sm text-gray-400">Offres</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600/20 rounded-lg">
                      <FileText className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.global.candidatures}</p>
                      <p className="text-sm text-gray-400">Candidatures</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-600/20 rounded-lg">
                      <FileSignature className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{stats.global.contratsActifs}</p>
                      <p className="text-sm text-gray-400">Contrats actifs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Facturation */}
            <Card className="bg-gray-800 border-gray-700 mb-8">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Euro className="w-5 h-5" />
                  Facturation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-700/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-white">{stats.facturation.totalFactures}</p>
                    <p className="text-gray-400">Factures</p>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-white">
                      {stats.facturation.totalHT.toLocaleString('fr-FR')} €
                    </p>
                    <p className="text-gray-400">Total HT</p>
                  </div>
                  <div className="p-4 bg-gray-700/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-400">
                      {stats.facturation.totalTTC.toLocaleString('fr-FR')} €
                    </p>
                    <p className="text-gray-400">Total TTC</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Répartition candidatures et offres */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Candidatures par statut
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.candidaturesParStatut).map(([statut, count]) => (
                      <div key={statut} className="flex items-center justify-between">
                        <span className="text-gray-300">
                          {candidatureStatuts[statut] || statut}
                        </span>
                        <Badge variant="outline" className="text-white border-gray-600">
                          {count}
                        </Badge>
                      </div>
                    ))}
                    {Object.keys(stats.candidaturesParStatut).length === 0 && (
                      <p className="text-gray-500 text-center py-4">Aucune donnée</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Offres par statut
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.offresParStatut).map(([statut, count]) => (
                      <div key={statut} className="flex items-center justify-between">
                        <span className="text-gray-300">
                          {offreStatuts[statut] || statut}
                        </span>
                        <Badge variant="outline" className="text-white border-gray-600">
                          {count}
                        </Badge>
                      </div>
                    ))}
                    {Object.keys(stats.offresParStatut).length === 0 && (
                      <p className="text-gray-500 text-center py-4">Aucune donnée</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Exports */}
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Exporter les données
        </h2>

        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {exportTypes.map((type) => {
            const Icon = type.icon
            return (
              <Card key={type.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-gray-700 rounded-lg mb-3">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{type.label}</h3>
                    <p className="text-sm text-gray-400 mb-4">{type.description}</p>
                    <Button
                      onClick={() => handleExport(type.id)}
                      disabled={exporting === type.id}
                      className="w-full"
                      variant="outline"
                    >
                      {exporting === type.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Export...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Exporter CSV
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </main>
    </div>
  )
}
