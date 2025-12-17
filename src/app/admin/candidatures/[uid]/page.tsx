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
  Shield, ArrowLeft, Briefcase, Building2, MapPin, Euro, Calendar,
  User, Clock, CheckCircle, XCircle, Eye, Loader2, Zap, FileText,
  Star, MessageSquare, Phone, Mail, ThumbsUp, ThumbsDown, MoreHorizontal,
  ExternalLink, Download, Send, AlertCircle, UserCheck
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface Candidature {
  id: number
  uid: string
  tjmPropose: number | null
  motivation: string | null
  scoreMatch: number | null
  statut: string
  origine: 'POSTULE' | 'IMPORTE' | 'MATCH_PROPOSE' | null
  vueLe: string | null
  reponduLe: string | null
  notesTrinexta: string | null
  createdAt: string
  updatedAt: string
  offre: {
    id: number
    uid: string
    codeUnique: string
    titre: string
    description: string
    statut: string
    typeOffre: string
    competencesRequises: string[]
    competencesSouhaitees: string[]
    tjmMin: number | null
    tjmMax: number | null
    lieu: string | null
    ville: string | null
    mobilite: string
    dateDebut: string | null
    dureeNombre: number | null
    dureeUnite: string
    client: {
      uid: string
      raisonSociale: string
    } | null
  }
  talent: {
    id: number
    uid: string
    codeUnique: string
    prenom: string
    nom: string
    titrePoste: string | null
    competences: string[]
    tjm: number | null
    tjmMin: number | null
    tjmMax: number | null
    disponibilite: string
    ville: string | null
    photoUrl: string | null
    statut: string
    telephone: string | null
    linkedinUrl: string | null
    cvUrl: string | null
    experience: number | null
    user?: {
      email: string
      isActive: boolean
      lastLoginAt: string | null
    }
  }
  entretiens: Array<{
    uid: string
    dateProposee: string
    statut: string
    type: string
    notes: string | null
  }>
}

const CANDIDATURE_STATUT_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  NOUVELLE: { label: 'Nouvelle', color: 'text-blue-400', bgColor: 'bg-blue-600' },
  VUE: { label: 'Vue', color: 'text-gray-400', bgColor: 'bg-gray-600' },
  EN_REVUE: { label: 'En revue', color: 'text-yellow-400', bgColor: 'bg-yellow-600' },
  PRE_SELECTIONNE: { label: 'Pre-selectionne', color: 'text-purple-400', bgColor: 'bg-purple-600' },
  SHORTLIST: { label: 'Shortlist', color: 'text-indigo-400', bgColor: 'bg-indigo-600' },
  PROPOSEE_CLIENT: { label: 'Propose au client', color: 'text-cyan-400', bgColor: 'bg-cyan-600' },
  ENTRETIEN_DEMANDE: { label: 'Entretien demande', color: 'text-orange-400', bgColor: 'bg-orange-600' },
  ENTRETIEN_PLANIFIE: { label: 'Entretien planifie', color: 'text-orange-300', bgColor: 'bg-orange-500' },
  ENTRETIEN_REALISE: { label: 'Entretien realise', color: 'text-teal-400', bgColor: 'bg-teal-600' },
  ACCEPTEE: { label: 'Acceptee', color: 'text-green-400', bgColor: 'bg-green-600' },
  REFUSEE: { label: 'Refusee', color: 'text-red-400', bgColor: 'bg-red-600' },
  MISSION_PERDUE: { label: 'Mission perdue', color: 'text-gray-500', bgColor: 'bg-gray-700' },
  RETIREE: { label: 'Retiree', color: 'text-gray-500', bgColor: 'bg-gray-700' },
}

