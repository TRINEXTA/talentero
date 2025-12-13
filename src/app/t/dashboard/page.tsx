"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Briefcase,
  FileText,
  Bell,
  Settings,
  LogOut,
  Search,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Upload
} from 'lucide-react'

interface DashboardData {
  user: {
    uid: string
    email: string
    role: string
    details: {
      prenom: string
      nom: string
      titrePoste: string | null
      competences: string[]
      statut: string
      photoUrl: string | null
    } | null
  }
  stats: {
    candidaturesEnCours: number
    offresMatchees: number
    profilComplet: number
  }
  recentCandidatures: Array<{
    id: number
    offreTitre: string
    statut: string
    createdAt: string
    scoreMatch: number
  }>
  suggestedOffres: Array<{
    id: number
    titre: string
    lieu: string
    tjmMin: number
    tjmMax: number
    score: number
  }>
}

export default function TalentDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/t/connexion')
        return
      }
      const userData = await response.json()

      // Pour l'instant on simule les stats car les API ne sont pas encore créées
      setData({
        user: userData.user,
        stats: {
          candidaturesEnCours: 3,
          offresMatchees: 12,
          profilComplet: 65,
        },
        recentCandidatures: [],
        suggestedOffres: [],
      })
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/t/connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) return null

  const { user, stats } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="text-2xl font-bold text-primary">
                Talentero
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-primary font-medium">
                  Dashboard
                </Link>
                <Link href="/offres" className="text-gray-600 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">
                  Mon profil
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Bonjour {user.details?.prenom || 'Freelance'} !
          </h1>
          <p className="text-gray-600 mt-1">
            Voici un aperçu de votre activité sur Talentero
          </p>
        </div>

        {/* Profile Completion Alert */}
        {stats.profilComplet < 80 && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Complétez votre profil</p>
                  <p className="text-sm text-gray-600">
                    Profil complété à {stats.profilComplet}% - Augmentez votre visibilité !
                  </p>
                </div>
              </div>
              <Link href="/t/profil">
                <Button variant="accent">
                  Compléter mon profil
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Candidatures en cours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.candidaturesEnCours}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Offres matchées</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.offresMatchees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Profil complété</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.profilComplet}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions rapides</CardTitle>
              <CardDescription>Que souhaitez-vous faire ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/offres" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <Search className="w-5 h-5 text-primary" />
                    <span className="font-medium">Rechercher des offres</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/t/profil" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary" />
                    <span className="font-medium">Modifier mon profil</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/t/profil/cv" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-primary" />
                    <span className="font-medium">Mettre à jour mon CV</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/t/alertes" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-primary" />
                    <span className="font-medium">Gérer mes alertes</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Candidatures */}
          <Card>
            <CardHeader>
              <CardTitle>Mes candidatures récentes</CardTitle>
              <CardDescription>Suivez l'état de vos candidatures</CardDescription>
            </CardHeader>
            <CardContent>
              {data.recentCandidatures.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune candidature pour le moment</p>
                  <Link href="/offres">
                    <Button className="mt-4">
                      Voir les offres
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentCandidatures.map((candidature) => (
                    <div key={candidature.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{candidature.offreTitre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={
                            candidature.statut === 'ACCEPTEE' ? 'success' :
                            candidature.statut === 'REFUSEE' ? 'destructive' :
                            'secondary'
                          }>
                            {candidature.statut}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Match: {candidature.scoreMatch}%
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Info */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${
                  user.details?.statut === 'ACTIF' ? 'bg-green-500' :
                  user.details?.statut === 'EN_MISSION' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`} />
                <div>
                  <p className="font-medium">Statut: {user.details?.statut || 'ACTIF'}</p>
                  <p className="text-sm text-gray-500">
                    {user.details?.statut === 'ACTIF' ? 'Visible par les recruteurs' :
                     user.details?.statut === 'EN_MISSION' ? 'En mission - profil masqué' :
                     'Profil non visible'}
                  </p>
                </div>
              </div>
              <Link href="/t/profil">
                <Button variant="outline">Modifier mon statut</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
