'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Shield, Briefcase, Bell, LogOut, Search, Plus,
  CheckCircle, XCircle, Eye, MapPin, Calendar, Euro, Users, Building2
} from 'lucide-react'

interface Offre {
  uid: string
  codeUnique: string
  slug: string
  titre: string
  statut: string
  typeOffre: string
  lieu: string | null
  tjmMin: number | null
  tjmMax: number | null
  dureeNombre: number | null
  dureeUnite: string | null
  createdAt: string
  publieLe: string | null
  client: {
    uid: string
    raisonSociale: string
  } | null
  _count: {
    candidatures: number
    matchs: number
  }
}

export default function AdminOffresPage() {
  const router = useRouter()
  const [offres, setOffres] = useState<Offre[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchOffres()
  }, [filter])

  const fetchOffres = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('statut', filter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/offres?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setOffres(data.offres)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (uid: string, action: string) => {
    try {
      const res = await fetch(`/api/admin/offres/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        fetchOffres()
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-600' },
      EN_ATTENTE_VALIDATION: { label: 'En attente', className: 'bg-yellow-600' },
      PUBLIEE: { label: 'Publiee', className: 'bg-green-600' },
      POURVUE: { label: 'Pourvue', className: 'bg-purple-600' },
      FERMEE: { label: 'Fermee', className: 'bg-orange-600' },
      EXPIREE: { label: 'Expiree', className: 'bg-gray-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getTypeOffreBadge = (type: string) => {
    const labels: Record<string, string> = {
      CLIENT_DIRECT: 'Direct',
      SOUSTRAITANCE: 'Sous-traitance',
      INTERNE: 'Interne',
    }
    return <Badge variant="outline" className="text-gray-300 border-gray-600">{labels[type] || type}</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const getDureeLabel = (nombre: number | null, unite: string | null) => {
    if (!nombre) return null
    const uniteLabel = unite === 'MOIS' ? 'mois' : unite === 'SEMAINES' ? 'sem.' : 'j'
    return `${nombre} ${uniteLabel}`
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-2xl font-bold text-white">
                Talentero
              </Link>
              <Badge className="bg-red-600 text-white">
                <Shield className="w-3 h-3 mr-1" />
                ADMIN
              </Badge>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/admin" className="text-gray-400 hover:text-white">
                Dashboard
              </Link>
              <Link href="/admin/clients" className="text-gray-400 hover:text-white">
                Clients
              </Link>
              <Link href="/admin/talents" className="text-gray-400 hover:text-white">
                Talents
              </Link>
              <Link href="/admin/offres" className="text-white font-medium">
                Offres
              </Link>
              <Link href="/admin/candidatures" className="text-gray-400 hover:text-white">
                Candidatures
              </Link>
            </nav>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white">
                <Bell className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Gestion des offres</h1>
            <p className="text-gray-400 mt-1">
              Validez et gerez les offres de missions
            </p>
          </div>
          <Link href="/admin/offres/nouvelle">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle offre
            </Button>
          </Link>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Rechercher par titre, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOffres()}
              className="pl-10 bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('')}
              className={filter === '' ? '' : 'border-gray-700 text-gray-300'}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'EN_ATTENTE_VALIDATION' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('EN_ATTENTE_VALIDATION')}
              className={filter === 'EN_ATTENTE_VALIDATION' ? 'bg-yellow-600' : 'border-gray-700 text-gray-300'}
            >
              En attente
            </Button>
            <Button
              variant={filter === 'PUBLIEE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('PUBLIEE')}
              className={filter === 'PUBLIEE' ? 'bg-green-600' : 'border-gray-700 text-gray-300'}
            >
              Publiees
            </Button>
            <Button
              variant={filter === 'POURVUE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('POURVUE')}
              className={filter === 'POURVUE' ? 'bg-purple-600' : 'border-gray-700 text-gray-300'}
            >
              Pourvues
            </Button>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : offres.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-16 text-center">
              <Briefcase className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Aucune offre trouvee
              </h3>
              <p className="text-gray-400">
                {filter ? 'Essayez un autre filtre' : 'Aucune offre creee pour le moment'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offres.map((offre) => (
              <Card key={offre.uid} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{offre.titre}</h3>
                        {getStatutBadge(offre.statut)}
                        {getTypeOffreBadge(offre.typeOffre)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {offre.codeUnique}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {offre.client?.raisonSociale || 'TRINEXTA'}
                        </span>
                        {offre.lieu && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {offre.lieu}
                          </span>
                        )}
                        {(offre.tjmMin || offre.tjmMax) && (
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            {offre.tjmMin && offre.tjmMax
                              ? `${offre.tjmMin}-${offre.tjmMax} EUR/j`
                              : offre.tjmMax
                              ? `${offre.tjmMax} EUR/j`
                              : `${offre.tjmMin}+ EUR/j`}
                          </span>
                        )}
                        {getDureeLabel(offre.dureeNombre, offre.dureeUnite) && (
                          <span>{getDureeLabel(offre.dureeNombre, offre.dureeUnite)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <span className="flex items-center gap-1 text-gray-300">
                          <Users className="w-4 h-4 text-primary" />
                          {offre._count.candidatures} candidature(s)
                        </span>
                        <span className="flex items-center gap-1 text-gray-300">
                          {offre._count.matchs} match(s)
                        </span>
                        <span className="flex items-center gap-1 text-gray-400">
                          <Calendar className="w-4 h-4" />
                          {offre.publieLe ? `Publiee le ${formatDate(offre.publieLe)}` : `Creee le ${formatDate(offre.createdAt)}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {offre.statut === 'EN_ATTENTE_VALIDATION' && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleAction(offre.uid, 'valider')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-400 hover:bg-red-600/20"
                            onClick={() => handleAction(offre.uid, 'refuser')}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </>
                      )}
                      <Link href={`/admin/offres/${offre.uid}`}>
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
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
