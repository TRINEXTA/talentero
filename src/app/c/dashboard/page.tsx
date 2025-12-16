'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  Building2, Briefcase, Users, FileText, Settings, LogOut,
  Plus, ChevronRight, TrendingUp, Clock, CheckCircle, Eye,
  User, Calendar, AlertCircle, Star
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
      typeClient: string
      contacts: Array<{ prenom: string; nom: string }>
    } | null
  }
}

interface Stats {
  offresActives: number
  totalCandidatures: number
  candidaturesNouvelles: number
  shortlistsEnCours: number
}

interface OffreRecente {
  uid: string
  slug: string
  titre: string
  statut: string
  nbCandidatures: number
  nbVues: number
  createdAt: string
}

interface CandidatureRecente {
  uid: string
  statut: string
  scoreMatch: number
  createdAt: string
  offre: {
    uid: string
    slug: string
    titre: string
  }
  talent: {
    uid: string
    prenom: string
    nom: string
    titrePoste: string | null
    photoUrl: string | null
    competences: string[]
  }
}

export default function ClientDashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    offresActives: 0,
    totalCandidatures: 0,
    candidaturesNouvelles: 0,
    shortlistsEnCours: 0,
  })
  const [offresRecentes, setOffresRecentes] = useState<OffreRecente[]>([])
  const [candidaturesRecentes, setCandidaturesRecentes] = useState<CandidatureRecente[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Récupère les infos utilisateur
      const userResponse = await fetch('/api/auth/me')
      if (!userResponse.ok) {
        router.push('/c/connexion')
        return
      }
      const userData = await userResponse.json()

      if (userData.user.role !== 'CLIENT' && userData.user.role !== 'ADMIN') {
        router.push('/c/connexion')
        return
      }

      setData(userData)

      // Récupère les stats
      const statsResponse = await fetch('/api/client/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData.stats)
        setOffresRecentes(statsData.offresRecentes || [])
        setCandidaturesRecentes(statsData.candidaturesRecentes || [])
      }
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

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      PUBLIEE: { label: 'Publiée', className: 'bg-green-100 text-green-800' },
      EN_COURS: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
      CLOTUREE: { label: 'Clôturée', className: 'bg-orange-100 text-orange-800' },
      ARCHIVEE: { label: 'Archivée', className: 'bg-gray-100 text-gray-800' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getCandidatureStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      NOUVELLE: { label: 'Nouvelle', className: 'bg-blue-100 text-blue-800' },
      VUE: { label: 'Vue', className: 'bg-gray-100 text-gray-800' },
      PRESELECTION: { label: 'Présélection', className: 'bg-purple-100 text-purple-800' },
      SHORTLIST: { label: 'Shortlist', className: 'bg-green-100 text-green-800' },
      ENTRETIEN: { label: 'Entretien', className: 'bg-orange-100 text-orange-800' },
      ACCEPTEE: { label: 'Retenue', className: 'bg-green-100 text-green-800' },
      REFUSEE: { label: 'Refusée', className: 'bg-red-100 text-red-800' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.className}>{config.label}</Badge>
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
  const contactPrincipal = user.details?.contacts?.[0]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/">
                <Logo size="sm" showText />
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
                <Link href="/c/shortlists" className="text-gray-600 hover:text-primary">
                  Shortlists
                </Link>
                <Link href="/c/entretiens" className="text-gray-600 hover:text-primary">
                  Entretiens
                </Link>
                <Link href="/c/profil" className="text-gray-600 hover:text-primary">
                  Mon profil
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
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
              Bonjour {contactPrincipal?.prenom || 'Client'} !
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
          <Card className="hover:shadow-md transition-shadow">
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

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Candidatures</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCandidatures}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nouvelles</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.candidaturesNouvelles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Shortlists</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.shortlistsEnCours}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Offres récentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mes offres</CardTitle>
                <CardDescription>Vos dernières offres publiées</CardDescription>
              </div>
              <Link href="/c/offres">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {offresRecentes.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune offre publiée</p>
                  <Link href="/c/offres/nouvelle">
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Publier une offre
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {offresRecentes.map((offre) => (
                    <Link key={offre.uid} href={`/c/offres/${offre.uid}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{offre.titre}</span>
                            {getStatutBadge(offre.statut)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {offre.nbCandidatures} candidature(s)
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {offre.nbVues} vues
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Candidatures récentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Dernières candidatures</CardTitle>
                <CardDescription>Candidatures récentes sur vos offres</CardDescription>
              </div>
              <Link href="/c/candidatures">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {candidaturesRecentes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune candidature récente</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Publiez une offre pour recevoir des candidatures
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {candidaturesRecentes.map((candidature) => (
                    <div key={candidature.uid} className="flex items-center gap-4 p-4 rounded-lg bg-gray-50">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        {candidature.talent.photoUrl ? (
                          <img
                            src={candidature.talent.photoUrl}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {candidature.talent.prenom} {candidature.talent.nom}
                          </span>
                          {getCandidatureStatutBadge(candidature.statut)}
                        </div>
                        <p className="text-sm text-gray-500 truncate">
                          {candidature.talent.titrePoste || 'Consultant'}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Pour: {candidature.offre.titre}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-medium text-primary">
                          {candidature.scoreMatch}% match
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions rapides */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-4">
              <Link href="/c/offres/nouvelle" className="block">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition border border-primary/20">
                  <Plus className="w-5 h-5 text-primary" />
                  <span className="font-medium text-primary">Nouvelle offre</span>
                </div>
              </Link>
              <Link href="/c/shortlists" className="block">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <Star className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Mes shortlists</span>
                </div>
              </Link>
              <Link href="/c/profil" className="block">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <Building2 className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Profil entreprise</span>
                </div>
              </Link>
              <Link href="/freelances" className="block">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Voir les talents</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

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
