'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Shield, FileText, Bell, LogOut, Search,
  User, Eye, MapPin, Calendar, Euro, Briefcase, Star
} from 'lucide-react'

interface Candidature {
  uid: string
  statut: string
  scoreMatch: number
  tjmPropose: number | null
  motivation: string | null
  createdAt: string
  offre: {
    uid: string
    codeUnique: string
    titre: string
    client: {
      raisonSociale: string
    }
  }
  talent: {
    uid: string
    codeUnique: string
    prenom: string
    nom: string
    titrePoste: string | null
    photoUrl: string | null
    competences: string[]
    tjm: number | null
    ville: string | null
  }
}

export default function AdminCandidaturesPage() {
  const router = useRouter()
  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  useEffect(() => {
    fetchCandidatures()
  }, [filter])

  const fetchCandidatures = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('statut', filter)
      if (search) params.set('search', search)

      const res = await fetch(`/api/candidatures?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setCandidatures(data.candidatures)
    } catch (error) {
      console.error('Erreur:', error)
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
      NOUVELLE: { label: 'Nouvelle', className: 'bg-blue-600' },
      VUE: { label: 'Vue', className: 'bg-gray-600' },
      EN_REVUE: { label: 'En revue', className: 'bg-yellow-600' },
      PRE_SELECTIONNE: { label: 'Preselectionne', className: 'bg-purple-600' },
      SHORTLIST: { label: 'Shortlist', className: 'bg-green-600' },
      PROPOSEE_CLIENT: { label: 'Proposee', className: 'bg-blue-600' },
      ENTRETIEN_DEMANDE: { label: 'Entretien', className: 'bg-orange-600' },
      ENTRETIEN_PLANIFIE: { label: 'Planifie', className: 'bg-orange-600' },
      ENTRETIEN_REALISE: { label: 'Realise', className: 'bg-orange-600' },
      ACCEPTEE: { label: 'Retenue', className: 'bg-green-600' },
      REFUSEE: { label: 'Refusee', className: 'bg-red-600' },
      ABANDONNEE: { label: 'Abandonnee', className: 'bg-gray-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    if (score >= 40) return 'text-orange-400'
    return 'text-red-400'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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
              <Link href="/admin/offres" className="text-gray-400 hover:text-white">
                Offres
              </Link>
              <Link href="/admin/candidatures" className="text-white font-medium">
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Gestion des candidatures</h1>
          <p className="text-gray-400 mt-1">
            Suivez et gerez les candidatures des talents
          </p>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Rechercher par talent, offre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCandidatures()}
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
              variant={filter === 'NOUVELLE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('NOUVELLE')}
              className={filter === 'NOUVELLE' ? 'bg-blue-600' : 'border-gray-700 text-gray-300'}
            >
              Nouvelles
            </Button>
            <Button
              variant={filter === 'SHORTLIST' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('SHORTLIST')}
              className={filter === 'SHORTLIST' ? 'bg-green-600' : 'border-gray-700 text-gray-300'}
            >
              Shortlist
            </Button>
            <Button
              variant={filter === 'ACCEPTEE' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('ACCEPTEE')}
              className={filter === 'ACCEPTEE' ? 'bg-green-600' : 'border-gray-700 text-gray-300'}
            >
              Retenues
            </Button>
          </div>
        </div>

        {/* Liste */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : candidatures.length === 0 ? (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Aucune candidature trouvee
              </h3>
              <p className="text-gray-400">
                {filter ? 'Essayez un autre filtre' : 'Aucune candidature pour le moment'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidatures.map((candidature) => (
              <Card key={candidature.uid} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-14 h-14 bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                      {candidature.talent.photoUrl ? (
                        <img
                          src={candidature.talent.photoUrl}
                          alt=""
                          className="w-14 h-14 rounded-full object-cover"
                        />
                      ) : (
                        <User className="w-7 h-7 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">
                          {candidature.talent.prenom} {candidature.talent.nom}
                        </h3>
                        {getStatutBadge(candidature.statut)}
                        <div className={`flex items-center gap-1 font-bold ${getScoreColor(candidature.scoreMatch)}`}>
                          <Star className="w-4 h-4" />
                          {candidature.scoreMatch}%
                        </div>
                      </div>

                      <p className="text-gray-400 mb-2">
                        {candidature.talent.titrePoste || 'Consultant IT'}
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          {candidature.offre.titre}
                        </span>
                        <span className="text-gray-500">
                          ({candidature.offre.client.raisonSociale})
                        </span>
                        {candidature.talent.ville && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {candidature.talent.ville}
                          </span>
                        )}
                        {candidature.talent.tjm && (
                          <span className="flex items-center gap-1">
                            <Euro className="w-4 h-4" />
                            {candidature.talent.tjm} EUR/j
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(candidature.createdAt)}
                        </span>
                      </div>

                      {candidature.talent.competences.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {candidature.talent.competences.slice(0, 5).map((comp, i) => (
                            <Badge key={i} variant="outline" className="text-gray-300 border-gray-600 text-xs">
                              {comp}
                            </Badge>
                          ))}
                          {candidature.talent.competences.length > 5 && (
                            <Badge variant="outline" className="text-gray-400 border-gray-600 text-xs">
                              +{candidature.talent.competences.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/admin/talents/${candidature.talent.uid}`}>
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                          <User className="w-4 h-4 mr-1" />
                          Profil
                        </Button>
                      </Link>
                      <Link href={`/admin/offres/${candidature.offre.uid}`}>
                        <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                          <Eye className="w-4 h-4 mr-1" />
                          Offre
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
