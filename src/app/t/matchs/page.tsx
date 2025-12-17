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
  Zap, MapPin, Euro, Calendar, Building2, Clock, CheckCircle,
  Settings, LogOut, Eye, ChevronRight, Star, Target, Briefcase
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface MatchOffre {
  uid: string
  codeUnique: string
  slug: string
  titre: string
  description: string
  competencesRequises: string[]
  tjmMin: number | null
  tjmMax: number | null
  tjmAffiche: number | null
  ville: string | null
  mobilite: string
  dureeNombre: number | null
  dureeUnite: string
  dateDebut: string | null
  statut: string
  publieLe: string | null
  client: {
    raisonSociale: string
    logoUrl: string | null
    secteurActivite: string | null
  } | null
}

interface Match {
  id: number
  score: number
  competencesMatchees: string[]
  competencesManquantes: string[]
  vuParTalent: boolean
  createdAt: string
  offre: MatchOffre
  candidatureStatut: string | null
  aPostule: boolean
}

interface MatchStats {
  totalMatchs: number
  matchsNonVus: number
  matchsExcellents: number
  matchsBons: number
  dejaPostule: number
}

const mobiliteLabels: Record<string, string> = {
  FULL_REMOTE: 'Full remote',
  HYBRIDE: 'Hybride',
  SUR_SITE: 'Sur site',
  FLEXIBLE: 'Flexible',
}

