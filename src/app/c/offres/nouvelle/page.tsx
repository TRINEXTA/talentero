'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Building2, ChevronLeft, Save, Send, Briefcase, MapPin,
  Calendar, Clock, AlertCircle, Plus, X, Loader2
} from 'lucide-react'

const COMPETENCES_SUGGESTIONS = [
  'React', 'Angular', 'Vue.js', 'Node.js', 'TypeScript', 'JavaScript',
  'Python', 'Java', 'C#', '.NET', 'PHP', 'Laravel', 'Symfony',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'DevOps', 'CI/CD',
  'PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Elasticsearch',
  'Agile', 'Scrum', 'Jira', 'Git', 'API REST', 'GraphQL',
  'Machine Learning', 'Data Science', 'Big Data', 'Spark',
  'iOS', 'Android', 'React Native', 'Flutter', 'Swift', 'Kotlin',
  'SAP', 'Salesforce', 'Power BI', 'Tableau', 'Excel VBA'
]

const MODES_TRAVAIL = [
  { value: 'FULL_REMOTE', label: 'Full Remote' },
  { value: 'HYBRIDE', label: 'Hybride' },
  { value: 'SUR_SITE', label: 'Sur site' },
  { value: 'FLEXIBLE', label: 'Flexible' },
]

const URGENCES = [
  { value: 'BASSE', label: 'Basse' },
  { value: 'NORMALE', label: 'Normale' },
  { value: 'HAUTE', label: 'Haute' },
  { value: 'CRITIQUE', label: 'Critique' },
]

