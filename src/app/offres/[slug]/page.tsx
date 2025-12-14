"use client"

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import {
  ArrowLeft, MapPin, Euro, Clock, Building2, Calendar, CheckCircle,
  XCircle, AlertCircle, Briefcase, Send, Eye, Users
} from 'lucide-react'

interface OffreDetail {
  uid: string
  slug: string
  titre: string
  description: string
  responsabilites: string | null
  profilRecherche: string | null
  competencesRequises: string[]
  competencesSouhaitees: string[]
  tjmMin: number | null
  tjmMax: number | null
  dureeNombre: number | null
  dureeUnite: string | null
  dateDebut: string | null
  dateFin: string | null
  renouvelable: boolean
  lieu: string | null
  mobilite: string
  experienceMin: number | null
  statut: string
  publieLe: string
  nbVues: number
  nbCandidatures: number
  client: {
    uid: string
    raisonSociale: string
    secteurActivite: string | null
    tailleEntreprise: string | null
    ville: string | null
    logoUrl: string | null
    description: string | null
  } | null
}

interface MatchDetails {
  matchedRequired: string[]
  matchedOptional: string[]
  missingRequired: string[]
}

const MOBILITE_LABELS: Record<string, string> = {
  FULL_REMOTE: 'Full Remote',
  HYBRIDE: 'Hybride',
  SUR_SITE: 'Sur site',
  FLEXIBLE: 'Flexible',
}

