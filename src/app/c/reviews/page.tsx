'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/ui/notification-bell'
import { StarRating } from '@/components/reviews'
import {
  Building2, Star, Settings, LogOut, Plus, X, User,
  CheckCircle, Clock, ThumbsUp, RefreshCw, Trash2
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Review {
  id: number
  uid: string
  noteGlobale: number
  noteCompetences: number | null
  noteCommunication: number | null
  notePonctualite: number | null
  noteQualite: number | null
  titre: string | null
  commentaire: string
  recommande: boolean
  statut: string
  reponse: string | null
  createdAt: string
  talent: {
    uid: string
    prenom: string
    nom: string
    titrePoste: string | null
    photoUrl: string | null
  }
}

interface ReviewForm {
  talentUid: string
  noteGlobale: number
  noteCompetences: number
  noteCommunication: number
  notePonctualite: number
  noteQualite: number
  titre: string
  commentaire: string
  recommande: boolean
}

const statutLabels: Record<string, { label: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  PUBLIEE: { label: 'Publiée', color: 'bg-green-100 text-green-800' },
  REJETEE: { label: 'Rejetée', color: 'bg-red-100 text-red-800' },
  MASQUEE: { label: 'Masquée', color: 'bg-gray-100 text-gray-800' },
}

export default function ClientReviewsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState<Review[]>([])
  const [stats, setStats] = useState({ total: 0, publiees: 0, enAttente: 0, moyenneNote: 0 })
  const [showForm, setShowForm] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [searchTalent, setSearchTalent] = useState('')
  const [talentResults, setTalentResults] = useState<{ uid: string; prenom: string; nom: string; titrePoste: string | null }[]>([])
  const [selectedTalent, setSelectedTalent] = useState<{ uid: string; prenom: string; nom: string } | null>(null)
  const [form, setForm] = useState<ReviewForm>({
    talentUid: '',
    noteGlobale: 5,
    noteCompetences: 5,
    noteCommunication: 5,
    notePonctualite: 5,
    noteQualite: 5,
    titre: '',
    commentaire: '',
    recommande: true,
  })

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/c/connexion')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'CLIENT') {
        router.push('/c/connexion')
        return
      }

      const res = await fetch('/api/client/reviews')
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews)
        setStats(data.stats)
      }
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

  const searchTalents = async (query: string) => {
    if (query.length < 2) {
      setTalentResults([])
      return
    }
    try {
      const res = await fetch(`/api/talents/search?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setTalentResults(data.talents || [])
      }
    } catch (error) {
      console.error('Erreur recherche:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTalent) return

    setFormLoading(true)
    try {
      const res = await fetch('/api/client/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          talentUid: selectedTalent.uid,
        }),
      })

      if (res.ok) {
        fetchReviews()
        setShowForm(false)
        resetForm()
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (uid: string) => {
    if (!confirm('Supprimer cette évaluation ?')) return

    try {
      await fetch(`/api/client/reviews/${uid}`, { method: 'DELETE' })
      fetchReviews()
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const resetForm = () => {
    setForm({
      talentUid: '',
      noteGlobale: 5,
      noteCompetences: 5,
      noteCommunication: 5,
      notePonctualite: 5,
      noteQualite: 5,
      titre: '',
      commentaire: '',
      recommande: true,
    })
    setSelectedTalent(null)
    setSearchTalent('')
    setTalentResults([])
  }

  const RatingSelector = ({
    label,
    value,
    onChange,
  }: {
    label: string
    value: number
    onChange: (v: number) => void
  }) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="p-1 hover:scale-110 transition"
          >
            <Star
              className={`w-6 h-6 ${
                rating <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-500">{value}/5</span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
                <Link href="/c/offres" className="text-gray-600 hover:text-primary">
                  Mes offres
                </Link>
                <Link href="/c/shortlists" className="text-gray-600 hover:text-primary">
                  Shortlists
                </Link>
                <Link href="/c/entretiens" className="text-gray-600 hover:text-primary">
                  Entretiens
                </Link>
                <Link href="/c/reviews" className="text-primary font-medium">
                  Évaluations
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-7 h-7" />
              Mes Évaluations
            </h1>
            <p className="text-gray-600 mt-1">
              Évaluez les freelances avec qui vous avez travaillé
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchReviews}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nouvelle évaluation
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-gray-500">Évaluations</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.publiees}</p>
                <p className="text-sm text-gray-500">Publiées</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.enAttente}</p>
                <p className="text-sm text-gray-500">En attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-purple-600 fill-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.moyenneNote}</p>
                <p className="text-sm text-gray-500">Note moyenne</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Nouvelle évaluation</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => { setShowForm(false); resetForm(); }}>
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <CardDescription>
                Évaluez un freelance avec qui vous avez travaillé
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Recherche talent */}
                <div>
                  <Label>Freelance à évaluer</Label>
                  {selectedTalent ? (
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mt-1">
                      <User className="w-8 h-8 text-gray-400" />
                      <div className="flex-1">
                        <p className="font-medium">{selectedTalent.prenom} {selectedTalent.nom}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTalent(null)}
                      >
                        Changer
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        placeholder="Rechercher par nom..."
                        value={searchTalent}
                        onChange={(e) => {
                          setSearchTalent(e.target.value)
                          searchTalents(e.target.value)
                        }}
                      />
                      {talentResults.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border max-h-48 overflow-auto">
                          {talentResults.map((t) => (
                            <button
                              key={t.uid}
                              type="button"
                              className="w-full p-3 text-left hover:bg-gray-50 flex items-center gap-3"
                              onClick={() => {
                                setSelectedTalent(t)
                                setTalentResults([])
                                setSearchTalent('')
                              }}
                            >
                              <User className="w-6 h-6 text-gray-400" />
                              <div>
                                <p className="font-medium">{t.prenom} {t.nom}</p>
                                {t.titrePoste && (
                                  <p className="text-sm text-gray-500">{t.titrePoste}</p>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {selectedTalent && (
                  <>
                    {/* Notes */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <RatingSelector
                        label="Note globale *"
                        value={form.noteGlobale}
                        onChange={(v) => setForm({ ...form, noteGlobale: v })}
                      />
                      <RatingSelector
                        label="Compétences techniques"
                        value={form.noteCompetences}
                        onChange={(v) => setForm({ ...form, noteCompetences: v })}
                      />
                      <RatingSelector
                        label="Communication"
                        value={form.noteCommunication}
                        onChange={(v) => setForm({ ...form, noteCommunication: v })}
                      />
                      <RatingSelector
                        label="Ponctualité / Respect des délais"
                        value={form.notePonctualite}
                        onChange={(v) => setForm({ ...form, notePonctualite: v })}
                      />
                      <RatingSelector
                        label="Qualité du travail"
                        value={form.noteQualite}
                        onChange={(v) => setForm({ ...form, noteQualite: v })}
                      />
                    </div>

                    {/* Commentaire */}
                    <div>
                      <Label htmlFor="titre">Titre (optionnel)</Label>
                      <Input
                        id="titre"
                        value={form.titre}
                        onChange={(e) => setForm({ ...form, titre: e.target.value })}
                        placeholder="Ex: Excellente collaboration"
                      />
                    </div>

                    <div>
                      <Label htmlFor="commentaire">Commentaire *</Label>
                      <Textarea
                        id="commentaire"
                        value={form.commentaire}
                        onChange={(e) => setForm({ ...form, commentaire: e.target.value })}
                        placeholder="Décrivez votre expérience avec ce freelance..."
                        rows={4}
                        required
                      />
                    </div>

                    {/* Recommandation */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="recommande"
                        checked={form.recommande}
                        onChange={(e) => setForm({ ...form, recommande: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <Label htmlFor="recommande" className="flex items-center gap-2 cursor-pointer">
                        <ThumbsUp className="w-4 h-4 text-green-600" />
                        Je recommande ce freelance
                      </Label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setShowForm(false); resetForm(); }}
                      >
                        Annuler
                      </Button>
                      <Button type="submit" disabled={formLoading || !form.commentaire}>
                        Publier l'évaluation
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </CardContent>
          </Card>
        )}

        {/* Liste des reviews */}
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucune évaluation
              </h3>
              <p className="text-gray-500 mb-4">
                Partagez votre expérience avec les freelances
              </p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une évaluation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.uid}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                        {review.talent.photoUrl ? (
                          <img
                            src={review.talent.photoUrl}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-gray-900">
                            {review.talent.prenom} {review.talent.nom}
                          </h3>
                          <Badge className={statutLabels[review.statut]?.color || 'bg-gray-100'}>
                            {statutLabels[review.statut]?.label || review.statut}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {review.talent.titrePoste || 'Freelance'}
                        </p>
                        <StarRating rating={review.noteGlobale} />
                        {review.titre && (
                          <p className="font-medium mt-2">{review.titre}</p>
                        )}
                        <p className="text-gray-600 mt-1">{review.commentaire}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {format(new Date(review.createdAt), "d MMMM yyyy", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {review.statut === 'EN_ATTENTE' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(review.uid)}
                        className="text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
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
