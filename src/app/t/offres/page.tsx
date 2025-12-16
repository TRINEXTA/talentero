'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'
import {
  Briefcase, MapPin, Clock, Euro, Building2, Bell, Settings, LogOut,
  Search, Star, ChevronRight, Calendar, Users, Filter, Zap
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
  competencesRequises: string[]
  experienceMin: number | null
  publieLe: string
  client: {
    raisonSociale: string
  } | null
  matchScore?: number | null
  matchDetails?: {
    matched: string[]
    missing: string[]
  } | null
}

export default function TalentOffresPage() {
  const router = useRouter()
  const [offres, setOffres] = useState<Offre[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [competence, setCompetence] = useState('')
  const [lieu, setLieu] = useState('')

  useEffect(() => {
    fetchOffres()
  }, [])

  const fetchOffres = async () => {
    setLoading(true)
    try {
      // Verifier l'authentification
      const authRes = await fetch('/api/auth/me', { credentials: 'include' })
      if (authRes.status === 401) {
        router.push('/t/connexion')
        return
      }
      // Si erreur serveur, on continue quand même
      if (!authRes.ok && authRes.status !== 401) {
        console.warn('Auth check warning:', authRes.status)
      }

      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (competence) params.set('competence', competence)
      if (lieu) params.set('lieu', lieu)

      const res = await fetch(`/api/offres?${params.toString()}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setOffres(data.offres)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => {
    fetchOffres()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getMobiliteLabel = (mobilite: string) => {
    const labels: Record<string, string> = {
      TELETRAVAIL: 'Teletravail',
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
      month: 'short',
    })
  }

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
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-primary font-medium">
                  Offres
                </Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/planning" className="text-gray-600 hover:text-primary">
                  Planning
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Offres de missions</h1>
          <p className="text-gray-600 mt-1">
            Trouvez votre prochaine mission freelance
          </p>
        </div>

        {/* Recherche */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher par mot-cle..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Zap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Competence (ex: React, Java...)"
                  value={competence}
                  onChange={(e) => setCompetence(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Ville ou region..."
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>
                <Search className="w-4 h-4 mr-2" />
                Rechercher
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des offres */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : offres.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune offre trouvee
              </h3>
              <p className="text-gray-500">
                Essayez de modifier vos criteres de recherche
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offres.map((offre) => (
              <Card key={offre.uid} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/t/offres/${offre.slug}`}>
                          <h3 className="text-lg font-semibold text-gray-900 hover:text-primary">
                            {offre.titre}
                          </h3>
                        </Link>
                        {offre.matchScore && offre.matchScore > 0 && (
                          <Badge className={`${
                            offre.matchScore >= 70 ? 'bg-green-100 text-green-800' :
                            offre.matchScore >= 40 ? 'bg-amber-100 text-amber-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            <Star className={`w-3 h-3 mr-1 ${offre.matchScore >= 70 ? 'fill-current' : ''}`} />
                            {offre.matchScore}% compatible
                          </Badge>
                        )}
                      </div>

                      {offre.client && (
                        <p className="text-gray-600 mb-3 flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {offre.client.raisonSociale}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-4">
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
                                ? `Jusqu'a ${offre.tjmMax} EUR/j`
                                : `A partir de ${offre.tjmMin} EUR/j`
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
                            Debut {formatDate(offre.dateDebut)}
                          </span>
                        )}
                      </div>

                      {offre.competencesRequises.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {offre.competencesRequises.slice(0, 6).map((comp, i) => {
                            const isMatched = offre.matchDetails?.matched.some(
                              m => m.toLowerCase() === comp.toLowerCase()
                            )
                            return (
                              <Badge
                                key={i}
                                variant="outline"
                                className={`text-xs ${isMatched ? 'bg-green-50 border-green-300 text-green-700' : ''}`}
                              >
                                {isMatched && <Star className="w-3 h-3 mr-1 fill-current" />}
                                {comp}
                              </Badge>
                            )
                          })}
                          {offre.competencesRequises.length > 6 && (
                            <Badge variant="outline" className="text-xs text-gray-400">
                              +{offre.competencesRequises.length - 6}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3 ml-4">
                      <span className="text-xs text-gray-400">
                        Publiée le {formatDate(offre.publieLe)}
                      </span>
                      <Link href={`/t/offres/${offre.slug}`}>
                        <Button>
                          Voir l'offre
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
