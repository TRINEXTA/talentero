'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Users, Bell, Settings, LogOut, MapPin, Clock, Euro, Building2,
  Calendar, Briefcase, CheckCircle, XCircle, AlertTriangle, Star,
  ArrowLeft, Send, TrendingUp, Target, UserCheck, MapPinned, Loader2
} from 'lucide-react'

interface Offre {
  uid: string
  slug: string
  titre: string
  description: string
  lieu: string | null
  mobilite: string
  tjmMin: number | null
  tjmMax: number | null
  tjmAffiche: string | null
  dureeNombre: number | null
  dureeUnite: string | null
  dateDebut: string | null
  dateFin: string | null
  experienceMin: number | null
  competencesRequises: string[]
  competencesSouhaitees: string[]
  publieLe: string
  client: {
    raisonSociale: string
  } | null
}

interface MatchResult {
  score: number
  canApply: boolean
  recommendation: 'EXCELLENT' | 'BON' | 'MOYEN' | 'FAIBLE' | 'NON_RECOMMANDE'
  message: string
  details: {
    competences: {
      matched: string[]
      missing: string[]
      bonus: string[]
      score: number
    }
    experience: {
      required: number | null
      yours: number
      status: 'OK' | 'INSUFFISANT' | 'SURQUALIFIE'
      message: string
    }
    tjm: {
      offreMin: number | null
      offreMax: number | null
      yours: number | null
      status: 'OK' | 'TROP_HAUT' | 'TROP_BAS' | 'NON_RENSEIGNE'
      message: string
    }
    disponibilite: {
      status: 'DISPONIBLE' | 'BIENTOT' | 'NON_DISPONIBLE' | 'EN_MISSION'
      message: string
      conflits: string[]
    }
    localisation: {
      status: 'OK' | 'ELOIGNE' | 'NON_COMPATIBLE'
      message: string
    }
  }
  alreadyApplied: boolean
}

