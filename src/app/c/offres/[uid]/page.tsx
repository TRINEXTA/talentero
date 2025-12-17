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
  Edit, CheckCircle, Archive, Copy, Eye, Star,
  User, Mail, Phone, FileText, ExternalLink
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
  candidatures: Candidature[]
  shortlist: Shortlist | null
  _count: {
    candidatures: number
    matchs: number
  }
}

interface Candidature {
  uid: string
  statut: string
  scoreMatch: number
  tjmPropose: number | null
  motivation: string | null
  createdAt: string
  talent: {
    uid: string
    prenom: string
    nom: string
    titrePoste: string | null
    photoUrl: string | null
    competences: string[]
    tjm: number | null
    disponibilite: string | null
    ville: string | null
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

  const getCandidatureStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      NOUVELLE: { label: 'Nouvelle', className: 'bg-blue-100 text-blue-800' },
      VUE: { label: 'Vue', className: 'bg-gray-100 text-gray-800' },
      EN_REVUE: { label: 'En revue', className: 'bg-yellow-100 text-yellow-800' },
      PRE_SELECTIONNE: { label: 'Preselectionne', className: 'bg-purple-100 text-purple-800' },
      SHORTLIST: { label: 'Shortlist', className: 'bg-green-100 text-green-800' },
      PROPOSEE_CLIENT: { label: 'Propose', className: 'bg-blue-100 text-blue-800' },
      ENTRETIEN_DEMANDE: { label: 'Entretien demande', className: 'bg-orange-100 text-orange-800' },
      ENTRETIEN_PLANIFIE: { label: 'Entretien planifie', className: 'bg-orange-100 text-orange-800' },
      ENTRETIEN_REALISE: { label: 'Entretien realise', className: 'bg-orange-100 text-orange-800' },
      ACCEPTEE: { label: 'Retenue', className: 'bg-green-100 text-green-800' },
      REFUSEE: { label: 'Refusee', className: 'bg-red-100 text-red-800' },
      ABANDONNEE: { label: 'Abandonnee', className: 'bg-gray-100 text-gray-600' },
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
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!offre) {
    return (
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Offre non trouvee</h2>
          <Link href="/c/offres">
            <Button>Retour aux offres</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-700">
      {/* Header */}
      <header className="bg-gray-600 border-gray-500 border-b sticky top-0 z-50">
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
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link href="/c/offres" className="flex items-center text-gray-300 hover:text-primary">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Retour aux offres
          </Link>
        </div>

        {/* En-tete offre */}
        <div className="bg-gray-600 border-gray-500 border rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-white">{offre.titre}</h1>
                {getStatutBadge(offre.statut)}
              </div>
              <p className="text-sm text-gray-300">
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
          <div className="flex items-center gap-8 mt-6 pt-6 border-t border-gray-500">
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-white">{offre.nbVues}</span>
              <span className="text-gray-300">vues</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-semibold text-white">{offre._count.candidatures}</span>
              <span className="text-gray-300">candidature(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-white">{offre._count.matchs}</span>
              <span className="text-gray-300">match(s)</span>
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
            <Card className="bg-gray-600 border-gray-500">
              <CardHeader>
                <CardTitle>Description du poste</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap text-gray-300">{offre.description}</p>
                </div>
              </CardContent>
            </Card>

            {offre.responsabilites && (
              <Card className="bg-gray-600 border-gray-500">
                <CardHeader>
                  <CardTitle>Responsabilites</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-300">{offre.responsabilites}</p>
                </CardContent>
              </Card>
            )}

            {offre.profilRecherche && (
              <Card className="bg-gray-600 border-gray-500">
                <CardHeader>
                  <CardTitle>Profil recherche</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-gray-300">{offre.profilRecherche}</p>
                </CardContent>
              </Card>
            )}

            {/* Competences */}
            <Card className="bg-gray-600 border-gray-500">
              <CardHeader>
                <CardTitle>Competences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offre.competencesRequises.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Requises :</p>
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
                    <p className="text-sm font-medium text-gray-300 mb-2">Souhaitees :</p>
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

            {/* Candidatures */}
            <Card className="bg-gray-600 border-gray-500">
              <CardHeader>
                <CardTitle>Candidatures ({offre.candidatures.length})</CardTitle>
                <CardDescription>
                  Candidatures recues pour cette offre
                </CardDescription>
              </CardHeader>
              <CardContent>
                {offre.candidatures.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-300">Aucune candidature pour le moment</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {offre.candidatures.map((candidature) => (
                      <div
                        key={candidature.uid}
                        className="flex items-center gap-4 p-4 rounded-lg bg-gray-500 hover:bg-gray-400 transition"
                      >
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                          {candidature.talent.photoUrl ? (
                            <img
                              src={candidature.talent.photoUrl}
                              alt=""
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-6 h-6 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-white">
                              {candidature.talent.prenom} {candidature.talent.nom}
                            </span>
                            {getCandidatureStatutBadge(candidature.statut)}
                          </div>
                          <p className="text-sm text-gray-300">
                            {candidature.talent.titrePoste || 'Consultant IT'}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-300">
                            {candidature.talent.ville && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {candidature.talent.ville}
                              </span>
                            )}
                            {candidature.talent.tjm && (
                              <span className="flex items-center gap-1">
                                <Euro className="w-3 h-3" />
                                {candidature.talent.tjm} EUR/j
                              </span>
                            )}
                            <span>Postule le {formatDate(candidature.createdAt)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-lg font-bold text-primary">
                            {candidature.scoreMatch}%
                          </div>
                          <p className="text-xs text-gray-500">match</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Infos mission */}
            <Card className="bg-gray-600 border-gray-500">
              <CardHeader>
                <CardTitle>Informations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offre.lieu && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Localisation</p>
                      <p className="text-sm text-gray-300">
                        {offre.lieu}
                        {offre.codePostal && ` (${offre.codePostal})`}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-white">Modalite</p>
                    <p className="text-sm text-gray-300">{getMobiliteLabel(offre.mobilite)}</p>
                  </div>
                </div>

                {(offre.tjmMin || offre.tjmMax) && (
                  <div className="flex items-start gap-3">
                    <Euro className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">TJM</p>
                      <p className="text-sm text-gray-300">
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
                      <p className="font-medium text-white">Duree</p>
                      <p className="text-sm text-gray-300">
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
                      <p className="font-medium text-white">Date de debut</p>
                      <p className="text-sm text-gray-300">{formatDate(offre.dateDebut)}</p>
                    </div>
                  </div>
                )}

                {offre.experienceMin && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="font-medium text-white">Experience requise</p>
                      <p className="text-sm text-gray-300">{offre.experienceMin}+ ans</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="bg-gray-600 border-gray-500">
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
              <Card className="bg-green-900/30 border-green-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-green-400" />
                    Shortlist
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-300 mb-4">
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
