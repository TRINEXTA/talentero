'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Search, Filter, MapPin, Clock, Briefcase, ChevronRight,
  ChevronLeft, User, Zap, Shield, ArrowRight, Loader2
} from 'lucide-react'

interface Profile {
  id: string
  reference: string
  titre: string
  competences: string[]
  experience: number
  mobilite: string
  disponibilite: string
  localisation: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function FreelancesVitrineContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [profiles, setProfiles] = useState<Profile[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [specialites, setSpecialites] = useState<{ label: string; count: number }[]>([])

  const specialiteFilter = searchParams.get('specialite') || ''

  useEffect(() => {
    fetchProfiles()
  }, [searchParams])

  const fetchProfiles = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', searchParams.get('page') || '1')
      if (specialiteFilter) params.set('specialite', specialiteFilter)

      const res = await fetch(`/api/vitrine?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setProfiles(data.profiles)
        setPagination(data.pagination)
        setSpecialites(data.filters.specialites)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (specialite: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (specialite) {
      params.set('specialite', specialite)
    } else {
      params.delete('specialite')
    }
    params.set('page', '1')
    router.push(`/freelances?${params.toString()}`)
  }

  const getMobiliteLabel = (mobilite: string) => {
    const labels: Record<string, string> = {
      FULL_REMOTE: 'Full Remote',
      HYBRIDE: 'Hybride',
      SUR_SITE: 'Sur site',
      FLEXIBLE: 'Flexible',
    }
    return labels[mobilite] || mobilite
  }

  const getDisponibiliteLabel = (dispo: string) => {
    const labels: Record<string, string> = {
      IMMEDIATE: 'Immédiate',
      SOUS_15_JOURS: 'Sous 15 jours',
      SOUS_1_MOIS: 'Sous 1 mois',
      SOUS_2_MOIS: 'Sous 2 mois',
      SOUS_3_MOIS: 'Sous 3 mois',
      DATE_PRECISE: 'Date précise',
      NON_DISPONIBLE: 'Non disponible',
    }
    return labels[dispo] || dispo
  }

  const getDisponibiliteBadgeClass = (dispo: string) => {
    if (dispo === 'IMMEDIATE') return 'bg-green-100 text-green-800'
    if (dispo === 'SOUS_15_JOURS') return 'bg-emerald-100 text-emerald-800'
    if (dispo === 'NON_DISPONIBLE') return 'bg-gray-100 text-gray-800'
    return 'bg-blue-100 text-blue-800'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <Logo size="sm" showText />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/offres" className="text-gray-600 hover:text-gray-900">
                Offres
              </Link>
              <Link href="/freelances" className="text-primary font-medium">
                Freelances
              </Link>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Link href="/c/inscription">
                <Button>Recrutez un talent</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Nos Experts IT Freelance
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
            Découvrez notre vivier de {pagination.total}+ consultants IT qualifiés,
            prêts à rejoindre vos projets.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/c/inscription">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                <Briefcase className="w-5 h-5 mr-2" />
                Publier une offre
              </Button>
            </Link>
            <Link href="/t/inscription">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                <User className="w-5 h-5 mr-2" />
                Rejoindre le vivier
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-8 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Profils vérifiés</p>
                <p className="text-sm text-gray-500">CV et compétences validés par TRINEXTA</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Matching IA</p>
                <p className="text-sm text-gray-500">Trouvez le bon profil instantanément</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Disponibilité en temps réel</p>
                <p className="text-sm text-gray-500">Statuts de disponibilité actualisés</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filtres */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtrer par spécialité
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => handleFilterChange('')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      !specialiteFilter
                        ? 'bg-primary text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Toutes les spécialités
                  </button>
                  {specialites.map((spec) => (
                    <button
                      key={spec.label}
                      onClick={() => handleFilterChange(spec.label || '')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex justify-between items-center ${
                        specialiteFilter === spec.label
                          ? 'bg-primary text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="truncate">{spec.label}</span>
                      <span className={`text-xs ${
                        specialiteFilter === spec.label ? 'text-white/70' : 'text-gray-400'
                      }`}>
                        {spec.count}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Liste des profils */}
          <div className="flex-1">
            {/* Résultats */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-gray-600">
                <strong>{pagination.total}</strong> experts disponibles
                {specialiteFilter && (
                  <span> en <strong>{specialiteFilter}</strong></span>
                )}
              </p>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl p-6 animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                    <div className="flex gap-2 mb-4">
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : profiles.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Aucun profil trouvé
                </h3>
                <p className="text-gray-500 mb-6">
                  Essayez de modifier vos filtres de recherche.
                </p>
                <Button onClick={() => handleFilterChange('')} variant="outline">
                  Voir tous les profils
                </Button>
              </div>
            ) : (
              <>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {profiles.map((profile) => (
                    <Card key={profile.id} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-xs text-gray-400 font-mono">
                            {profile.reference}
                          </span>
                          <Badge className={getDisponibiliteBadgeClass(profile.disponibilite)}>
                            {getDisponibiliteLabel(profile.disponibilite)}
                          </Badge>
                        </div>

                        <h3 className="font-semibold text-gray-900 text-lg mb-2">
                          {profile.titre}
                        </h3>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {profile.competences.slice(0, 5).map((comp, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {comp}
                            </Badge>
                          ))}
                          {profile.competences.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{profile.competences.length - 5}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-gray-400" />
                            <span>{profile.experience} ans d'expérience</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            <span>{profile.localisation}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span>{getMobiliteLabel(profile.mobilite)}</span>
                          </div>
                        </div>

                        <Link href={`/c/inscription?ref=${profile.id}`}>
                          <Button className="w-full" variant="outline">
                            Contacter ce profil
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center mt-8 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', String(pagination.page - 1))
                        router.push(`/freelances?${params.toString()}`)
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="px-4 text-sm text-gray-600">
                      Page {pagination.page} sur {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => {
                        const params = new URLSearchParams(searchParams.toString())
                        params.set('page', String(pagination.page + 1))
                        router.push(`/freelances?${params.toString()}`)
                      }}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* CTA Final */}
      <section className="bg-primary py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Vous ne trouvez pas le profil idéal ?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Publiez votre offre et laissez notre IA trouver les talents qui correspondent
            parfaitement à vos besoins.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/c/inscription">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                Créer un compte entreprise
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Nous contacter
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo size="sm" darkMode />
              <span className="text-white/60">Opéré par TRINEXTA</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/cgu" className="hover:text-white">CGU</Link>
              <Link href="/cgv" className="hover:text-white">CGV</Link>
              <Link href="/mentions-legales" className="hover:text-white">Mentions légales</Link>
              <Link href="/politique-confidentialite" className="hover:text-white">Confidentialité</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function FreelancesVitrinePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <FreelancesVitrineContent />
    </Suspense>
  )
}
