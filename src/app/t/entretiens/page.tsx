'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { NotificationBell } from '@/components/ui/notification-bell'
import {
  User, Calendar, Clock, Video, MapPin, Building2, Check, X,
  AlertCircle, Settings, LogOut, CalendarClock, CheckCircle, XCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Entretien {
  uid: string
  dateProposee: string
  heureDebut: string
  heureFin: string | null
  statut: string
  typeVisio: string | null
  lienVisio: string | null
  dateAlternative: string | null
  heureAlternative: string | null
  notesEntretien: string | null
  offre: {
    uid: string
    titre: string
    lieu: string | null
    client: {
      raisonSociale: string
      logoUrl: string | null
    } | null
  }
  candidature: {
    uid: string
    statut: string
    scoreMatch: number | null
  }
}

interface EntretiensData {
  entretiens: Entretien[]
  stats: {
    total: number
    enAttente: number
    confirmes: number
    passes: number
    annules: number
  }
  grouped: {
    enAttente: Entretien[]
    confirmes: Entretien[]
    passes: Entretien[]
    annules: Entretien[]
  }
}

export default function TalentEntretiensPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<EntretiensData | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showAlternativeModal, setShowAlternativeModal] = useState<string | null>(null)
  const [alternativeDate, setAlternativeDate] = useState('')
  const [alternativeTime, setAlternativeTime] = useState('')
  const [alternativeMessage, setAlternativeMessage] = useState('')

  useEffect(() => {
    fetchEntretiens()
  }, [])

  const fetchEntretiens = async () => {
    try {
      const authRes = await fetch('/api/auth/me')
      if (!authRes.ok) {
        router.push('/t/connexion')
        return
      }
      const authData = await authRes.json()
      if (authData.user.role !== 'TALENT') {
        router.push('/t/connexion')
        return
      }

      const res = await fetch('/api/talent/entretiens')
      if (res.ok) {
        const entretiens = await res.json()
        setData(entretiens)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (uid: string, action: string, extraData?: object) => {
    setActionLoading(uid)
    try {
      const res = await fetch(`/api/talent/entretiens/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })

      if (res.ok) {
        fetchEntretiens()
        setShowAlternativeModal(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "EEEE d MMMM yyyy", { locale: fr })
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      EN_ATTENTE_CONFIRMATION: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="w-3 h-3" /> },
      CONFIRME: { label: 'Confirmé', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      DATE_ALTERNATIVE_PROPOSEE: { label: 'Date proposée', className: 'bg-blue-100 text-blue-800', icon: <CalendarClock className="w-3 h-3" /> },
      REALISE: { label: 'Réalisé', className: 'bg-gray-100 text-gray-800', icon: <Check className="w-3 h-3" /> },
      ANNULE: { label: 'Annulé', className: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" /> },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-100 text-gray-800', icon: null }
    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
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
                <User className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-300 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-300 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/matchs" className="text-gray-300 hover:text-primary">
                  Mes Matchs
                </Link>
                <Link href="/t/candidatures" className="text-gray-300 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/entretiens" className="text-primary font-medium">
                  Entretiens
                </Link>
                <Link href="/t/alertes" className="text-gray-300 hover:text-primary">
                  Alertes
                </Link>
                <Link href="/t/profil" className="text-gray-300 hover:text-primary">
                  Mon profil
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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-7 h-7" />
            Mes entretiens
          </h1>
          <p className="text-gray-300 mt-1">
            Gérez vos demandes d'entretiens
          </p>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-yellow-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{data.stats.enAttente}</p>
                  <p className="text-sm text-gray-300">En attente</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="p-4 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{data.stats.confirmes}</p>
                  <p className="text-sm text-gray-300">Confirmés</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="p-4 flex items-center gap-3">
                <Check className="w-8 h-8 text-gray-300" />
                <div>
                  <p className="text-2xl font-bold text-white">{data.stats.passes}</p>
                  <p className="text-sm text-gray-300">Réalisés</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="p-4 flex items-center gap-3">
                <XCircle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-white">{data.stats.annules}</p>
                  <p className="text-sm text-gray-300">Annulés</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* En attente de réponse */}
        {data?.grouped.enAttente && data.grouped.enAttente.length > 0 && (
          <Card className="mb-6 bg-gray-600 border-gray-500">
            <CardHeader className="bg-gray-600">
              <CardTitle className="text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                En attente de votre réponse ({data.grouped.enAttente.length})
              </CardTitle>
              <CardDescription className="text-gray-300">
                Ces entretiens nécessitent votre confirmation
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-500">
                {data.grouped.enAttente.map((entretien) => (
                  <div key={entretien.uid} className="p-4 hover:bg-gray-500">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-white">{entretien.offre.titre}</h3>
                          {getStatutBadge(entretien.statut)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {entretien.offre.client?.raisonSociale || 'TRINEXTA'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(entretien.dateProposee)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {entretien.heureDebut}{entretien.heureFin && ` - ${entretien.heureFin}`}
                          </span>
                          {entretien.typeVisio && (
                            <span className="flex items-center gap-1">
                              <Video className="w-4 h-4" />
                              {entretien.typeVisio}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleAction(entretien.uid, 'confirm')}
                          disabled={actionLoading === entretien.uid}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Confirmer
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAlternativeModal(entretien.uid)}
                          disabled={actionLoading === entretien.uid}
                        >
                          <CalendarClock className="w-4 h-4 mr-1" />
                          Autre date
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(entretien.uid, 'decline')}
                          disabled={actionLoading === entretien.uid}
                          className="text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entretiens confirmés */}
        {data?.grouped.confirmes && data.grouped.confirmes.length > 0 && (
          <Card className="mb-6 bg-gray-600 border-gray-500">
            <CardHeader className="bg-gray-600">
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Entretiens confirmés ({data.grouped.confirmes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-500">
                {data.grouped.confirmes.map((entretien) => (
                  <div key={entretien.uid} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-white">{entretien.offre.titre}</h3>
                          {getStatutBadge(entretien.statut)}
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {entretien.offre.client?.raisonSociale || 'TRINEXTA'}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-green-700">
                            <Calendar className="w-4 h-4" />
                            {formatDate(entretien.dateProposee)}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-green-700">
                            <Clock className="w-4 h-4" />
                            {entretien.heureDebut}{entretien.heureFin && ` - ${entretien.heureFin}`}
                          </span>
                        </div>
                        {entretien.lienVisio && (
                          <a
                            href={entretien.lienVisio}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            <Video className="w-4 h-4" />
                            Rejoindre la visio
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Entretiens passés */}
        {data?.grouped.passes && data.grouped.passes.length > 0 && (
          <Card className="mb-6 bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Check className="w-5 h-5" />
                Entretiens réalisés ({data.grouped.passes.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-500">
                {data.grouped.passes.map((entretien) => (
                  <div key={entretien.uid} className="p-4 opacity-70">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-gray-300">{entretien.offre.titre}</h3>
                      {getStatutBadge(entretien.statut)}
                    </div>
                    <p className="text-sm text-gray-400">
                      {formatDate(entretien.dateProposee)} à {entretien.heureDebut}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Aucun entretien */}
        {data?.stats.total === 0 && (
          <Card className="bg-gray-600 border-gray-500">
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                Aucun entretien
              </h3>
              <p className="text-gray-300 mb-4">
                Vous n'avez pas encore d'entretiens planifiés.
                Postulez à des offres pour recevoir des demandes d'entretien.
              </p>
              <Link href="/t/offres">
                <Button>Voir les offres</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Modal date alternative */}
      {showAlternativeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md bg-gray-600 border-gray-500">
            <CardHeader>
              <CardTitle className="text-white">Proposer une autre date</CardTitle>
              <CardDescription className="text-gray-300">
                Indiquez vos disponibilités alternatives
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Date</label>
                <input
                  type="date"
                  value={alternativeDate}
                  onChange={(e) => setAlternativeDate(e.target.value)}
                  className="w-full bg-gray-500 border-gray-400 text-white rounded-lg px-3 py-2"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Heure</label>
                <input
                  type="time"
                  value={alternativeTime}
                  onChange={(e) => setAlternativeTime(e.target.value)}
                  className="w-full bg-gray-500 border-gray-400 text-white rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-white">Message (optionnel)</label>
                <textarea
                  value={alternativeMessage}
                  onChange={(e) => setAlternativeMessage(e.target.value)}
                  className="w-full bg-gray-500 border-gray-400 text-white placeholder:text-gray-300 rounded-lg px-3 py-2 h-20"
                  placeholder="Expliquez pourquoi vous proposez cette date..."
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    handleAction(showAlternativeModal, 'propose_alternative', {
                      dateAlternative: alternativeDate,
                      heureAlternative: alternativeTime,
                      message: alternativeMessage,
                    })
                  }}
                  disabled={!alternativeDate || !alternativeTime}
                >
                  Proposer
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAlternativeModal(null)
                    setAlternativeDate('')
                    setAlternativeTime('')
                    setAlternativeMessage('')
                  }}
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
