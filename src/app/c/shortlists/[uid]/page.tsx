'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, Briefcase, User, MapPin, Euro, Clock, CheckCircle, XCircle,
  MessageSquare, Calendar, Loader2, ChevronDown, ChevronUp, FileText, Star
} from 'lucide-react'

interface Candidat {
  id: number
  ordre: number
  statutClient: string
  retenuParClient: boolean | null
  commentaireClient: string | null
  demandeInfos: boolean
  questionClient: string | null
  reponseCandidat: string | null
  candidature: {
    id: number
    uid: string
    tjmPropose: number | null
    motivation: string | null
    scoreMatch: number | null
    talent: {
      uid: string
      codeUnique: string
      prenom: string
      nom: string
      titrePoste: string | null
      competences: string[]
      anneesExperience: number
      tjm: number | null
      tjmMin: number | null
      tjmMax: number | null
      disponibilite: string
      mobilite: string
      ville: string | null
      bio: string | null
      photoUrl: string | null
    }
  }
}

interface Shortlist {
  uid: string
  statut: string
  envoyeeLe: string | null
  notes: string | null
  offre: {
    uid: string
    codeUnique: string
    titre: string
    description: string
    tjmMin: number | null
    tjmMax: number | null
    lieu: string | null
    mobilite: string
  }
  candidats: Candidat[]
}

const DISPONIBILITE_LABELS: Record<string, string> = {
  IMMEDIATE: 'Immediate',
  SOUS_15_JOURS: 'Sous 15 jours',
  SOUS_1_MOIS: 'Sous 1 mois',
  SOUS_2_MOIS: 'Sous 2 mois',
  SOUS_3_MOIS: 'Sous 3 mois',
  NON_DISPONIBLE: 'Non disponible',
}

const MOBILITE_LABELS: Record<string, string> = {
  FULL_REMOTE: 'Full Remote',
  HYBRIDE: 'Hybride',
  SUR_SITE: 'Sur site',
  FLEXIBLE: 'Flexible',
}