export default function TalentOffreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [offre, setOffre] = useState<Offre | null>(null)
  const [matching, setMatching] = useState<MatchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [matchingLoading, setMatchingLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    fetchOffre()
  }, [slug])

  const fetchOffre = async () => {
    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'include' })
      if (authRes.status === 401) {
        router.push('/t/connexion')
        return
      }
      // Si erreur serveur, on continue quand même (l'utilisateur est peut-être connecté)
      if (!authRes.ok && authRes.status !== 401) {
        console.warn('Auth check failed but continuing:', authRes.status)
      }

      const res = await fetch(`/api/offres/${slug}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setOffre(data.offre)
        // Automatically fetch matching
        fetchMatching(data.offre.uid)
      } else {
        router.push('/t/offres')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMatching = async (offreId: string) => {
    setMatchingLoading(true)
    try {
      const res = await fetch(`/api/talent/matching/${offreId}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setMatching(data)
        setApplied(data.alreadyApplied)
      }
    } catch (error) {
      console.error('Erreur matching:', error)
    } finally {
      setMatchingLoading(false)
    }
  }

  const handleApply = async () => {
    if (!offre || !matching?.canApply || applied) return

    setApplying(true)
    try {
      const res = await fetch('/api/talent/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offreId: offre.uid,
          motivation: `Candidature via matching automatique (score: ${matching.score}%)`
        })
      })

      if (res.ok) {
        setApplied(true)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setApplying(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getRecommendationConfig = (rec: MatchResult['recommendation']) => {
    switch (rec) {
      case 'EXCELLENT':
        return { color: 'bg-green-100 text-green-800 border-green-300', icon: <Star className="w-5 h-5 fill-current" /> }
      case 'BON':
        return { color: 'bg-blue-100 text-blue-800 border-blue-300', icon: <CheckCircle className="w-5 h-5" /> }
      case 'MOYEN':
        return { color: 'bg-amber-100 text-amber-800 border-amber-300', icon: <AlertTriangle className="w-5 h-5" /> }
      case 'FAIBLE':
        return { color: 'bg-orange-100 text-orange-800 border-orange-300', icon: <AlertTriangle className="w-5 h-5" /> }
      case 'NON_RECOMMANDE':
        return { color: 'bg-red-100 text-red-800 border-red-300', icon: <XCircle className="w-5 h-5" /> }
    }
  }

  const getMobiliteLabel = (mobilite: string) => {
    const labels: Record<string, string> = {
      TELETRAVAIL: 'Télétravail',
      HYBRIDE: 'Hybride',
      SUR_SITE: 'Sur site',
      FLEXIBLE: 'Flexible',
    }
    return labels[mobilite] || mobilite
  }

  const getDureeLabel = (nombre: number | null, unite: string | null) => {
    if (!nombre) return null
    const uniteLabel = unite === 'MOIS' ? 'mois' : unite === 'SEMAINES' ? 'semaines' : 'jours'
    return `${nombre} ${uniteLabel}`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!offre) return null

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
                <Users className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
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
        {/* Back link */}
        <Link href="/t/offres" className="inline-flex items-center gap-1 text-gray-600 hover:text-primary mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour aux offres
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Offre header */}
            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{offre.titre}</h1>

                {offre.client && (
                  <p className="text-lg text-gray-600 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    {offre.client.raisonSociale}
                  </p>
                )}

                <div className="flex flex-wrap gap-4 text-gray-600">
                  {offre.lieu && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {offre.lieu}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {getMobiliteLabel(offre.mobilite)}
                  </span>
                  {(offre.tjmMin || offre.tjmMax) && (
                    <span className="flex items-center gap-1">
                      <Euro className="w-4 h-4" />
                      {offre.tjmAffiche || (
                        offre.tjmMin && offre.tjmMax
                          ? `${offre.tjmMin} - ${offre.tjmMax} EUR/j`
                          : offre.tjmMax
                          ? `Jusqu'à ${offre.tjmMax} EUR/j`
                          : `À partir de ${offre.tjmMin} EUR/j`
                      )}
                    </span>
                  )}
                  {getDureeLabel(offre.dureeNombre, offre.dureeUnite) && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {getDureeLabel(offre.dureeNombre, offre.dureeUnite)}
                    </span>
                  )}
                  {offre.dateDebut && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Début {formatDate(offre.dateDebut)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description de la mission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-gray max-w-none">
                  <p className="whitespace-pre-wrap">{offre.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Compétences */}
            <Card>
              <CardHeader>
                <CardTitle>Compétences recherchées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {offre.competencesRequises.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Requises</h4>
                      <div className="flex flex-wrap gap-2">
                        {offre.competencesRequises.map((comp, i) => {
                          const isMatched = matching?.details.competences.matched.some(
                            m => m.toLowerCase() === comp.toLowerCase()
                          )
                          return (
                            <Badge
                              key={i}
                              variant="outline"
                              className={isMatched ? 'bg-green-50 border-green-300 text-green-700' : ''}
                            >
                              {isMatched && <CheckCircle className="w-3 h-3 mr-1" />}
                              {comp}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {offre.competencesSouhaitees.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Souhaitées (bonus)</h4>
                      <div className="flex flex-wrap gap-2">
                        {offre.competencesSouhaitees.map((comp, i) => {
                          const isMatched = matching?.details.competences.bonus.some(
                            b => b.toLowerCase() === comp.toLowerCase()
                          )
                          return (
                            <Badge
                              key={i}
                              variant="outline"
                              className={isMatched ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-gray-500'}
                            >
                              {isMatched && <Star className="w-3 h-3 mr-1" />}
                              {comp}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {offre.experienceMin && (
                    <div className="pt-2">
                      <span className="text-sm text-gray-600">
                        Expérience minimum: <strong>{offre.experienceMin} an(s)</strong>
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Matching */}
          <div className="space-y-6">
            {/* Matching Score */}
            {matchingLoading ? (
              <Card>
                <CardContent className="p-6 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <span className="ml-2">Analyse en cours...</span>
                </CardContent>
              </Card>
            ) : matching ? (
              <Card className="overflow-hidden">
                <div className={`p-4 ${getRecommendationConfig(matching.recommendation).color}`}>
                  <div className="flex items-center gap-3">
                    {getRecommendationConfig(matching.recommendation).icon}
                    <div>
                      <div className="text-2xl font-bold">{matching.score}%</div>
                      <div className="text-sm">Compatibilité</div>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6 space-y-4">
                  <p className="text-sm text-gray-700">{matching.message}</p>

                  {/* Details */}
                  <div className="space-y-3">
                    {/* Compétences */}
                    <div className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Compétences</span>
                          <Badge variant="outline" className={
                            matching.details.competences.score >= 80 ? 'bg-green-50 text-green-700' :
                            matching.details.competences.score >= 50 ? 'bg-amber-50 text-amber-700' :
                            'bg-red-50 text-red-700'
                          }>
                            {matching.details.competences.score}%
                          </Badge>
                        </div>
                        {matching.details.competences.missing.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Manquantes: {matching.details.competences.missing.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Expérience */}
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Expérience</span>
                          <Badge variant="outline" className={
                            matching.details.experience.status === 'OK' ? 'bg-green-50 text-green-700' :
                            matching.details.experience.status === 'SURQUALIFIE' ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-700'
                          }>
                            {matching.details.experience.status === 'OK' ? 'OK' :
                             matching.details.experience.status === 'SURQUALIFIE' ? 'Surqualifié' : 'Insuffisant'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{matching.details.experience.message}</p>
                      </div>
                    </div>

                    {/* TJM */}
                    <div className="flex items-start gap-3">
                      <Euro className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">TJM</span>
                          <Badge variant="outline" className={
                            matching.details.tjm.status === 'OK' ? 'bg-green-50 text-green-700' :
                            matching.details.tjm.status === 'NON_RENSEIGNE' ? 'bg-gray-50 text-gray-600' :
                            'bg-amber-50 text-amber-700'
                          }>
                            {matching.details.tjm.status === 'OK' ? 'Compatible' :
                             matching.details.tjm.status === 'NON_RENSEIGNE' ? 'Non renseigné' :
                             matching.details.tjm.status === 'TROP_HAUT' ? 'Trop élevé' : 'Trop bas'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{matching.details.tjm.message}</p>
                      </div>
                    </div>

                    {/* Disponibilité */}
                    <div className="flex items-start gap-3">
                      <UserCheck className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Disponibilité</span>
                          <Badge variant="outline" className={
                            matching.details.disponibilite.status === 'DISPONIBLE' ? 'bg-green-50 text-green-700' :
                            matching.details.disponibilite.status === 'BIENTOT' ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-700'
                          }>
                            {matching.details.disponibilite.status === 'DISPONIBLE' ? 'Disponible' :
                             matching.details.disponibilite.status === 'BIENTOT' ? 'Bientôt' :
                             matching.details.disponibilite.status === 'EN_MISSION' ? 'En mission' : 'Indisponible'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{matching.details.disponibilite.message}</p>
                        {matching.details.disponibilite.conflits.length > 0 && (
                          <p className="text-xs text-red-500 mt-1">
                            Conflits: {matching.details.disponibilite.conflits.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Localisation */}
                    <div className="flex items-start gap-3">
                      <MapPinned className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Mobilité</span>
                          <Badge variant="outline" className={
                            matching.details.localisation.status === 'OK' ? 'bg-green-50 text-green-700' :
                            'bg-red-50 text-red-700'
                          }>
                            {matching.details.localisation.status === 'OK' ? 'Compatible' : 'Incompatible'}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{matching.details.localisation.message}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-4 border-t space-y-3">
                    {applied ? (
                      <Button className="w-full" disabled>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Candidature envoyée
                      </Button>
                    ) : matching.canApply ? (
                      <Button className="w-full" onClick={handleApply} disabled={applying}>
                        {applying ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        {applying ? 'Envoi en cours...' : 'Postuler à cette offre'}
                      </Button>
                    ) : (
                      <Button className="w-full" disabled variant="outline">
                        <XCircle className="w-4 h-4 mr-2" />
                        Candidature non recommandée
                      </Button>
                    )}

                    <Link href="/t/planning">
                      <Button variant="outline" className="w-full">
                        <Calendar className="w-4 h-4 mr-2" />
                        Voir mon planning
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Published date */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-500">
                  Publiée le {formatDate(offre.publieLe)}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
