"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Building2, Briefcase, Users, FileText, Bell, Settings, LogOut,
  Plus, ChevronRight, TrendingUp, Clock, CheckCircle, Eye
} from 'lucide-react'

interface DashboardData {
  user: {
    uid: string
    email: string
    role: string
    details: {
      uid: string
      raisonSociale: string
      logoUrl: string | null
      statut: string
      contactNom: string
      contactPrenom: string
    } | null
  }
}

export default function ClientDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    offresActives: 0,
    candidaturesRecues: 0,
    candidaturesEnAttente: 0,
    vuesCettemois: 0,
  })

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/c/connexion')
        return
      }
      const userData = await response.json()

      if (userData.user.role !== 'CLIENT' && userData.user.role !== 'ADMIN') {
        router.push('/c/connexion')
        return
      }

      setData(userData)

      // Simule les stats pour le moment
      setStats({
        offresActives: 3,
        candidaturesRecues: 15,
        candidaturesEnAttente: 8,
        vuesCettemois: 245,
      })
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/c/connexion')
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

  const { user } = data

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
              <Badge variant="outline" className="text-xs">
                <Building2 className="w-3 h-3 mr-1" />
                Espace Entreprise
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/c/dashboard" className="text-primary font-medium">
                  Dashboard
                </Link>
                <Link href="/c/offres" className="text-gray-600 hover:text-primary">
                  Mes offres
                </Link>
                <Link href="/c/candidatures" className="text-gray-600 hover:text-primary">
                  Candidatures
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour {user.details?.contactPrenom || 'Client'} !
            </h1>
            <p className="text-gray-600 mt-1">
              {user.details?.raisonSociale} - Voici un aperçu de votre activité
            </p>
          </div>
          <Link href="/c/offres/nouvelle">
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Publier une offre
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Offres actives</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.offresActives}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Candidatures reçues</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.candidaturesRecues}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.candidaturesEnAttente}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vues ce mois</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.vuesCettemois}</p>
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
              <Link href="/c/offres/nouvelle" className="block">
                <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition border border-primary/20">
                  <div className="flex items-center gap-3">
                    <Plus className="w-5 h-5 text-primary" />
                    <span className="font-medium text-primary">Publier une nouvelle offre</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-primary" />
                </div>
              </Link>
              <Link href="/c/candidatures" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="font-medium">Voir les candidatures</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/c/offres" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <span className="font-medium">Gérer mes offres</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
              <Link href="/c/profil" className="block">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">Modifier le profil entreprise</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </Link>
            </CardContent>
          </Card>

          {/* Recent Candidatures */}
          <Card>
            <CardHeader>
              <CardTitle>Dernières candidatures</CardTitle>
              <CardDescription>Candidatures récentes sur vos offres</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune candidature récente</p>
                <p className="text-sm text-gray-400 mt-1">
                  Publiez une offre pour recevoir des candidatures
                </p>
                <Link href="/c/offres/nouvelle">
                  <Button className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    Publier une offre
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-8 bg-blue-50 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">
                  Maximisez vos chances de trouver le bon talent
                </h3>
                <p className="text-gray-600 text-sm">
                  Rédigez des offres détaillées avec les compétences requises précises pour un meilleur matching.
                  Notre algorithme analyse automatiquement les profils et vous présente les meilleurs candidats.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