export default function ClientShortlistDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const uid = params.uid as string

  const [shortlist, setShortlist] = useState<Shortlist | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedCandidat, setExpandedCandidat] = useState<number | null>(null)
  const [actionLoading, setActionLoading] = useState<number | null>(null)
  const [questionText, setQuestionText] = useState<Record<number, string>>({})
  const [commentText, setCommentText] = useState<Record<number, string>>({})

  useEffect(() => {
    if (uid) {
      fetchShortlist()
    }
  }, [uid])

  const fetchShortlist = async () => {
    try {
      const res = await fetch(`/api/client/shortlists/${uid}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/c/connexion')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setShortlist(data.shortlist)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la shortlist",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (candidatId: number, action: string, data?: Record<string, unknown>) => {
    setActionLoading(candidatId)
    try {
      const res = await fetch(`/api/client/shortlists/${uid}/candidats/${candidatId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Succes",
        description: "Action enregistree",
      })
      fetchShortlist()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer l'action",
        variant: "destructive",
      })
    } finally {
      setActionLoading(null)
    }
  }

  const getStatutBadge = (statut: string, retenu: boolean | null) => {
    if (retenu === true) {
      return <Badge className="bg-green-600">Selectionne</Badge>
    }
    if (retenu === false) {
      return <Badge className="bg-red-600">Refuse</Badge>
    }
    const configs: Record<string, { label: string; className: string }> = {
      EN_ATTENTE: { label: 'A evaluer', className: 'bg-gray-600' },
      VU: { label: 'Vu', className: 'bg-blue-600' },
      DEMANDE_ENTRETIEN: { label: 'Entretien demande', className: 'bg-purple-600' },
      DEMANDE_INFOS: { label: 'Infos demandees', className: 'bg-yellow-600' },
      SELECTIONNE: { label: 'Selectionne', className: 'bg-green-600' },
      REFUSE: { label: 'Refuse', className: 'bg-red-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!shortlist) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Shortlist non trouvee</h2>
          <Link href="/c/shortlists">
            <Button>Retour aux shortlists</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/c/shortlists" className="text-gray-600 hover:text-primary mr-4">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Shortlist - {shortlist.offre.titre}
              </h1>
              <p className="text-sm text-gray-500">{shortlist.offre.codeUnique}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Resume offre */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              {shortlist.offre.titre}
            </CardTitle>
            <CardDescription>
              {shortlist.offre.description.substring(0, 200)}...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              {shortlist.offre.lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {shortlist.offre.lieu}
                </span>
              )}
              {(shortlist.offre.tjmMin || shortlist.offre.tjmMax) && (
                <span className="flex items-center gap-1">
                  <Euro className="w-4 h-4" />
                  {shortlist.offre.tjmMin && shortlist.offre.tjmMax
                    ? `${shortlist.offre.tjmMin} - ${shortlist.offre.tjmMax} EUR/j`
                    : shortlist.offre.tjmMax
                    ? `${shortlist.offre.tjmMax} EUR/j`
                    : `${shortlist.offre.tjmMin}+ EUR/j`}
                </span>
              )}
              <span className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {shortlist.candidats.length} candidat(s) preselectionne(s)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <p className="text-blue-800">
              <strong>Comment ca marche ?</strong> Pour chaque candidat, vous pouvez :
            </p>
            <ul className="mt-2 text-sm text-blue-700 space-y-1">
              <li>- <strong>Selectionner</strong> : Vous souhaitez avancer avec ce candidat</li>
              <li>- <strong>Demander un entretien</strong> : Planifier un entretien avec le candidat</li>
              <li>- <strong>Demander des infos</strong> : Poser une question au candidat</li>
              <li>- <strong>Refuser</strong> : Ce profil ne correspond pas a vos attentes</li>
            </ul>
          </CardContent>
        </Card>

        {/* Liste des candidats */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Candidats preselectionnes ({shortlist.candidats.length})
          </h2>

          {shortlist.candidats.map((candidat, index) => {
            const talent = candidat.candidature.talent
            const isExpanded = expandedCandidat === candidat.id
            const isLoading = actionLoading === candidat.id

            return (
              <Card key={candidat.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header du candidat */}
                  <div
                    className="p-6 cursor-pointer hover:bg-gray-50 transition"
                    onClick={() => setExpandedCandidat(isExpanded ? null : candidat.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-lg font-bold text-primary">
                            {candidat.candidature.scoreMatch || index + 1}
                            {candidat.candidature.scoreMatch && '%'}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">
                              Candidat {talent.codeUnique}
                            </h3>
                            {getStatutBadge(candidat.statutClient, candidat.retenuParClient)}
                          </div>
                          <p className="text-gray-600">{talent.titrePoste || 'Freelance IT'}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" />
                              {talent.anneesExperience} ans d'exp.
                            </span>
                            {talent.tjm && (
                              <span className="flex items-center gap-1">
                                <Euro className="w-4 h-4" />
                                {talent.tjm} EUR/j
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {DISPONIBILITE_LABELS[talent.disponibilite] || talent.disponibilite}
                            </span>
                            {talent.ville && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {talent.ville}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Competences */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {talent.competences.slice(0, 8).map((comp, i) => (
                        <Badge key={i} variant="secondary">{comp}</Badge>
                      ))}
                      {talent.competences.length > 8 && (
                        <Badge variant="outline">+{talent.competences.length - 8}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Contenu etendu */}
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-6">
                      {/* Bio */}
                      {talent.bio && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Presentation</h4>
                          <p className="text-gray-600">{talent.bio}</p>
                        </div>
                      )}

                      {/* Motivation */}
                      {candidat.candidature.motivation && (
                        <div className="mb-4">
                          <h4 className="font-medium text-gray-900 mb-2">Motivation du candidat</h4>
                          <p className="text-gray-600">{candidat.candidature.motivation}</p>
                        </div>
                      )}

                      {/* Infos supplementaires */}
                      <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-500">TJM souhaite</p>
                          <p className="font-semibold">
                            {talent.tjm ? `${talent.tjm} EUR/j` : 'Non precise'}
                            {talent.tjmMin && talent.tjmMax && (
                              <span className="text-sm text-gray-500 ml-1">
                                ({talent.tjmMin}-{talent.tjmMax})
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-500">Mobilite</p>
                          <p className="font-semibold">
                            {MOBILITE_LABELS[talent.mobilite] || talent.mobilite}
                          </p>
                        </div>
                        <div className="p-3 bg-white rounded-lg border">
                          <p className="text-sm text-gray-500">Score de matching</p>
                          <p className="font-semibold">
                            {candidat.candidature.scoreMatch ? `${candidat.candidature.scoreMatch}%` : 'N/A'}
                          </p>
                        </div>
                      </div>

                      {/* Question/Reponse si demande d'infos */}
                      {candidat.demandeInfos && candidat.questionClient && (
                        <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                          <h4 className="font-medium text-yellow-800 mb-2">Votre question</h4>
                          <p className="text-yellow-700">{candidat.questionClient}</p>
                          {candidat.reponseCandidat && (
                            <>
                              <h4 className="font-medium text-yellow-800 mt-4 mb-2">Reponse du candidat</h4>
                              <p className="text-yellow-700">{candidat.reponseCandidat}</p>
                            </>
                          )}
                        </div>
                      )}

                      {/* Commentaire client */}
                      {candidat.commentaireClient && (
                        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
                          <h4 className="font-medium text-gray-700 mb-2">Votre commentaire</h4>
                          <p className="text-gray-600">{candidat.commentaireClient}</p>
                        </div>
                      )}

                      {/* Actions si pas encore decide */}
                      {candidat.retenuParClient === null && (
                        <div className="space-y-4">
                          {/* Zone commentaire */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ajouter un commentaire (optionnel)
                            </label>
                            <Textarea
                              value={commentText[candidat.id] || ''}
                              onChange={(e) => setCommentText({ ...commentText, [candidat.id]: e.target.value })}
                              placeholder="Vos remarques sur ce profil..."
                              className="mb-2"
                            />
                          </div>

                          {/* Boutons d'action */}
                          <div className="flex flex-wrap gap-2">
                            <Button
                              onClick={() => handleAction(candidat.id, 'selectionner', {
                                commentaire: commentText[candidat.id]
                              })}
                              disabled={isLoading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                              Selectionner
                            </Button>
                            <Button
                              onClick={() => handleAction(candidat.id, 'entretien', {
                                commentaire: commentText[candidat.id]
                              })}
                              disabled={isLoading}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Demander entretien
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => {
                                const question = questionText[candidat.id] || prompt('Quelle est votre question ?')
                                if (question) {
                                  handleAction(candidat.id, 'demande_infos', { question })
                                }
                              }}
                              disabled={isLoading}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Demander infos
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleAction(candidat.id, 'refuser', {
                                commentaire: commentText[candidat.id]
                              })}
                              disabled={isLoading}
                              className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Refuser
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Bouton retour */}
        <div className="mt-8 text-center">
          <Link href="/c/shortlists">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux shortlists
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
