'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Building2, Briefcase, Users, Bell, Settings, LogOut,
  ChevronLeft, MapPin, Clock, Calendar, Euro,
  CheckCircle, Archive, Copy, Eye, Star,
  FileText, ExternalLink
} from 'lucide-react'

interface Offre {
  uid: string
  codeUnique: string
  slug: string
  titre: string
  description: string
  responsabilites: string | null
  profilRecherche: string | null
  competencesRequises: string[]
  competencesSouhaitees: string[]
  experienceMin: number | null
  statut: string
  lieu: string | null
  codePostal: string | null
  mobilite: string
  tjmMin: number | null
  tjmMax: number | null
  tjmAffiche: string | null
  dureeNombre: number | null
  dureeUnite: string | null
  dateDebut: string | null
  dateFin: string | null
  renouvelable: boolean
  nbVues: number
  nbCandidatures: number
  createdAt: string
  publieLe: string | null
  // Les candidatures ne sont plus exposées aux clients (anonymisation)
  shortlist: Shortlist | null
  _count: {
    candidatures: number
    matchs: number
  }
}

interface Shortlist {
  uid: string
  statut: string
  envoyeeLe: string | null
  notes: string | null
  createdAt: string
  _count: {
    candidats: number
  }
}

export default function ClientOffreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const uid = params.uid as string

  const [offre, setOffre] = useState<Offre | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetchOffre()
  }, [uid])

  const fetchOffre = async () => {
    try {
      const res = await fetch(`/api/client/offres/${uid}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/c/connexion')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setOffre(data.offre)
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    if (!offre) return
    setActionLoading(true)

    try {
      const res = await fetch(`/api/client/offres/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (res.ok) {
        const data = await res.json()
        if (action === 'dupliquer' && data.offre?.uid) {
          router.push(`/c/offres/${data.offre.uid}`)
        } else {
          fetchOffre()
        }
      } else {
        const data = await res.json()
        alert(data.error || 'Erreur')
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800' },
      EN_ATTENTE_VALIDATION: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
      PUBLIEE: { label: 'Publiee', className: 'bg-green-100 text-green-800' },
      POURVUE: { label: 'Pourvue', className: 'bg-purple-100 text-purple-800' },
      FERMEE: { label: 'Fermee', className: 'bg-orange-100 text-orange-800' },
      EXPIREE: { label: 'Expiree', className: 'bg-gray-100 text-gray-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const getMobiliteLabel = (mobilite: string) => {
    const labels: Record<string, string> = {
      TELETRAVAIL: 'Teletravail complet',
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!offre) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Offre non trouvee</h2>
          <Link href="/c/offres">
            <Button>Retour aux offres</Button>
          </Link>
        </div>
      </div>
    )
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
                <Link href="/c/offres" className="text-primary font-medium">
                  Mes offres
                </Link>
                <Link href="/c/shortlists" className="text-gray-600 hover:text-primary">
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
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/c/offres" className="flex items-center text-gray-500 hover:text-gray-700">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour aux offres
          </Link>
        </div>

        {/* En-tete offre */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{offre.titre}</h1>
                {getStatutBadge(offre.statut)}
              </div>
              <p className="text-sm text-gray-500">
                Code: {offre.codeUnique} | Creee le {formatDate(offre.createdAt)}
                {offre.publieLe && ` | Publiee le ${formatDate(offre.publieLe)}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {offre.statut === 'BROUILLON' && (
                <Button onClick={() => handleAction('publier')} disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Publier
                </Button>
              )}
              <Button variant="outline" onClick={() => handleAction('dupliquer')} disabled={actionLoading}>
                <Copy className="w-4 h-4 mr-2" />
                Dupliquer
              </Button>
              {offre.statut === 'PUBLIEE' && (
                <Button variant="outline" onClick={() => handleAction('cloturer')} disabled={actionLoading}>
                  <Archive className="w-4 h-4 mr-2" />
                  Cloturer
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 mt-6 pt-6 border-t">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-400" />
              <span className="font-semibold">{offre.nbVues}</span>
              <span className="text-gray-500">vues</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold">{offre._count.candidatures}</span>
              <span className="text-gray-500">candidature(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold">{offre._count.matchs}</span>
              <span className="text-gray-500">match(s)</span>
            </div>
            {offre.shortlist && (
              <Link href={`/c/shortlists/${offre.shortlist.uid}`}>
                <Badge className="bg-green-100 text-green-800 cursor-pointer">
                  Shortlist: {offre.shortlist._count.candidats} candidat(s)
                </Badge>
              </Link>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description du poste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{offre.description}</p>
                </div>
              </CardContent>
            </Card>

            {offre.responsabilites && (
              <Card>
                <CardHeader>
                  <CardTitle>Responsabilites</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-700">{offre.responsabilites}</p>
                </CardContent>
              </Card>
            )}

            {offre.profilRecherche && (
              <Card>
                <CardHeader>
                  <CardTitle>Profil recherche</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-700">{offre.profilRecherche}</p>
                </CardContent>
              </Card>
            )}

            {/* Competences */}
            <Card>
              <CardHeader>
                <CardTitle>Competences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offre.competencesRequises.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Requises :</p>
                    <div className="flex flex-wrap gap-2">
                      {offre.competencesRequises.map((comp, i) => (
                        <Badge key={i} className="bg-primary/10 text-primary">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {offre.competencesSouhaitees.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Souhaitees :</p>
                    <div className="flex flex-wrap gap-2">
                      {offre.competencesSouhaitees.map((comp, i) => (
                        <Badge key={i} variant="outline">
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Candidatures - Info pour le client */}
            <Card>
              <CardHeader>
                <CardTitle>Candidatures ({offre._count.candidatures})</CardTitle>
                <CardDescription>
                  Suivi des candidatures pour cette offre
                </CardDescription>
              </CardHeader>
              <CardContent>
                {offre._count.candidatures === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune candidature pour le moment</p>
                  </div>
                ) : offre.shortlist ? (
                  <div className="text-center py-6">
                    <Star className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-700 mb-2">
                      <span className="font-semibold">{offre._count.candidatures}</span> candidature(s) recue(s)
                    </p>
                    <p className="text-gray-500 text-sm mb-4">
                      Une shortlist de {offre.shortlist._count.candidats} candidat(s) a ete preparee pour vous
                    </p>
                    <Link href={`/c/shortlists/${offre.shortlist.uid}`}>
                      <Button>
                        <Star className="w-4 h-4 mr-2" />
                        Voir la shortlist
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Users className="w-12 h-12 text-primary/30 mx-auto mb-4" />
                    <p className="text-gray-700 mb-2">
                      <span className="font-semibold">{offre._count.candidatures}</span> candidature(s) recue(s)
                    </p>
                    <p className="text-gray-500 text-sm">
                      Notre equipe analyse les profils et vous enverra prochainement une shortlist de candidats qualifies.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Infos mission */}
            <Card>
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offre.lieu && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Localisation</p>
                      <p className="text-sm text-gray-600">
                        {offre.lieu}
                        {offre.codePostal && ` (${offre.codePostal})`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Modalite</p>
                    <p className="text-sm text-gray-600">{getMobiliteLabel(offre.mobilite)}</p>
                  </div>
                </div>

                {(offre.tjmMin || offre.tjmMax) && (
                  <div className="flex items-start gap-3">
                    <Euro className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">TJM</p>
                      <p className="text-sm text-gray-600">
                        {offre.tjmAffiche || (
                          offre.tjmMin && offre.tjmMax
                            ? `${offre.tjmMin} - ${offre.tjmMax} EUR/j`
                            : offre.tjmMax
                            ? `Jusqu'a ${offre.tjmMax} EUR/j`
                            : `A partir de ${offre.tjmMin} EUR/j`
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {getDureeLabel(offre.dureeNombre, offre.dureeUnite) && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Duree</p>
                      <p className="text-sm text-gray-600">
                        {getDureeLabel(offre.dureeNombre, offre.dureeUnite)}
                        {offre.renouvelable && ' (renouvelable)'}
                      </p>
                    </div>
                  </div>
                )}

                {offre.dateDebut && (
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Date de debut</p>
                      <p className="text-sm text-gray-600">{formatDate(offre.dateDebut)}</p>
                    </div>
                  </div>
                )}

                {offre.experienceMin && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium">Experience requise</p>
                      <p className="text-sm text-gray-600">{offre.experienceMin}+ ans</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href={`/offres/${offre.slug}`} target="_blank" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Voir l'offre publique
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" onClick={() => handleAction('dupliquer')} disabled={actionLoading}>
                  <Copy className="w-4 h-4 mr-2" />
                  Dupliquer l'offre
                </Button>
                {offre.statut !== 'EXPIREE' && (
                  <Button variant="outline" className="w-full justify-start text-orange-600" onClick={() => handleAction('archiver')} disabled={actionLoading}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archiver l'offre
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Shortlist */}
            {offre.shortlist && (
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-green-600" />
                    Shortlist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    {offre.shortlist._count.candidats} candidat(s) selectionne(s)
                  </p>
                  <Link href={`/c/shortlists/${offre.shortlist.uid}`}>
                    <Button className="w-full">
                      Voir la shortlist
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
