'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Building2, Briefcase, Users, Bell, Settings, LogOut,
  Plus, ChevronRight, Eye, Calendar, MapPin, Clock,
  MoreVertical, Edit, Copy, Archive, Trash2, CheckCircle
} from 'lucide-react'

interface Offre {
  uid: string
  slug: string
  titre: string
  statut: string
  lieu: string | null
  tjmMin: number | null
  tjmMax: number | null
  dateDebut: string | null
  dureeMission: string | null
  nbCandidatures: number
  nbVues: number
  createdAt: string
  _count: {
    candidatures: number
    shortlists: number
  }
}

export default function ClientOffresPage() {
  const router = useRouter()
  const [offres, setOffres] = useState<Offre[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  useEffect(() => {
    fetchOffres()
  }, [filter])

  const fetchOffres = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter) params.set('statut', filter)

      const res = await fetch(`/api/client/offres?${params.toString()}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/c/connexion')
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

  const handleAction = async (offreUid: string, action: string) => {
    setActionMenuOpen(null)

    if (action === 'supprimer') {
      if (!confirm('Êtes-vous sûr de vouloir supprimer cette offre ?')) return

      try {
        const res = await fetch(`/api/client/offres/${offreUid}`, {
          method: 'DELETE',
        })
        if (res.ok) {
          fetchOffres()
        } else {
          const data = await res.json()
          alert(data.error || 'Erreur lors de la suppression')
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
      return
    }

    try {
      const res = await fetch(`/api/client/offres/${offreUid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (action === 'dupliquer' && data.offre?.uid) {
          router.push(`/c/offres/${data.offre.uid}/modifier`)
        } else {
          fetchOffres()
        }
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
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      PUBLIEE: { label: 'Publiée', className: 'bg-green-100 text-green-800' },
      EN_COURS: { label: 'En cours', className: 'bg-blue-100 text-blue-800' },
      POURVUE: { label: 'Pourvue', className: 'bg-purple-100 text-purple-800' },
      CLOTUREE: { label: 'Clôturée', className: 'bg-orange-100 text-orange-800' },
      ARCHIVEE: { label: 'Archivée', className: 'bg-gray-100 text-gray-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
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
              <Badge variant="outline" className="text-xs border-gray-400 text-gray-200">
                <Building2 className="w-3 h-3 mr-1" />
                Espace Entreprise
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/c/dashboard" className="text-gray-300 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/c/offres" className="text-primary font-medium">
                  Mes offres
                </Link>
                <Link href="/c/shortlists" className="text-gray-300 hover:text-primary">
                  Shortlists
                </Link>
                <Link href="/c/profil" className="text-gray-300 hover:text-primary">
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
        {/* En-tête */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Mes offres</h1>
            <p className="text-gray-300 mt-1">
              Gérez vos offres de mission et suivez les candidatures
            </p>
          </div>
          <Link href="/c/offres/nouvelle">
            <Button size="lg">
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle offre
            </Button>
          </Link>
        </div>

        {/* Filtres */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={filter === '' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('')}
          >
            Toutes
          </Button>
          <Button
            variant={filter === 'BROUILLON' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('BROUILLON')}
          >
            Brouillons
          </Button>
          <Button
            variant={filter === 'PUBLIEE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('PUBLIEE')}
          >
            Publiées
          </Button>
          <Button
            variant={filter === 'CLOTUREE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('CLOTUREE')}
          >
            Clôturées
          </Button>
          <Button
            variant={filter === 'ARCHIVEE' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('ARCHIVEE')}
          >
            Archivées
          </Button>
        </div>

        {/* Liste des offres */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : offres.length === 0 ? (
          <Card className="bg-gray-600 border-gray-500">
            <CardContent className="py-16 text-center">
              <Briefcase className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                {filter ? 'Aucune offre trouvée' : 'Aucune offre créée'}
              </h3>
              <p className="text-gray-300 mb-6">
                {filter
                  ? 'Essayez un autre filtre'
                  : 'Créez votre première offre pour recevoir des candidatures'}
              </p>
              <Link href="/c/offres/nouvelle">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une offre
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offres.map((offre) => (
              <Card key={offre.uid} className="bg-gray-600 border-gray-500 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Link href={`/c/offres/${offre.uid}`}>
                          <h3 className="text-lg font-semibold text-white hover:text-primary">
                            {offre.titre}
                          </h3>
                        </Link>
                        {getStatutBadge(offre.statut)}
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-300 mb-4">
                        {offre.lieu && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {offre.lieu}
                          </span>
                        )}
                        {(offre.tjmMin || offre.tjmMax) && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {offre.tjmMin && offre.tjmMax
                              ? `${offre.tjmMin} - ${offre.tjmMax}€/j`
                              : offre.tjmMax
                              ? `Jusqu'à ${offre.tjmMax}€/j`
                              : `À partir de ${offre.tjmMin}€/j`}
                          </span>
                        )}
                        {offre.dureeMission && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {offre.dureeMission}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Créée le {formatDate(offre.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-primary" />
                          <span className="font-medium">{offre._count.candidatures}</span>
                          <span className="text-gray-300">candidature(s)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-5 h-5 text-gray-400" />
                          <span className="font-medium">{offre.nbVues}</span>
                          <span className="text-gray-300">vues</span>
                        </div>
                        {offre._count.shortlists > 0 && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                            <span className="font-medium">{offre._count.shortlists}</span>
                            <span className="text-gray-300">shortlist(s)</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 relative">
                      <Link href={`/c/offres/${offre.uid}`}>
                        <Button variant="outline" size="sm">
                          Voir
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>

                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActionMenuOpen(actionMenuOpen === offre.uid ? null : offre.uid)}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>

                        {actionMenuOpen === offre.uid && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-gray-600 border-gray-500 rounded-lg shadow-lg border py-1 z-10">
                            <Link href={`/c/offres/${offre.uid}/modifier`}>
                              <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500 flex items-center gap-2">
                                <Edit className="w-4 h-4" />
                                Modifier
                              </button>
                            </Link>
                            <button
                              onClick={() => handleAction(offre.uid, 'dupliquer')}
                              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Dupliquer
                            </button>
                            {offre.statut === 'BROUILLON' && (
                              <button
                                onClick={() => handleAction(offre.uid, 'publier')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500 flex items-center gap-2 text-green-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Publier
                              </button>
                            )}
                            {offre.statut === 'PUBLIEE' && (
                              <button
                                onClick={() => handleAction(offre.uid, 'cloturer')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500 flex items-center gap-2 text-orange-600"
                              >
                                <Archive className="w-4 h-4" />
                                Clôturer
                              </button>
                            )}
                            {offre.statut !== 'ARCHIVEE' && (
                              <button
                                onClick={() => handleAction(offre.uid, 'archiver')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500 flex items-center gap-2"
                              >
                                <Archive className="w-4 h-4" />
                                Archiver
                              </button>
                            )}
                            {offre.statut === 'BROUILLON' && (
                              <button
                                onClick={() => handleAction(offre.uid, 'supprimer')}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-500 flex items-center gap-2 text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
                              </button>
                            )}
                          </div>
                        )}
                      </div>
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
