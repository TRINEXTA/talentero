'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Building2, Users, Bell, Settings, LogOut, Star,
  ChevronRight, Calendar, Briefcase, CheckCircle, XCircle,
  MessageSquare, User, MapPin, Clock
} from 'lucide-react'

interface ShortlistCandidat {
  uid: string
  ordre: number
  commentaireAdmin: string | null
  feedbackClient: string | null
  noteClient: number | null
  statutClient: string | null
  talent: {
    uid: string
    codeUnique: string
    displayName: string
    titrePoste: string | null
    competences: string[]
    anneesExperience: number | null
    disponibilite: string | null
    ville: string | null
    bio: string | null
    mobilite: string | null
  }
  scoreMatch: number | null
}

interface Shortlist {
  uid: string
  nom: string
  statut: string
  commentaireAdmin: string | null
  envoyeeLe: string | null
  offre: {
    uid: string
    slug: string
    titre: string
  }
  nbCandidats: number
  candidats: ShortlistCandidat[]
}

export default function ClientShortlistsPage() {
  const router = useRouter()
  const [shortlists, setShortlists] = useState<Shortlist[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShortlist, setSelectedShortlist] = useState<Shortlist | null>(null)

  useEffect(() => {
    fetchShortlists()
  }, [])

  const fetchShortlists = async () => {
    try {
      const res = await fetch('/api/client/shortlists')
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/c/connexion')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setShortlists(data.shortlists)
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
    const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      ENVOYEE: { label: 'En attente', className: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
      EN_COURS: { label: 'En cours', className: 'bg-yellow-100 text-yellow-800', icon: <Star className="w-3 h-3" /> },
      VALIDEE: { label: 'Validée', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      REFUSEE: { label: 'Refusée', className: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800', icon: null }
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const getDisponibiliteLabel = (dispo: string | null) => {
    if (!dispo) return 'Non renseignée'
    const labels: Record<string, string> = {
      IMMEDIATE: 'Immédiate',
      SOUS_15_JOURS: 'Sous 15 jours',
      SOUS_1_MOIS: 'Sous 1 mois',
      SOUS_2_MOIS: 'Sous 2 mois',
      SOUS_3_MOIS: 'Sous 3 mois',
    }
    return labels[dispo] || dispo
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
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
                <Building2 className="w-3 h-3 mr-1" />
                Espace Entreprise
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/c/dashboard" className="text-gray-600 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/c/offres" className="text-gray-600 hover:text-primary">
                  Mes offres
                </Link>
                <Link href="/c/shortlists" className="text-primary font-medium">
                  Shortlists
                </Link>
                <Link href="/c/profil" className="text-gray-600 hover:text-primary">
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
          <h1 className="text-2xl font-bold text-gray-900">Shortlists</h1>
          <p className="text-gray-600 mt-1">
            Consultez les sélections de candidats préparées par TRINEXTA
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : shortlists.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Aucune shortlist reçue
              </h3>
              <p className="text-gray-500 mb-6">
                Les shortlists apparaîtront ici lorsque TRINEXTA vous enverra des sélections de candidats.
              </p>
              <Link href="/c/offres/nouvelle">
                <Button>
                  Publier une offre
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Liste des shortlists */}
            <div className="lg:col-span-1 space-y-4">
              {shortlists.map((shortlist) => (
                <Card
                  key={shortlist.uid}
                  className={`cursor-pointer transition-all ${
                    selectedShortlist?.uid === shortlist.uid
                      ? 'ring-2 ring-primary shadow-md'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedShortlist(shortlist)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{shortlist.nom}</h3>
                      {getStatutBadge(shortlist.statut)}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      Pour: {shortlist.offre.titre}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Users className="w-4 h-4" />
                        {shortlist.nbCandidats} candidat(s)
                      </span>
                      {shortlist.envoyeeLe && (
                        <span className="text-gray-400">
                          {formatDate(shortlist.envoyeeLe)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Détail de la shortlist sélectionnée */}
            <div className="lg:col-span-2">
              {selectedShortlist ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedShortlist.nom}</CardTitle>
                        <p className="text-sm text-gray-500 mt-1">
                          Offre: {selectedShortlist.offre.titre}
                        </p>
                      </div>
                      {getStatutBadge(selectedShortlist.statut)}
                    </div>
                    {selectedShortlist.commentaireAdmin && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-800">
                          <strong>Message de TRINEXTA :</strong> {selectedShortlist.commentaireAdmin}
                        </p>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {selectedShortlist.candidats.map((candidat, index) => (
                        <div
                          key={candidat.uid}
                          className="p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="w-6 h-6 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-gray-400">#{index + 1}</span>
                                <h4 className="font-semibold text-gray-900">
                                  {candidat.talent.displayName}
                                </h4>
                                {candidat.scoreMatch && (
                                  <Badge className="bg-primary/10 text-primary">
                                    {candidat.scoreMatch}% match
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {candidat.talent.titrePoste || 'Consultant IT'}
                              </p>

                              <div className="flex flex-wrap gap-1 mb-3">
                                {candidat.talent.competences.slice(0, 6).map((comp, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {comp}
                                  </Badge>
                                ))}
                                {candidat.talent.competences.length > 6 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{candidat.talent.competences.length - 6}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                                {candidat.talent.anneesExperience && (
                                  <span className="flex items-center gap-1">
                                    <Briefcase className="w-4 h-4" />
                                    {candidat.talent.anneesExperience} ans
                                  </span>
                                )}
                                {candidat.talent.ville && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {candidat.talent.ville}
                                  </span>
                                )}
                                {candidat.talent.disponibilite && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {getDisponibiliteLabel(candidat.talent.disponibilite)}
                                  </span>
                                )}
                              </div>

                              {candidat.commentaireAdmin && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                  <p className="text-sm text-gray-600">
                                    <MessageSquare className="w-4 h-4 inline mr-1" />
                                    {candidat.commentaireAdmin}
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="flex-shrink-0">
                              <Link href={`/c/shortlists/${selectedShortlist.uid}`}>
                                <Button variant="outline" size="sm">
                                  Voir les details
                                  <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    {selectedShortlist.statut === 'ENVOYEE' && (
                      <div className="mt-6 pt-6 border-t flex justify-end gap-4">
                        <Button variant="outline">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Demander plus de candidats
                        </Button>
                        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
                          <XCircle className="w-4 h-4 mr-2" />
                          Refuser
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Valider la shortlist
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Sélectionnez une shortlist pour voir les candidats
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
