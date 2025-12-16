"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Shield, Users, Briefcase, Building2, FileText, Settings, LogOut,
  Plus, ChevronRight, TrendingUp, Clock, CheckCircle, AlertCircle, Eye, Activity,
  UserCheck, UserX, Pause, Upload
} from 'lucide-react'

interface RecentCandidature {
  uid: string
  talentNom: string
  talentUid: string
  offreTitre: string
  offreUid: string
  statut: string
  createdAt: string
}

interface RecentTalent {
  uid: string
  nom: string
  titrePoste: string | null
  statut: string
  importeParAdmin: boolean
  createdAt: string
}

interface Stats {
  totalTalents: number
  totalClients: number
  totalOffres: number
  totalCandidatures: number
  clientsEnAttente: number
  offresEnAttente: number
  candidaturesNouvelles: number
  talentsByStatus?: {
    actifs: number
    enMission: number
    inactifs: number
    enAttente: number
  }
  offresByStatus?: {
    publiees: number
    pourvues: number
    enAttente: number
  }
  recentCandidatures?: RecentCandidature[]
  recentTalents?: RecentTalent[]
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalTalents: 0,
    totalClients: 0,
    totalOffres: 0,
    totalCandidatures: 0,
    clientsEnAttente: 0,
    offresEnAttente: 0,
    candidaturesNouvelles: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/admin/login')
        return
      }
      const userData = await response.json()

      if (userData.user.role !== 'ADMIN') {
        router.push('/')
        return
      }

      // Fetch admin stats
      const statsResponse = await fetch('/api/admin/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/admin/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `il y a ${minutes} min`
    if (hours < 24) return `il y a ${hours}h`
    if (days < 7) return `il y a ${days}j`
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      NOUVELLE: { label: 'Nouvelle', className: 'bg-blue-600' },
      VUE: { label: 'Vue', className: 'bg-gray-600' },
      PRESELECTION: { label: 'Présélection', className: 'bg-purple-600' },
      SHORTLIST: { label: 'Shortlist', className: 'bg-green-600' },
      ENTRETIEN: { label: 'Entretien', className: 'bg-orange-600' },
      ACCEPTEE: { label: 'Retenue', className: 'bg-green-600' },
      REFUSEE: { label: 'Refusée', className: 'bg-red-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
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
              <Link href="/admin" className="text-white font-medium">
                Dashboard
              </Link>
              <Link href="/admin/analytics" className="text-gray-400 hover:text-white">
                Analytics
              </Link>
              <Link href="/admin/clients" className="text-gray-400 hover:text-white">
                Clients
              </Link>
              <Link href="/admin/talents" className="text-gray-400 hover:text-white">
                Talents
              </Link>
              <Link href="/admin/offres" className="text-gray-400 hover:text-white">
                Offres
              </Link>
              <Link href="/admin/candidatures" className="text-gray-400 hover:text-white">
                Candidatures
              </Link>
              <Link href="/admin/facturation" className="text-gray-400 hover:text-white">
                Facturation
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
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">
            Dashboard TRINEXTA
          </h1>
          <p className="text-gray-400 mt-1">
            Gestion de la plateforme Talentero
          </p>
        </div>

        {/* Alerts */}
        {(stats.clientsEnAttente > 0 || stats.offresEnAttente > 0) && (
          <Card className="mb-8 bg-yellow-900/20 border-yellow-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-100">Actions en attente</p>
                  <p className="text-sm text-yellow-200/70">
                    {stats.clientsEnAttente > 0 && `${stats.clientsEnAttente} client(s) à valider`}
                    {stats.clientsEnAttente > 0 && stats.offresEnAttente > 0 && ' • '}
                    {stats.offresEnAttente > 0 && `${stats.offresEnAttente} offre(s) à valider`}
                  </p>
                </div>
                <Link href="/admin/offres?statut=EN_ATTENTE_VALIDATION">
                  <Button variant="outline" className="border-yellow-600 text-yellow-100 hover:bg-yellow-900/50">
                    Voir
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Talents</p>
                  <p className="text-2xl font-bold text-white">{stats.totalTalents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Clients</p>
                  <p className="text-2xl font-bold text-white">{stats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Offres</p>
                  <p className="text-2xl font-bold text-white">{stats.totalOffres}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-600/20 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Candidatures</p>
                  <p className="text-2xl font-bold text-white">{stats.totalCandidatures}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Talents Status Breakdown */}
        {stats.talentsByStatus && (
          <Card className="bg-gray-800 border-gray-700 mb-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Statut des freelances
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link href="/admin/talents?statut=ACTIF">
                  <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg hover:bg-green-900/50 transition cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <UserCheck className="w-5 h-5 text-green-400" />
                      <span className="text-green-300">Disponibles</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.talentsByStatus.actifs}</p>
                  </div>
                </Link>

                <Link href="/admin/talents?statut=EN_MISSION">
                  <div className="p-4 bg-blue-900/30 border border-blue-700/50 rounded-lg hover:bg-blue-900/50 transition cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <Briefcase className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-300">En mission</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.talentsByStatus.enMission}</p>
                  </div>
                </Link>

                <Link href="/admin/talents?statut=INACTIF">
                  <div className="p-4 bg-gray-700/30 border border-gray-600/50 rounded-lg hover:bg-gray-700/50 transition cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <Pause className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300">Inactifs</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.talentsByStatus.inactifs}</p>
                  </div>
                </Link>

                <Link href="/admin/talents?statut=EN_ATTENTE">
                  <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg hover:bg-amber-900/50 transition cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <Clock className="w-5 h-5 text-amber-400" />
                      <span className="text-amber-300">En attente</span>
                    </div>
                    <p className="text-3xl font-bold text-white">{stats.talentsByStatus.enAttente}</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Actions rapides</CardTitle>
              <CardDescription className="text-gray-400">Gestion de la plateforme</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/admin/talents/import-cv-masse" className="block">
                <div className="flex items-center justify-between p-4 bg-primary/20 rounded-lg hover:bg-primary/30 transition border border-primary/40">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <span className="text-primary font-medium">Importer des CV en masse</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </Link>

              <Link href="/admin/offres/nouvelle" className="block">
                <div className="flex items-center justify-between p-4 bg-purple-600/20 rounded-lg hover:bg-purple-600/30 transition border border-purple-600/40">
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-purple-400" />
                    <span className="text-purple-300 font-medium">Créer une offre TRINEXTA</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-purple-400" />
                </div>
              </Link>

              <Link href="/admin/offres?statut=EN_ATTENTE_VALIDATION" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-purple-400" />
                    <span className="text-white">Valider les offres</span>
                    {stats.offresEnAttente > 0 && (
                      <Badge className="bg-yellow-600">{stats.offresEnAttente}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/admin/candidatures" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-green-400" />
                    <span className="text-white">Gérer les candidatures</span>
                    {stats.candidaturesNouvelles > 0 && (
                      <Badge className="bg-green-600">{stats.candidaturesNouvelles}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>

              <Link href="/admin/clients?statut=EN_ATTENTE" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-blue-400" />
                    <span className="text-white">Valider les clients</span>
                    {stats.clientsEnAttente > 0 && (
                      <Badge className="bg-yellow-600">{stats.clientsEnAttente}</Badge>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Activité récente</CardTitle>
              <CardDescription className="text-gray-400">Dernières candidatures et inscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {(!stats.recentCandidatures || stats.recentCandidatures.length === 0) &&
               (!stats.recentTalents || stats.recentTalents.length === 0) ? (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune activité récente</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Recent Candidatures */}
                  {stats.recentCandidatures && stats.recentCandidatures.slice(0, 3).map((c) => (
                    <div key={c.uid} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                      <div className="w-8 h-8 bg-green-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <Link href={`/admin/talents/${c.talentUid}`} className="font-medium hover:text-primary">
                            {c.talentNom}
                          </Link>
                          {' '}a postulé sur{' '}
                          <Link href={`/admin/offres/${c.offreUid}`} className="font-medium hover:text-primary">
                            {c.offreTitre}
                          </Link>
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getStatutBadge(c.statut)}
                          <span className="text-xs text-gray-500">{formatDate(c.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Recent Talents */}
                  {stats.recentTalents && stats.recentTalents.slice(0, 2).map((t) => (
                    <div key={t.uid} className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg">
                      <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white">
                          <Link href={`/admin/talents/${t.uid}`} className="font-medium hover:text-primary">
                            {t.nom}
                          </Link>
                          {t.importeParAdmin ? ' a été importé' : ' s\'est inscrit'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {t.titrePoste && (
                            <span className="text-xs text-gray-400">{t.titrePoste}</span>
                          )}
                          <span className="text-xs text-gray-500">{formatDate(t.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Link href="/admin/candidatures">
                    <Button variant="outline" className="w-full border-gray-600 text-gray-300 hover:bg-gray-700">
                      Voir toute l'activité
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Offres Status */}
        {stats.offresByStatus && (
          <Card className="bg-gray-800 border-gray-700 mt-8">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Statut des offres
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <Link href="/admin/offres?statut=PUBLIEE">
                  <div className="p-4 bg-green-900/30 border border-green-700/50 rounded-lg hover:bg-green-900/50 transition cursor-pointer text-center">
                    <p className="text-3xl font-bold text-white">{stats.offresByStatus.publiees}</p>
                    <p className="text-green-300 text-sm mt-1">Publiées</p>
                  </div>
                </Link>

                <Link href="/admin/offres?statut=EN_ATTENTE_VALIDATION">
                  <div className="p-4 bg-amber-900/30 border border-amber-700/50 rounded-lg hover:bg-amber-900/50 transition cursor-pointer text-center">
                    <p className="text-3xl font-bold text-white">{stats.offresByStatus.enAttente}</p>
                    <p className="text-amber-300 text-sm mt-1">En attente</p>
                  </div>
                </Link>

                <Link href="/admin/offres?statut=POURVUE">
                  <div className="p-4 bg-purple-900/30 border border-purple-700/50 rounded-lg hover:bg-purple-900/50 transition cursor-pointer text-center">
                    <p className="text-3xl font-bold text-white">{stats.offresByStatus.pourvues}</p>
                    <p className="text-purple-300 text-sm mt-1">Pourvues</p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