export default function AdminCandidatureDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const uid = params.uid as string

  const [candidature, setCandidature] = useState<Candidature | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [noteInput, setNoteInput] = useState('')

  useEffect(() => {
    if (uid) {
      fetchCandidature()
    }
  }, [uid])

  const fetchCandidature = async () => {
    try {
      const res = await fetch(`/api/admin/candidatures/${uid}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        if (res.status === 404) {
          toast({
            title: "Erreur",
            description: "Candidature non trouvee",
            variant: "destructive",
          })
          router.push('/admin/candidatures')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setCandidature(data.candidature)

      // Marquer comme vue automatiquement si nouvelle
      if (data.candidature.statut === 'NOUVELLE' && !data.candidature.vueLe) {
        handleAction('marquer_vue')
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger la candidature",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string, notes?: string) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/candidatures/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Erreur')
      }
      toast({
        title: "Succes",
        description: "Candidature mise a jour",
      })
      fetchCandidature()
      setNoteInput('')
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const getStatutBadge = (statut: string) => {
    const config = CANDIDATURE_STATUT_CONFIG[statut] || { label: statut, bgColor: 'bg-gray-600' }
    return <Badge className={config.bgColor}>{config.label}</Badge>
  }

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-400'
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!candidature) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Candidature non trouvee</h2>
          <Link href="/admin/candidatures">
            <Button>Retour aux candidatures</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin/candidatures" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  Candidature de {candidature.talent.prenom} {candidature.talent.nom}
                  {getStatutBadge(candidature.statut)}
                </h1>
                <p className="text-sm text-gray-400">
                  Pour: {candidature.offre.titre}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-600">
                <Shield className="w-3 h-3 mr-1" />
                ADMIN
              </Badge>

              {/* Quick Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gray-600" disabled={updating}>
                    {updating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        Actions <MoreHorizontal className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => handleAction('mettre_en_revue')}>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Mettre en revue
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleAction('pre_selectionner')} className="text-purple-400">
                    <Star className="w-4 h-4 mr-2" />
                    Pre-selectionner
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleAction('ajouter_shortlist')} className="text-indigo-400">
                    <UserCheck className="w-4 h-4 mr-2" />
                    Ajouter a la shortlist
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleAction('proposer_client')} className="text-cyan-400">
                    <Send className="w-4 h-4 mr-2" />
                    Proposer au client
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleAction('demander_entretien')} className="text-orange-400">
                    <Phone className="w-4 h-4 mr-2" />
                    Demander entretien
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleAction('attente_client')}>
                    <Clock className="w-4 h-4 mr-2" />
                    Attente retour client
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => handleAction('accepter')} className="text-green-400">
                    <ThumbsUp className="w-4 h-4 mr-2" />
                    Accepter / Valider
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => handleAction('refuser')} className="text-red-400">
                    <ThumbsDown className="w-4 h-4 mr-2" />
                    Refuser
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Score et Resume */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Score */}
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0 ${
                    (candidature.scoreMatch || 0) >= 80 ? 'bg-green-600/20' :
                    (candidature.scoreMatch || 0) >= 60 ? 'bg-yellow-600/20' : 'bg-red-600/20'
                  }`}>
                    <div className="text-center">
                      <span className={`text-3xl font-bold ${getScoreColor(candidature.scoreMatch)}`}>
                        {candidature.scoreMatch || 0}%
                      </span>
                      <p className="text-xs text-gray-400">Match</p>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatutBadge(candidature.statut)}
                      {candidature.origine === 'POSTULE' && (
                        <Badge className="bg-green-600/20 text-green-400 border border-green-600">A postule</Badge>
                      )}
                      {candidature.origine === 'IMPORTE' && (
                        <Badge className="bg-orange-600/20 text-orange-400 border border-orange-600">Importe</Badge>
                      )}
                      {candidature.origine === 'MATCH_PROPOSE' && (
                        <Badge className="bg-purple-600/20 text-purple-400 border border-purple-600">Match propose</Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Candidature recue</p>
                        <p className="text-white">{formatDate(candidature.createdAt)}</p>
                      </div>
                      {candidature.vueLe && (
                        <div>
                          <p className="text-gray-400">Vue le</p>
                          <p className="text-white">{formatDate(candidature.vueLe)}</p>
                        </div>
                      )}
                      {candidature.reponduLe && (
                        <div>
                          <p className="text-gray-400">Repondu le</p>
                          <p className="text-white">{formatDate(candidature.reponduLe)}</p>
                        </div>
                      )}
                      {candidature.tjmPropose && (
                        <div>
                          <p className="text-gray-400">TJM propose</p>
                          <p className="text-white font-medium">{candidature.tjmPropose} EUR/jour</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motivation */}
            {candidature.motivation && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Motivation du candidat
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-300 whitespace-pre-wrap">{candidature.motivation}</p>
                </CardContent>
              </Card>
            )}

            {/* Notes internes */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Notes internes TRINEXTA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {candidature.notesTrinexta && (
                  <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                    <p className="text-yellow-300 whitespace-pre-wrap">{candidature.notesTrinexta}</p>
                  </div>
                )}
                <div>
                  <Textarea
                    placeholder="Ajouter une note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button
                    className="mt-2"
                    size="sm"
                    onClick={() => handleAction('mettre_en_revue', noteInput)}
                    disabled={!noteInput.trim() || updating}
                  >
                    Ajouter note
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Entretiens */}
            {candidature.entretiens.length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Entretiens ({candidature.entretiens.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {candidature.entretiens.map((entretien) => (
                      <div key={entretien.uid} className="p-3 bg-gray-700 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium text-white">
                              {new Date(entretien.dateProposee).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                            <p className="text-sm text-gray-400">{entretien.type}</p>
                          </div>
                          <Badge className={
                            entretien.statut === 'REALISE' ? 'bg-green-600' :
                            entretien.statut === 'CONFIRME' ? 'bg-blue-600' :
                            entretien.statut === 'ANNULE' ? 'bg-red-600' : 'bg-yellow-600'
                          }>
                            {entretien.statut}
                          </Badge>
                        </div>
                        {entretien.notes && (
                          <p className="text-sm text-gray-400 mt-2">{entretien.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Colonne laterale */}
          <div className="space-y-6">
            {/* Talent */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Talent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  {candidature.talent.photoUrl ? (
                    <img
                      src={candidature.talent.photoUrl}
                      alt=""
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Link href={`/admin/talents/${candidature.talent.uid}`}>
                      <h3 className="font-semibold text-white hover:text-primary">
                        {candidature.talent.prenom} {candidature.talent.nom}
                      </h3>
                    </Link>
                    <p className="text-sm text-gray-400">{candidature.talent.codeUnique}</p>
                    <p className="text-sm text-primary">{candidature.talent.titrePoste || 'Freelance'}</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {candidature.talent.user?.email && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a href={`mailto:${candidature.talent.user.email}`} className="hover:text-primary">
                        {candidature.talent.user.email}
                      </a>
                    </div>
                  )}
                  {candidature.talent.telephone && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <a href={`tel:${candidature.talent.telephone}`} className="hover:text-primary">
                        {candidature.talent.telephone}
                      </a>
                    </div>
                  )}
                  {candidature.talent.ville && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {candidature.talent.ville}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-300">
                    <Euro className="w-4 h-4 text-gray-500" />
                    {candidature.talent.tjm ? `${candidature.talent.tjm} EUR/jour` : 'TJM non defini'}
                    {candidature.talent.tjmMin && candidature.talent.tjmMax && (
                      <span className="text-gray-500">
                        ({candidature.talent.tjmMin}-{candidature.talent.tjmMax})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-gray-300">
                    <Clock className="w-4 h-4 text-gray-500" />
                    {candidature.talent.disponibilite}
                  </div>
                  {candidature.talent.experience && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Briefcase className="w-4 h-4 text-gray-500" />
                      {candidature.talent.experience} ans d'experience
                    </div>
                  )}
                </div>

                {/* Competences */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Competences</p>
                  <div className="flex flex-wrap gap-1">
                    {candidature.talent.competences.slice(0, 10).map((comp, i) => (
                      <Badge key={i} className="bg-gray-700 text-gray-300 text-xs">
                        {comp}
                      </Badge>
                    ))}
                    {candidature.talent.competences.length > 10 && (
                      <Badge className="bg-gray-700 text-gray-400 text-xs">
                        +{candidature.talent.competences.length - 10}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Link href={`/admin/talents/${candidature.talent.uid}`} className="flex-1">
                    <Button variant="outline" className="w-full border-gray-600">
                      <Eye className="w-4 h-4 mr-2" />
                      Voir profil
                    </Button>
                  </Link>
                  {candidature.talent.cvUrl && (
                    <a href={candidature.talent.cvUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-gray-600">
                        <Download className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                  {candidature.talent.linkedinUrl && (
                    <a href={candidature.talent.linkedinUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="border-gray-600">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Offre */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Offre
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Link href={`/admin/offres/${candidature.offre.uid}`}>
                    <h3 className="font-semibold text-white hover:text-primary">
                      {candidature.offre.titre}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-400">{candidature.offre.codeUnique}</p>
                </div>

                {candidature.offre.client && (
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <Link href={`/admin/clients/${candidature.offre.client.uid}`} className="hover:text-primary">
                      {candidature.offre.client.raisonSociale}
                    </Link>
                  </div>
                )}

                <div className="space-y-2 text-sm">
                  {candidature.offre.lieu && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      {candidature.offre.lieu} {candidature.offre.ville && `- ${candidature.offre.ville}`}
                    </div>
                  )}
                  {(candidature.offre.tjmMin || candidature.offre.tjmMax) && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Euro className="w-4 h-4 text-gray-500" />
                      {candidature.offre.tjmMin && candidature.offre.tjmMax
                        ? `${candidature.offre.tjmMin} - ${candidature.offre.tjmMax} EUR/jour`
                        : candidature.offre.tjmMin
                          ? `A partir de ${candidature.offre.tjmMin} EUR/jour`
                          : `Jusqu'a ${candidature.offre.tjmMax} EUR/jour`
                      }
                    </div>
                  )}
                  {candidature.offre.dureeNombre && (
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-gray-500" />
                      {candidature.offre.dureeNombre} {candidature.offre.dureeUnite === 'MOIS' ? 'mois' : 'jours'}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-gray-300">
                    <Zap className="w-4 h-4 text-gray-500" />
                    {candidature.offre.mobilite === 'FULL_REMOTE' ? 'Full Remote' :
                     candidature.offre.mobilite === 'HYBRIDE' ? 'Hybride' :
                     candidature.offre.mobilite === 'SUR_SITE' ? 'Sur site' : candidature.offre.mobilite}
                  </div>
                </div>

                {/* Competences requises */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Competences requises</p>
                  <div className="flex flex-wrap gap-1">
                    {candidature.offre.competencesRequises.slice(0, 8).map((comp, i) => {
                      const matched = candidature.talent.competences.some(
                        tc => tc.toLowerCase() === comp.toLowerCase()
                      )
                      return (
                        <Badge
                          key={i}
                          className={matched ? 'bg-green-600/20 text-green-400 border border-green-600' : 'bg-red-600/20 text-red-400 border border-red-600'}
                        >
                          {comp}
                        </Badge>
                      )
                    })}
                  </div>
                </div>

                <Link href={`/admin/offres/${candidature.offre.uid}`}>
                  <Button variant="outline" className="w-full border-gray-600 mt-2">
                    <Eye className="w-4 h-4 mr-2" />
                    Voir offre complete
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Actions rapides */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Actions rapides</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full border-green-600 text-green-400 hover:bg-green-600/20"
                  onClick={() => handleAction('accepter')}
                  disabled={updating}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accepter la candidature
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-orange-600 text-orange-400 hover:bg-orange-600/20"
                  onClick={() => handleAction('demander_entretien')}
                  disabled={updating}
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Demander un entretien
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-red-600 text-red-400 hover:bg-red-600/20"
                  onClick={() => handleAction('refuser')}
                  disabled={updating}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Refuser la candidature
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
