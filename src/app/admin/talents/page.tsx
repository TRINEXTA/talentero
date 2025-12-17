'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Users, Search, Filter, ChevronLeft, ChevronRight, Eye, Upload,
  CheckCircle, Clock, AlertTriangle, Mail, Phone, MapPin, Briefcase, Loader2
} from 'lucide-react'

interface Talent {
  uid: string
  prenom: string
  nom: string
  titrePoste: string | null
  competences: string[]
  tjm: number | null
  disponibilite: string
  statut: string
  compteLimite: boolean
  importeParAdmin: boolean
  visibleVitrine: boolean
  createdAt: string
  user: {
    email: string
    emailVerified: boolean
    isActive: boolean
    lastLoginAt: string | null
    activationToken: string | null
  }
  _count: {
    candidatures: number
    matchs: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

function AdminTalentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [talents, setTalents] = useState<Talent[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [statutFilter, setStatutFilter] = useState(searchParams.get('statut') || '')

  useEffect(() => {
    fetchTalents()
  }, [searchParams])

  const fetchTalents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', searchParams.get('page') || '1')
      if (search) params.set('search', search)
      if (statutFilter) params.set('statut', statutFilter)
      if (searchParams.get('compteLimite')) params.set('compteLimite', 'true')
      if (searchParams.get('importeParAdmin')) params.set('importeParAdmin', 'true')

      const res = await fetch(`/api/admin/talents?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setTalents(data.talents)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }
    params.set('page', '1')
    router.push(`/admin/talents?${params.toString()}`)
  }

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1')
    router.push(`/admin/talents?${params.toString()}`)
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      ACTIF: { label: 'Actif', className: 'bg-green-100 text-green-800' },
      INACTIF: { label: 'Inactif', className: 'bg-gray-100 text-gray-800' },
      EN_MISSION: { label: 'En mission', className: 'bg-blue-100 text-blue-800' },
      SUSPENDU: { label: 'Suspendu', className: 'bg-red-100 text-red-800' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.className}>{config.label}</Badge>
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold text-gray-900">Gestion des Talents</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/admin/import-cv">
                <Button variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Import unitaire
                </Button>
              </Link>
              <Link href="/admin/import-cv-masse">
                <Button className="bg-primary hover:bg-primary/90">
                  <Upload className="w-4 h-4 mr-2" />
                  Import en masse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{pagination.total}</div>
              <div className="text-sm text-gray-500">Total talents</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => handleFilterChange('statut', 'ACTIF')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-gray-500">Actifs</span>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => handleFilterChange('compteLimite', 'true')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-gray-500">Comptes limités</span>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-gray-50" onClick={() => handleFilterChange('importeParAdmin', 'true')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-gray-500">Importés</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher par nom, email, compétence..."
                    className="pl-10"
                  />
                </div>
              </form>
              <div className="flex gap-2">
                <select
                  value={statutFilter}
                  onChange={(e) => handleFilterChange('statut', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Tous les statuts</option>
                  <option value="ACTIF">Actif</option>
                  <option value="INACTIF">Inactif</option>
                  <option value="EN_MISSION">En mission</option>
                  <option value="SUSPENDU">Suspendu</option>
                </select>
                <select
                  value={searchParams.get('compteActif') || ''}
                  onChange={(e) => handleFilterChange('compteActif', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Tous les comptes</option>
                  <option value="true">Comptes actifs</option>
                  <option value="false">Comptes inactifs</option>
                </select>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch('')
                    setStatutFilter('')
                    router.push('/admin/talents')
                  }}
                >
                  Réinitialiser
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des talents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Talents ({pagination.total})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : talents.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Aucun talent trouvé</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talent</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compétences</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">TJM</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matchs</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {talents.map((talent) => (
                      <tr key={talent.uid} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {talent.prenom} {talent.nom}
                              </span>
                              {talent.user.isActive ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Compte actif</Badge>
                              ) : (
                                <Badge className="bg-red-100 text-red-800 text-xs">Compte inactif</Badge>
                              )}
                              {talent.importeParAdmin && (
                                <Badge variant="outline" className="text-xs">Importé</Badge>
                              )}
                              {talent.compteLimite && (
                                <Badge className="bg-yellow-100 text-yellow-800 text-xs">Limité</Badge>
                              )}
                              {!talent.user.activationToken && talent.user.emailVerified && (
                                <CheckCircle className="w-4 h-4 text-green-500" title="Email vérifié" />
                              )}
                            </div>
                            <div className="text-sm text-gray-500">{talent.user.email}</div>
                            {talent.titrePoste && (
                              <div className="text-sm text-gray-400">{talent.titrePoste}</div>
                            )}
                            {talent.user.lastLoginAt && (
                              <div className="text-xs text-gray-400">
                                Dernière connexion: {new Date(talent.user.lastLoginAt).toLocaleDateString('fr-FR')}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {talent.competences.slice(0, 4).map((comp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {comp}
                              </Badge>
                            ))}
                            {talent.competences.length > 4 && (
                              <Badge variant="outline" className="text-xs">
                                +{talent.competences.length - 4}
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {talent.tjm ? (
                            <span className="font-medium">{talent.tjm}€/j</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm">{getDisponibiliteLabel(talent.disponibilite)}</span>
                        </td>
                        <td className="px-4 py-4">
                          {getStatutBadge(talent.statut)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <span className="text-gray-900">{talent._count.matchs}</span>
                            <span className="text-gray-400"> matchs</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-900">{talent._count.candidatures}</span>
                            <span className="text-gray-400"> candid.</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Link href={`/admin/talents/${talent.uid}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              Voir
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  Page {pagination.page} sur {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('page', String(pagination.page - 1))
                      router.push(`/admin/talents?${params.toString()}`)
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('page', String(pagination.page + 1))
                      router.push(`/admin/talents?${params.toString()}`)
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default function AdminTalentsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <AdminTalentsContent />
    </Suspense>
  )
}