export default function NouvelleOffrePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    contexte: '',
    competencesRequises: [] as string[],
    competencesSouhaitees: [] as string[],
    experienceMin: '',
    tjmMin: '',
    tjmMax: '',
    lieu: '',
    modesTravail: [] as string[],
    dureeMission: '',
    dateDebut: '',
    urgence: 'NORMALE',
  })

  const [competenceInput, setCompetenceInput] = useState('')
  const [competenceSouhaiteInput, setCompetenceSouhaiteInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showSuggestionsSouhait, setShowSuggestionsSouhait] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const addCompetence = (comp: string, type: 'requises' | 'souhaitees') => {
    const field = type === 'requises' ? 'competencesRequises' : 'competencesSouhaitees'
    if (!formData[field].includes(comp)) {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], comp]
      }))
    }
    if (type === 'requises') {
      setCompetenceInput('')
      setShowSuggestions(false)
    } else {
      setCompetenceSouhaiteInput('')
      setShowSuggestionsSouhait(false)
    }
  }

  const removeCompetence = (comp: string, type: 'requises' | 'souhaitees') => {
    const field = type === 'requises' ? 'competencesRequises' : 'competencesSouhaitees'
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(c => c !== comp)
    }))
  }

  const toggleModeTravail = (mode: string) => {
    setFormData(prev => ({
      ...prev,
      modesTravail: prev.modesTravail.includes(mode)
        ? prev.modesTravail.filter(m => m !== mode)
        : [...prev.modesTravail, mode]
    }))
  }

  const handleSubmit = async (publish: boolean = false) => {
    setError('')

    if (!formData.titre.trim()) {
      setError('Le titre est requis')
      return
    }

    if (publish && !formData.description.trim()) {
      setError('La description est requise pour publier')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/client/offres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          experienceMin: formData.experienceMin ? parseInt(formData.experienceMin) : null,
          tjmMin: formData.tjmMin ? parseInt(formData.tjmMin) : null,
          tjmMax: formData.tjmMax ? parseInt(formData.tjmMax) : null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la création')
        return
      }

      const data = await res.json()

      if (publish) {
        // Publier l'offre
        const pubRes = await fetch(`/api/client/offres/${data.offre.uid}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'publier' }),
        })

        if (!pubRes.ok) {
          // Créée mais pas publiée
          router.push(`/c/offres/${data.offre.uid}`)
          return
        }
      }

      router.push(`/c/offres/${data.offre.uid}`)
    } catch (err) {
      setError('Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  const filteredSuggestions = COMPETENCES_SUGGESTIONS.filter(
    c => c.toLowerCase().includes(competenceInput.toLowerCase()) &&
      !formData.competencesRequises.includes(c) &&
      !formData.competencesSouhaitees.includes(c)
  )

  const filteredSuggestionsSouhait = COMPETENCES_SUGGESTIONS.filter(
    c => c.toLowerCase().includes(competenceSouhaiteInput.toLowerCase()) &&
      !formData.competencesRequises.includes(c) &&
      !formData.competencesSouhaitees.includes(c)
  )

  return (
    <div className="min-h-screen bg-gray-700">
      {/* Header */}
      <header className="bg-gray-600 border-gray-500 border-b sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/c/offres" className="text-gray-300 hover:text-primary">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-lg font-semibold text-white">Nouvelle offre</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer brouillon
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Publier
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Informations principales */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle>Informations principales</CardTitle>
              <CardDescription>Décrivez le poste et la mission</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Titre de l'offre *
                </label>
                <Input
                  name="titre"
                  value={formData.titre}
                  onChange={handleChange}
                  placeholder="Ex: Développeur React Senior"
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description de la mission *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={6}
                  className="w-full px-3 py-2 bg-gray-500 border border-gray-400 text-white placeholder:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Décrivez la mission, les responsabilités, les objectifs..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Contexte (optionnel)
                </label>
                <textarea
                  name="contexte"
                  value={formData.contexte}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-500 border border-gray-400 text-white placeholder:text-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Contexte du projet, équipe, environnement technique..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Compétences */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle>Compétences</CardTitle>
              <CardDescription>Définissez les compétences recherchées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Compétences requises
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.competencesRequises.map((comp) => (
                    <Badge key={comp} className="bg-primary text-white pl-2 pr-1 py-1">
                      {comp}
                      <button
                        type="button"
                        onClick={() => removeCompetence(comp, 'requises')}
                        className="ml-1 hover:bg-primary-dark rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    value={competenceInput}
                    onChange={(e) => {
                      setCompetenceInput(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    placeholder="Tapez pour ajouter une compétence..."
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && competenceInput.trim()) {
                        e.preventDefault()
                        addCompetence(competenceInput.trim(), 'requises')
                      }
                    }}
                  />
                  {showSuggestions && competenceInput && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredSuggestions.slice(0, 10).map((comp) => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => addCompetence(comp, 'requises')}
                          className="w-full px-4 py-2 text-left text-white hover:bg-gray-500 text-sm"
                        >
                          {comp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Compétences souhaitées (optionnel)
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.competencesSouhaitees.map((comp) => (
                    <Badge key={comp} variant="outline" className="pl-2 pr-1 py-1">
                      {comp}
                      <button
                        type="button"
                        onClick={() => removeCompetence(comp, 'souhaitees')}
                        className="ml-1 hover:bg-gray-200 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    value={competenceSouhaiteInput}
                    onChange={(e) => {
                      setCompetenceSouhaiteInput(e.target.value)
                      setShowSuggestionsSouhait(true)
                    }}
                    onFocus={() => setShowSuggestionsSouhait(true)}
                    placeholder="Compétences bonus..."
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && competenceSouhaiteInput.trim()) {
                        e.preventDefault()
                        addCompetence(competenceSouhaiteInput.trim(), 'souhaitees')
                      }
                    }}
                  />
                  {showSuggestionsSouhait && competenceSouhaiteInput && filteredSuggestionsSouhait.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-600 border border-gray-500 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {filteredSuggestionsSouhait.slice(0, 10).map((comp) => (
                        <button
                          key={comp}
                          type="button"
                          onClick={() => addCompetence(comp, 'souhaitees')}
                          className="w-full px-4 py-2 text-left text-white hover:bg-gray-500 text-sm"
                        >
                          {comp}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Expérience minimum (années)
                </label>
                <Input
                  type="number"
                  name="experienceMin"
                  value={formData.experienceMin}
                  onChange={handleChange}
                  min="0"
                  max="30"
                  className="w-32 bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
              </div>
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card className="bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle>Conditions</CardTitle>
              <CardDescription>Budget, lieu et modalités</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    TJM minimum (€)
                  </label>
                  <Input
                    type="number"
                    name="tjmMin"
                    value={formData.tjmMin}
                    onChange={handleChange}
                    min="0"
                    placeholder="400"
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    TJM maximum (€)
                  </label>
                  <Input
                    type="number"
                    name="tjmMax"
                    value={formData.tjmMax}
                    onChange={handleChange}
                    min="0"
                    placeholder="600"
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Lieu de mission
                </label>
                <Input
                  name="lieu"
                  value={formData.lieu}
                  onChange={handleChange}
                  placeholder="Paris, Lyon, Remote..."
                  className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mode de travail
                </label>
                <div className="flex flex-wrap gap-2">
                  {MODES_TRAVAIL.map((mode) => (
                    <button
                      key={mode.value}
                      type="button"
                      onClick={() => toggleModeTravail(mode.value)}
                      className={`px-4 py-2 rounded-lg border text-sm transition-colors ${
                        formData.modesTravail.includes(mode.value)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-gray-600 text-gray-200 border-gray-400 hover:border-primary'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Durée de la mission
                  </label>
                  <Input
                    name="dureeMission"
                    value={formData.dureeMission}
                    onChange={handleChange}
                    placeholder="6 mois, 1 an, longue durée..."
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Date de début souhaitée
                  </label>
                  <Input
                    type="date"
                    name="dateDebut"
                    value={formData.dateDebut}
                    onChange={handleChange}
                    className="bg-gray-500 border-gray-400 text-white placeholder:text-gray-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Urgence
                </label>
                <select
                  name="urgence"
                  value={formData.urgence}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-gray-500 border border-gray-400 text-white rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {URGENCES.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions bottom */}
        <div className="mt-8 flex justify-end gap-4">
          <Link href="/c/offres">
            <Button variant="outline">Annuler</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => handleSubmit(false)}
            disabled={loading}
          >
            Enregistrer brouillon
          </Button>
          <Button onClick={() => handleSubmit(true)} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Publier l'offre
          </Button>
        </div>
      </main>
    </div>
  )
}