const candidatureStatutLabels: Record<string, { label: string; color: string }> = {
  NOUVELLE: { label: 'Envoyée', color: 'bg-blue-100 text-blue-800' },
  VUE: { label: 'Vue', color: 'bg-gray-100 text-gray-800' },
  PRESELECTION: { label: 'Présélection', color: 'bg-purple-100 text-purple-800' },
  SHORTLIST: { label: 'Shortlist', color: 'bg-green-100 text-green-800' },
  ENTRETIEN: { label: 'Entretien', color: 'bg-orange-100 text-orange-800' },
  ACCEPTEE: { label: 'Retenue', color: 'bg-green-100 text-green-800' },
  REFUSEE: { label: 'Non retenue', color: 'bg-red-100 text-red-800' },
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-500'
  if (score >= 60) return 'bg-yellow-500'
  if (score >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Bon'
  if (score >= 40) return 'Moyen'
  return 'Faible'
}

export default function TalentMatchsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [matchs, setMatchs] = useState<Match[]>([])
  const [stats, setStats] = useState<MatchStats | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchMatchs()
  }, [])

  const fetchMatchs = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/t/connexion')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'TALENT') {
        router.push('/t/connexion')
        return
      }

      const res = await fetch('/api/talent/matchs')
      if (res.ok) {
        const data = await res.json()
        setMatchs(data.matchs)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsViewed = async (matchId: number) => {
    try {
      await fetch('/api/talent/matchs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAsViewed', matchId }),
      })
      // Update local state
      setMatchs(prev =>
        prev.map(m => (m.id === matchId ? { ...m, vuParTalent: true } : m))
      )
      if (stats) {
        setStats({ ...stats, matchsNonVus: Math.max(0, stats.matchsNonVus - 1) })
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const filteredMatchs = matchs.filter(m => {
    if (filter === 'all') return true
    if (filter === 'excellent') return m.score >= 80
    if (filter === 'bon') return m.score >= 60 && m.score < 80
    if (filter === 'non_postule') return !m.aPostule
    if (filter === 'nouveau') return !m.vuParTalent
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-700">
      {/* Header */}
      <header className="bg-gray-600 border-gray-500 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <Link href="/">
                <Logo size="sm" showText />
              </Link>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-300 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-300 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/matchs" className="text-primary font-medium">
                  Mes Matchs
                </Link>
                <Link href="/t/candidatures" className="text-gray-300 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/entretiens" className="text-gray-300 hover:text-primary">
                  Entretiens
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Link href="/t/profil">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/t/connexion')
                }}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Zap className="h-7 w-7 text-yellow-500" />
              Mes Matchs
            </h1>
            <p className="text-gray-300">Offres qui correspondent à votre profil</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Zap className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalMatchs}</p>
                    <p className="text-sm text-gray-300">Total matchs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={stats.matchsNonVus > 0 ? 'bg-gray-600 border-l-4 border-l-yellow-500' : 'bg-gray-600 border-gray-500'}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Eye className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.matchsNonVus}</p>
                    <p className="text-sm text-gray-300">Nouveaux</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Star className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.matchsExcellents}</p>
                    <p className="text-sm text-gray-300">Excellents (80%+)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Target className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.matchsBons}</p>
                    <p className="text-sm text-gray-300">Bons (60-79%)</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.dejaPostule}</p>
                    <p className="text-sm text-gray-300">Déjà postulé</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'nouveau', label: 'Nouveaux' },
            { value: 'excellent', label: 'Excellents (80%+)' },
            { value: 'bon', label: 'Bons (60%+)' },
            { value: 'non_postule', label: 'Non postulé' },
          ].map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Match List */}
        <div className="space-y-4">
          {filteredMatchs.length === 0 ? (
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="py-12 text-center">
                <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-white mb-2">Aucun match trouvé</p>
                <p className="text-sm text-gray-300">
                  Complétez votre profil pour améliorer vos matchs
                </p>
                <Link href="/t/profil">
                  <Button variant="outline" className="mt-4">
                    Compléter mon profil
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredMatchs.map(match => (
              <Card
                key={match.id}
                className={`hover:shadow-md transition-shadow ${
                  !match.vuParTalent ? 'bg-gray-600 border-l-4 border-l-yellow-500' : 'bg-gray-600 border-gray-500'
                }`}
                onClick={() => !match.vuParTalent && markAsViewed(match.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {/* Score Badge */}
                        <div className={`px-3 py-1 rounded-full text-white text-sm font-bold ${getScoreColor(match.score)}`}>
                          {match.score}% - {getScoreLabel(match.score)}
                        </div>

                        {!match.vuParTalent && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            Nouveau
                          </Badge>
                        )}

                        {match.aPostule && match.candidatureStatut && (
                          <Badge className={candidatureStatutLabels[match.candidatureStatut]?.color || 'bg-gray-100'}>
                            {candidatureStatutLabels[match.candidatureStatut]?.label || match.candidatureStatut}
                          </Badge>
                        )}
                      </div>

                      <Link href={`/t/offres/${match.offre.slug}`}>
                        <h3 className="font-semibold text-lg text-white hover:text-primary mb-1">
                          {match.offre.titre}
                        </h3>
                      </Link>

                      {match.offre.client && (
                        <div className="flex items-center gap-2 text-gray-300 mb-3">
                          <Building2 className="h-4 w-4" />
                          <span>{match.offre.client.raisonSociale}</span>
                          {match.offre.client.secteurActivite && (
                            <span className="text-gray-300">• {match.offre.client.secteurActivite}</span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-300 mb-4">
                        {match.offre.ville && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {match.offre.ville}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {mobiliteLabels[match.offre.mobilite] || match.offre.mobilite}
                        </span>
                        {(match.offre.tjmMin || match.offre.tjmMax || match.offre.tjmAffiche) && (
                          <span className="flex items-center gap-1">
                            <Euro className="h-4 w-4" />
                            {match.offre.tjmAffiche
                              ? `${match.offre.tjmAffiche}€/j`
                              : `${match.offre.tjmMin || '?'} - ${match.offre.tjmMax || '?'}€/j`}
                          </span>
                        )}
                        {match.offre.dureeNombre && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {match.offre.dureeNombre} {match.offre.dureeUnite.toLowerCase()}
                          </span>
                        )}
                      </div>

                      {/* Compétences matchées */}
                      <div className="mb-3">
                        <p className="text-xs text-gray-300 mb-1">Compétences matchées :</p>
                        <div className="flex flex-wrap gap-1">
                          {match.competencesMatchees.slice(0, 6).map(comp => (
                            <Badge key={comp} variant="outline" className="text-green-700 border-green-300 bg-green-50">
                              ✓ {comp}
                            </Badge>
                          ))}
                          {match.competencesMatchees.length > 6 && (
                            <Badge variant="outline" className="border-gray-400 text-gray-200">
                              +{match.competencesMatchees.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {match.competencesManquantes.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-300 mb-1">Compétences manquantes :</p>
                          <div className="flex flex-wrap gap-1">
                            {match.competencesManquantes.slice(0, 4).map(comp => (
                              <Badge key={comp} variant="outline" className="text-orange-700 border-orange-300 bg-orange-50">
                                {comp}
                              </Badge>
                            ))}
                            {match.competencesManquantes.length > 4 && (
                              <Badge variant="outline" className="border-gray-400 text-gray-200">
                                +{match.competencesManquantes.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                      <Link href={`/t/offres/${match.offre.slug}`}>
                        <Button>
                          Voir l'offre
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>

                      {!match.aPostule && (
                        <Link href={`/t/offres/${match.offre.slug}?postuler=1`}>
                          <Button variant="outline" className="text-primary border-primary">
                            Postuler
                          </Button>
                        </Link>
                      )}

                      {match.offre.publieLe && (
                        <p className="text-xs text-gray-300">
                          Publié {format(new Date(match.offre.publieLe), 'd MMM', { locale: fr })}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
