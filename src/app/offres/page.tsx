"use client"

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '@/components/ui/logo'
import {
  Search, MapPin, Briefcase, Building2, Filter, X
} from 'lucide-react'

interface Offre {
  id: number
  uid: string
  slug: string
  titre: string
  description: string
  competencesRequises: string[]
  competencesSouhaitees: string[]
  tjmMin: number | null
  tjmMax: number | null
  dureeNombre: number | null
  dureeUnite: string | null
  lieu: string | null
  mobilite: string
  experienceMin: number | null
  publieLe: string
  client: {
    raisonSociale: string
    secteurActivite: string | null
    logoUrl: string | null
  } | null
}

const MOBILITE_LABELS: Record<string, string> = {
  FULL_REMOTE: 'Full Remote',
  HYBRIDE: 'Hybride',
  SUR_SITE: 'Sur site',
  FLEXIBLE: 'Flexible',
}

const VILLES_FRANCE = [
  'Paris',
  'Lyon',
  'Marseille',
  'Toulouse',
  'Nice',
  'Nantes',
  'Strasbourg',
  'Montpellier',
  'Bordeaux',
  'Lille',
  'Rennes',
  'Grenoble',
  'Aix-en-Provence',
  'Saint-Etienne',
  'Toulon',
]

export default function OffresPage() {
  const [offres, setOffres] = useState<Offre[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mobilite, setMobilite] = useState('')
  const [lieu, setLieu] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOffres()
    }, 300)
    return () => clearTimeout(timer)
  }, [search, mobilite, lieu, pagination.page])

  const fetchOffres = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (search) params.set('search', search)
      if (mobilite) params.set('mobilite', mobilite)
      if (lieu) params.set('lieu', lieu)

      const response = await fetch(`/api/offres?${params}`)
      const data = await response.json()

      setOffres(data.offres)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setMobilite('')
    setLieu('')
    setPagination({ ...pagination, page: 1 })
  }

  const formatTJM = (min: number | null, max: number | null) => {
    if (min && max) return `${min} - ${max} €/j`
    if (min) return `À partir de ${min} €/j`
    if (max) return `Jusqu'à ${max} €/j`
    return 'TJM à définir'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
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
              <Link href="/offres" className="text-primary font-medium">
                Offres
              </Link>
              <Link href="/freelances" className="text-gray-600 hover:text-gray-900">
                Freelances
              </Link>
              <Link href="/apropos" className="text-gray-600 hover:text-gray-900">
                A propos
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link href="/t/connexion">
                <Button variant="ghost">Connexion</Button>
              </Link>
              <Link href="/t/inscription">
                <Button>S&apos;inscrire</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-hero text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Trouvez votre prochaine mission IT
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            {pagination.total} offres disponibles
          </p>

          {/* Search Form */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par mot-cle, competence..."
                className="pl-12 h-12 text-gray-900 bg-white"
              />
            </div>
            <Select value={lieu} onValueChange={setLieu}>
              <SelectTrigger className="h-12 w-full md:w-48 bg-white text-gray-900">
                <MapPin className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Ville" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les villes</SelectItem>
                {VILLES_FRANCE.map((ville) => (
                  <SelectItem key={ville} value={ville}>{ville}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={mobilite} onValueChange={setMobilite}>
              <SelectTrigger className="h-12 w-full md:w-48 bg-white text-gray-900">
                <SelectValue placeholder="Mobilite" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="FULL_REMOTE">Full Remote</SelectItem>
                <SelectItem value="HYBRIDE">Hybride</SelectItem>
                <SelectItem value="SUR_SITE">Sur site</SelectItem>
                <SelectItem value="FLEXIBLE">Flexible</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Active Filters */}
      {(search || (mobilite && mobilite !== 'all') || (lieu && lieu !== 'all')) && (
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Filtres actifs:</span>
              {search && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {search}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setSearch('')} />
                </Badge>
              )}
              {lieu && lieu !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {lieu}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setLieu('')} />
                </Badge>
              )}
              {mobilite && mobilite !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {MOBILITE_LABELS[mobilite]}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => setMobilite('')} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                Tout effacer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : offres.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              Aucune offre trouvée
            </h3>
            <p className="text-gray-500">
              Essayez de modifier vos critères de recherche
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {offres.map((offre) => (
                <Link key={offre.uid} href={`/offres/${offre.slug}`}>
                  <Card className="hover:shadow-md transition cursor-pointer">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            {offre.client?.logoUrl ? (
                              <img
                                src={offre.client.logoUrl}
                                alt={offre.client.raisonSociale}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                <Building2 className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {offre.titre}
                              </h3>
                              <p className="text-gray-500 text-sm mb-2">
                                {offre.client?.raisonSociale || 'TRINEXTA'}
                                {offre.client?.secteurActivite && ` • ${offre.client.secteurActivite}`}
                              </p>
                              <p className="text-gray-600 text-sm line-clamp-2">
                                {offre.description}
                              </p>
                            </div>
                          </div>

                          {/* Compétences */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            {offre.competencesRequises.slice(0, 5).map((comp) => (
                              <Badge key={comp} variant="secondary">
                                {comp}
                              </Badge>
                            ))}
                            {offre.competencesRequises.length > 5 && (
                              <Badge variant="outline">
                                +{offre.competencesRequises.length - 5}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Info side */}
                        <div className="flex flex-col items-end gap-2 min-w-[200px]">
                          <div className="text-right">
                            <div className="text-lg font-semibold text-primary">
                              {formatTJM(offre.tjmMin, offre.tjmMax)}
                            </div>
                            {offre.dureeNombre && (
                              <p className="text-sm text-gray-500">
                                {offre.dureeNombre} {offre.dureeUnite === 'JOURS' ? 'jours' : 'mois'}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2 justify-end">
                            {offre.lieu && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="w-3 h-3 mr-1" />
                                {offre.lieu}
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {MOBILITE_LABELS[offre.mobilite] || offre.mobilite}
                            </Badge>
                          </div>

                          <p className="text-xs text-gray-400 mt-2">
                            Publiée le {formatDate(offre.publieLe)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  disabled={pagination.page === 1}
                  onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                >
                  Précédent
                </Button>
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Page {pagination.page} sur {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={pagination.page === pagination.totalPages}
                  onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                >
                  Suivant
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