export default function OffreDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [offre, setOffre] = useState<OffreDetail | null>(null)
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [matchDetails, setMatchDetails] = useState<MatchDetails | null>(null)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [showApplyForm, setShowApplyForm] = useState(false)
  const [candidature, setCandidature] = useState({
    tjmPropose: '',
    motivation: '',
  })

  useEffect(() => {
    if (params.slug) {
      fetchOffre()
    }
  }, [params.slug])

  const fetchOffre = async () => {
    try {
      const response = await fetch(`/api/offres/${params.slug}`)
      if (!response.ok) {
        if (response.status === 404) {
          router.push('/offres')
          return
        }
        throw new Error('Erreur chargement offre')
      }
      const data = await response.json()
      setOffre(data.offre)
      setMatchScore(data.matchScore)
      setMatchDetails(data.matchDetails)
      setAlreadyApplied(data.alreadyApplied)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger l'offre",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    setApplying(true)
    try {
      const response = await fetch('/api/candidatures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          offreId: offre?.uid,
          tjmPropose: candidature.tjmPropose ? parseInt(candidature.tjmPropose) : null,
          motivation: candidature.motivation || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Connexion requise",
            description: "Connectez-vous pour postuler à cette offre",
            variant: "destructive",
          })
          router.push('/t/connexion')
          return
        }
        throw new Error(data.error || 'Erreur')
      }

      toast({
        title: "Candidature envoyée !",
        description: "Vous recevrez une notification dès que votre candidature sera traitée.",
      })
      setAlreadyApplied(true)
      setShowApplyForm(false)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la candidature",
        variant: "destructive",
      })
    } finally {
      setApplying(false)
    }
  }

  const formatTJM = (min: number | null, max: number | null) => {
    if (min && max) return `${min} - ${max} €/jour`
    if (min) return `À partir de ${min} €/jour`
    if (max) return `Jusqu'à ${max} €/jour`
    return 'TJM à définir'
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!offre) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/offres" className="flex items-center gap-2 text-gray-600 hover:text-primary">
              <ArrowLeft className="w-4 h-4" />
              Retour aux offres
            </Link>
            <Link href="/" className="text-2xl font-bold text-primary">
              Talentero
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  {offre.client?.logoUrl ? (
                    <img
                      src={offre.client.logoUrl}
                      alt={offre.client.raisonSociale}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {offre.titre}
                    </h1>
                    <p className="text-gray-500">
                      {offre.client?.raisonSociale || 'TRINEXTA'}
                      {offre.client?.ville && ` • ${offre.client.ville}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 mb-4">
                  <Badge variant="info" className="text-sm">
                    <Euro className="w-4 h-4 mr-1" />
                    {formatTJM(offre.tjmMin, offre.tjmMax)}
                  </Badge>
                  {offre.lieu && (
                    <Badge variant="outline" className="text-sm">
                      <MapPin className="w-4 h-4 mr-1" />
                      {offre.lieu}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-sm">
                    {MOBILITE_LABELS[offre.mobilite]}
                  </Badge>
                  {offre.dureeNombre && (
                    <Badge variant="outline" className="text-sm">
                      <Clock className="w-4 h-4 mr-1" />
                      {offre.dureeNombre} {offre.dureeUnite === 'JOURS' ? 'jours' : 'mois'}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    {offre.nbVues} vues
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {offre.nbCandidatures} candidatures
                  </span>
                  <span>Publiée le {formatDate(offre.publieLe)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle>Description de la mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-line">{offre.description}</p>
              </CardContent>
            </Card>

            {/* Responsabilités */}
            {offre.responsabilites && (
              <Card>
                <CardHeader>
                  <CardTitle>Responsabilités</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-line">{offre.responsabilites}</p>
                </CardContent>
              </Card>
            )}

            {/* Profil recherché */}
            {offre.profilRecherche && (
              <Card>
                <CardHeader>
                  <CardTitle>Profil recherché</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-line">{offre.profilRecherche}</p>
                </CardContent>
              </Card>
            )}

            {/* Compétences */}
            <Card>
              <CardHeader>
                <CardTitle>Compétences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Requises</h4>
                  <div className="flex flex-wrap gap-2">
                    {offre.competencesRequises.map((comp) => (
                      <Badge
                        key={comp}
                        variant={matchDetails?.matchedRequired.includes(comp) ? 'success' : 'secondary'}
                      >
                        {matchDetails?.matchedRequired.includes(comp) && (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        )}
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </div>

                {offre.competencesSouhaitees.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Souhaitées (bonus)</h4>
                    <div className="flex flex-wrap gap-2">
                      {offre.competencesSouhaitees.map((comp) => (
                        <Badge
                          key={comp}
                          variant={matchDetails?.matchedOptional.includes(comp) ? 'success' : 'outline'}
                        >
                          {matchDetails?.matchedOptional.includes(comp) && (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          )}
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Match Score */}
            {matchScore !== null && (
              <Card className={matchScore >= 70 ? 'border-green-200 bg-green-50' : ''}>
                <CardContent className="p-6 text-center">
                  <h3 className="font-medium text-gray-900 mb-2">Votre score de matching</h3>
                  <div className={`text-5xl font-bold mb-2 ${
                    matchScore >= 70 ? 'text-green-600' :
                    matchScore >= 50 ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {matchScore}%
                  </div>
                  <p className="text-sm text-gray-500">
                    {matchScore >= 70 ? 'Excellent match !' :
                     matchScore >= 50 ? 'Bon match' : 'Match partiel'}
                  </p>

                  {matchDetails && matchDetails.missingRequired.length > 0 && (
                    <div className="mt-4 text-left">
                      <p className="text-sm text-gray-600 mb-2">Compétences manquantes :</p>
                      <div className="flex flex-wrap gap-1">
                        {matchDetails.missingRequired.map((comp) => (
                          <Badge key={comp} variant="outline" className="text-xs text-red-600 border-red-200">
                            <XCircle className="w-3 h-3 mr-1" />
                            {comp}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Apply Card */}
            <Card>
              <CardContent className="p-6">
                {alreadyApplied ? (
                  <div className="text-center">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <h3 className="font-medium text-gray-900 mb-2">Candidature envoyée</h3>
                    <p className="text-sm text-gray-500">
                      Vous avez déjà postulé à cette offre
                    </p>
                    <Link href="/t/candidatures">
                      <Button variant="outline" className="mt-4 w-full">
                        Voir mes candidatures
                      </Button>
                    </Link>
                  </div>
                ) : showApplyForm ? (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Postuler à cette offre</h3>

                    <div>
                      <Label>TJM proposé (€/jour)</Label>
                      <Input
                        type="number"
                        placeholder="Ex: 550"
                        value={candidature.tjmPropose}
                        onChange={(e) => setCandidature({ ...candidature, tjmPropose: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label>Message de motivation (optionnel)</Label>
                      <Textarea
                        placeholder="Pourquoi cette mission vous intéresse..."
                        value={candidature.motivation}
                        onChange={(e) => setCandidature({ ...candidature, motivation: e.target.value })}
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowApplyForm(false)}
                      >
                        Annuler
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleApply}
                        loading={applying}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={() => setShowApplyForm(true)}
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Postuler maintenant
                    </Button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                      Votre profil sera envoyé de manière anonymisée
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Info entreprise */}
            {offre.client && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">À propos de l'entreprise</CardTitle>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium text-gray-900 mb-2">
                    {offre.client.raisonSociale}
                  </h4>
                  {offre.client.secteurActivite && (
                    <p className="text-sm text-gray-500 mb-2">
                      {offre.client.secteurActivite}
                    </p>
                  )}
                  {offre.client.description && (
                    <p className="text-sm text-gray-600">
                      {offre.client.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
