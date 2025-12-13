"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft, Briefcase, MapPin, Euro, Clock, Building2, ChevronRight,
  CheckCircle, XCircle, AlertCircle, Eye
} from 'lucide-react'

interface Candidature {
  id: number
  uid: string
  tjmPropose: number | null
  motivation: string | null
  scoreMatch: number | null
  statut: string
  createdAt: string
  vueLe: string | null
  offre: {
    uid: string
    slug: string
    titre: string
    tjmMin: number | null
    tjmMax: number | null
    lieu: string | null
    client: {
      raisonSociale: string
    } | null
  }
}

const STATUT_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'info'; icon: any }> = {
  NOUVELLE: { label: 'Nouvelle', variant: 'info', icon: Clock },
  VUE: { label: 'Vue', variant: 'secondary', icon: Eye },
  EN_REVUE: { label: 'En revue', variant: 'warning', icon: AlertCircle },
  SHORTLIST: { label: 'Présélectionné', variant: 'success', icon: CheckCircle },
  PROPOSEE_CLIENT: { label: 'Proposée au client', variant: 'info', icon: Building2 },
  ENTRETIEN: { label: 'Entretien', variant: 'success', icon: CheckCircle },
  ACCEPTEE: { label: 'Acceptée', variant: 'success', icon: CheckCircle },
  REFUSEE: { label: 'Refusée', variant: 'destructive', icon: XCircle },
  RETIREE: { label: 'Retirée', variant: 'secondary', icon: XCircle },
}

export default function TalentCandidaturesPage() {
  const router = useRouter()
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchCandidatures()
  }, [filter])

  const fetchCandidatures = async () => {
    try {
      const params = new URLSearchParams()
      if (filter) params.set('statut', filter)

      const response = await fetch(`/api/candidatures?${params}`)
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/t/connexion')
          return
        }
        throw new Error('Erreur')
      }
      const data = await response.json()
      setCandidatures(data.candidatures)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatTJM = (min: number | null, max: number | null) => {
    if (min && max) return `${min} - ${max} €/j`
    if (min) return `${min}+ €/j`
    if (max) return `≤${max} €/j`
    return 'TJM non précisé'
  }

  // Compteurs par statut
  const stats = {
    total: candidatures.length,
    enCours: candidatures.filter(c => ['NOUVELLE', 'VUE', 'EN_REVUE', 'SHORTLIST', 'PROPOSEE_CLIENT', 'ENTRETIEN'].includes(c.statut)).length,
    acceptees: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
    refusees: candidatures.filter(c => c.statut === 'REFUSEE').length,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/t/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Retour au dashboard
            </Link>
            <Link href="/" className="text-2xl font-bold text-primary">
              Talentero
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes candidatures</h1>
            <p className="text-gray-600 mt-1">Suivez l'état de vos candidatures</p>
          </div>
          <Link href="/offres">
            <Button>
              <Briefcase className="w-4 h-4 mr-2" />
              Voir les offres
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter(null)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('EN_REVUE')}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.enCours}</p>
              <p className="text-sm text-gray-500">En cours</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('ACCEPTEE')}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.acceptees}</p>
              <p className="text-sm text-gray-500">Acceptées</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition" onClick={() => setFilter('REFUSEE')}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-600">{stats.refusees}</p>
              <p className="text-sm text-gray-500">Refusées</p>
            </CardContent>
          </Card>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : candidatures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Aucune candidature
              </h3>
              <p className="text-gray-500 mb-4">
                Vous n'avez pas encore postulé à des offres
              </p>
              <Link href="/offres">
                <Button>Voir les offres disponibles</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidatures.map((candidature) => {
              const statutConfig = STATUT_CONFIG[candidature.statut] || STATUT_CONFIG.NOUVELLE
              const StatutIcon = statutConfig.icon

              return (
                <Link key={candidature.uid} href={`/offres/${candidature.offre.slug}`}>
                  <Card className="hover:shadow-md transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {candidature.offre.titre}
                            </h3>
                            <Badge variant={statutConfig.variant as any}>
                              <StatutIcon className="w-3 h-3 mr-1" />
                              {statutConfig.label}
                            </Badge>
                          </div>

                          <p className="text-gray-500 mb-3">
                            {candidature.offre.client?.raisonSociale || 'TRINEXTA'}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Euro className="w-4 h-4" />
                              {formatTJM(candidature.offre.tjmMin, candidature.offre.tjmMax)}
                            </span>
                            {candidature.offre.lieu && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {candidature.offre.lieu}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Postulé le {formatDate(candidature.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          {candidature.scoreMatch !== null && (
                            <div className={`text-2xl font-bold ${
                              candidature.scoreMatch >= 70 ? 'text-green-600' :
                              candidature.scoreMatch >= 50 ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                              {candidature.scoreMatch}%
                            </div>
                          )}
                          <p className="text-xs text-gray-500">Score match</p>

                          {candidature.tjmPropose && (
                            <p className="text-sm text-gray-600 mt-2">
                              TJM proposé: {candidature.tjmPropose}€
                            </p>
                          )}
                        </div>
                      </div>

                      {candidature.motivation && (
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            <strong>Motivation:</strong> {candidature.motivation}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
