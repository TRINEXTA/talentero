'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  User, Briefcase, FileText, Bell, Settings, LogOut,
  Search, TrendingUp, Clock, CheckCircle, AlertCircle,
  ChevronRight, Upload, MapPin, Building2, Star, Zap
} from 'lucide-react'

interface Stats {
  totalCandidatures: number
  candidaturesEnCours: number
  candidaturesAcceptees: number
  matchsRecents: number
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
    lieu: string | null
    tjmMin: number | null
    tjmMax: number | null
    client: string
  }
}

interface OffreRecommandee {
  score: number
  dejaPostule: boolean
  offre: {
    uid: string
    slug: string
    titre: string
    lieu: string | null
    tjmMin: number | null
    tjmMax: number | null
    modesTravail: string[]
    dureeMission: string | null
    datePublication: string | null
    client: {
      nom: string
      logo: string | null
    }
  }
}

interface UserDetails {
  prenom: string
  nom: string
  titrePoste: string | null
  competences: string[]
  statut: string
  photoUrl: string | null
  disponibilite: string | null
}

export default function TalentDashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ email: string; details: UserDetails | null } | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalCandidatures: 0,
    candidaturesEnCours: 0,
    candidaturesAcceptees: 0,
    matchsRecents: 0,
  })
  const [candidaturesRecentes, setCandidaturesRecentes] = useState<CandidatureRecente[]>([])
  const [offresRecommandees, setOffresRecommandees] = useState<OffreRecommandee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Récupère les infos utilisateur
      const userRes = await fetch('/api/auth/me')
      if (!userRes.ok) {
        router.push('/t/connexion')
        return
      }
      const userData = await userRes.json()

      if (userData.user.role !== 'TALENT') {
        router.push('/t/connexion')
        return
      }

      setUser(userData.user)

      // Récupère les stats
      const statsRes = await fetch('/api/talent/stats')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
        setCandidaturesRecentes(statsData.candidaturesRecentes || [])
        setOffresRecommandees(statsData.offresRecommandees || [])
      }
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

  const getStatutBadge = (statut: string) => {
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

  const getDisponibiliteLabel = (dispo: string | null) => {
    if (!dispo) return 'Non renseignée'
    const labels: Record<string, string> = {
      IMMEDIATE: 'Disponible immédiatement',
      SOUS_15_JOURS: 'Disponible sous 15 jours',
      SOUS_1_MOIS: 'Disponible sous 1 mois',
      SOUS_2_MOIS: 'Disponible sous 2 mois',
      SOUS_3_MOIS: 'Disponible sous 3 mois',
      NON_DISPONIBLE: 'Non disponible',
    }
    return labels[dispo] || dispo
  }

  const formatTJM = (min: number | null, max: number | null) => {
    if (min && max) return `${min} - ${max}€/j`
    if (max) return `Jusqu'à ${max}€/j`
    if (min) return `À partir de ${min}€/j`
    return 'TJM non précisé'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

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
                <User className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour {user.details?.prenom || 'Freelance'} !
            </h1>
            <p className="text-gray-600 mt-1">
              {getDisponibiliteLabel(user.details?.disponibilite || null)}
            </p>
          </div>
          <Link href="/offres">
            <Button size="lg">
              <Search className="w-4 h-4 mr-2" />
              Rechercher des offres
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
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
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">En cours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.candidaturesEnCours}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Retenues</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.candidaturesAcceptees}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Matchs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.matchsRecents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Candidatures récentes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mes candidatures</CardTitle>
                <CardDescription>Suivez l'état de vos candidatures</CardDescription>
              </div>
              <Link href="/t/candidatures">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {candidaturesRecentes.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucune candidature pour le moment</p>
                  <Link href="/offres">
                    <Button className="mt-4">
                      <Search className="w-4 h-4 mr-2" />
                      Voir les offres
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {candidaturesRecentes.map((candidature) => (
                    <Link key={candidature.uid} href={`/offres/${candidature.offre.slug}`}>
                      <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{candidature.offre.titre}</span>
                            {getStatutBadge(candidature.statut)}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {candidature.offre.client}
                            </span>
                            {candidature.offre.lieu && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {candidature.offre.lieu}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-primary">
                            {candidature.scoreMatch}% match
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offres recommandées */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Offres pour vous</CardTitle>
                <CardDescription>Basées sur votre profil et vos compétences</CardDescription>
              </div>
              <Link href="/offres">
                <Button variant="ghost" size="sm">
                  Voir tout
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {offresRecommandees.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Complétez votre profil pour voir les offres recommandées</p>
                  <Link href="/t/profil">
                    <Button className="mt-4" variant="outline">
                      <User className="w-4 h-4 mr-2" />
                      Compléter mon profil
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {offresRecommandees.map((match) => (
                    <Link key={match.offre.uid} href={`/offres/${match.offre.slug}`}>
                      <div className="p-4 rounded-lg border hover:border-primary hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{match.offre.titre}</h4>
                          <Badge className="bg-primary/10 text-primary">
                            {match.score}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {match.offre.client.nom}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                          {match.offre.lieu && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {match.offre.lieu}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {formatTJM(match.offre.tjmMin, match.offre.tjmMax)}
                          </span>
                          {match.offre.dureeMission && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {match.offre.dureeMission}
                            </span>
                          )}
                        </div>
                        {match.dejaPostule && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            Déjà postulé
                          </Badge>
                        )}
                      </div>
                    </Link>
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
              <Link href="/offres" className="block">
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg hover:bg-primary/10 transition border border-primary/20">
                  <Search className="w-5 h-5 text-primary" />
                  <span className="font-medium text-primary">Voir les offres</span>
                </div>
              </Link>
              <Link href="/t/profil" className="block">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <User className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Mon profil</span>
                </div>
              </Link>
              <Link href="/t/candidatures" className="block">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Mes candidatures</span>
                </div>
              </Link>
              <Link href="/t/alertes" className="block">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                  <Bell className="w-5 h-5 text-gray-600" />
                  <span className="font-medium">Mes alertes</span>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Status */}
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
                  <p className="font-medium">
                    Statut: {
                      user.details?.statut === 'ACTIF' ? 'Disponible' :
                      user.details?.statut === 'EN_MISSION' ? 'En mission' :
                      user.details?.statut || 'Non défini'
                    }
                  </p>
                  <p className="text-sm text-gray-500">
                    {user.details?.statut === 'ACTIF' ? 'Votre profil est visible par les recruteurs' :
                     user.details?.statut === 'EN_MISSION' ? 'Votre profil est masqué' :
                     'Complétez votre profil pour être visible'}
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
