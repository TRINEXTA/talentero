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
  Building2, Calendar, Clock, Video, User, Check, X,
  AlertCircle, Settings, LogOut, CalendarClock, CheckCircle, XCircle,
  RefreshCw, Phone, Mail
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
  }
  talent: {
    uid: string
    prenom: string
    nom: string
    titrePoste: string | null
    photoUrl: string | null
  }
  candidature: {
    id: number
    statut: string
  }
}

export default function ClientEntretiensPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [entretiens, setEntretiens] = useState<Entretien[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    fetchEntretiens()
  }, [])

  const fetchEntretiens = async () => {
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

      const res = await fetch('/api/client/entretiens')
      if (res.ok) {
        const data = await res.json()
        setEntretiens(data.entretiens)
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
      const res = await fetch(`/api/client/entretiens/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extraData }),
      })

      if (res.ok) {
        fetchEntretiens()
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
      EN_ATTENTE_CONFIRMATION: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      CONFIRME: { label: 'Confirmé', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      DATE_ALTERNATIVE_PROPOSEE: { label: 'Nouvelle date proposée', className: 'bg-blue-100 text-blue-800', icon: <CalendarClock className="w-3 h-3" /> },
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

  const filteredEntretiens = entretiens.filter((e) => {
    if (filter === 'all') return true
    return e.statut === filter
  })

  const stats = {
    total: entretiens.length,
    enAttente: entretiens.filter((e) => e.statut === 'EN_ATTENTE_CONFIRMATION').length,
    alternatif: entretiens.filter((e) => e.statut === 'DATE_ALTERNATIVE_PROPOSEE').length,
    confirmes: entretiens.filter((e) => e.statut === 'CONFIRME').length,
    realises: entretiens.filter((e) => e.statut === 'REALISE').length,
  }

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
                <Link href="/c/entretiens" className="text-primary font-medium">
                  Entretiens
                </Link>
                <Link href="/c/profil" className="text-gray-600 hover:text-primary">
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-7 h-7" />
              Entretiens
            </h1>
            <p className="text-gray-600 mt-1">
              Gérez vos entretiens avec les candidats
            </p>
          </div>
          <Button variant="outline" onClick={fetchEntretiens}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`p-4 rounded-lg border text-left transition ${filter === 'all' ? 'border-primary bg-primary/5' : 'bg-white'}`}
          >
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </button>
          <button
            onClick={() => setFilter('EN_ATTENTE_CONFIRMATION')}
            className={`p-4 rounded-lg border text-left transition ${filter === 'EN_ATTENTE_CONFIRMATION' ? 'border-yellow-500 bg-yellow-50' : 'bg-white'}`}
          >
            <p className="text-2xl font-bold text-yellow-600">{stats.enAttente}</p>
            <p className="text-sm text-gray-500">En attente</p>
          </button>
          <button
            onClick={() => setFilter('DATE_ALTERNATIVE_PROPOSEE')}
            className={`p-4 rounded-lg border text-left transition ${filter === 'DATE_ALTERNATIVE_PROPOSEE' ? 'border-blue-500 bg-blue-50' : 'bg-white'}`}
          >
            <p className="text-2xl font-bold text-blue-600">{stats.alternatif}</p>
            <p className="text-sm text-gray-500">Date proposée</p>
          </button>
          <button
            onClick={() => setFilter('CONFIRME')}
            className={`p-4 rounded-lg border text-left transition ${filter === 'CONFIRME' ? 'border-green-500 bg-green-50' : 'bg-white'}`}
          >
            <p className="text-2xl font-bold text-green-600">{stats.confirmes}</p>
            <p className="text-sm text-gray-500">Confirmés</p>
          </button>
          <button
            onClick={() => setFilter('REALISE')}
            className={`p-4 rounded-lg border text-left transition ${filter === 'REALISE' ? 'border-gray-500 bg-gray-50' : 'bg-white'}`}
          >
            <p className="text-2xl font-bold text-gray-600">{stats.realises}</p>
            <p className="text-sm text-gray-500">Réalisés</p>
          </button>
        </div>

        {/* Liste des entretiens */}
        {filteredEntretiens.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Aucun entretien
              </h3>
              <p className="text-gray-500">
                {filter === 'all'
                  ? "Vous n'avez pas encore planifié d'entretiens."
                  : `Aucun entretien avec ce statut.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredEntretiens.map((entretien) => (
              <Card key={entretien.uid} className={entretien.statut === 'DATE_ALTERNATIVE_PROPOSEE' ? 'border-blue-300' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {entretien.talent.photoUrl ? (
                          <img
                            src={entretien.talent.photoUrl}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-gray-500" />
                        )}
                      </div>

                      {/* Infos */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">
                            {entretien.talent.prenom} {entretien.talent.nom}
                          </h3>
                          {getStatutBadge(entretien.statut)}
                        </div>
                        <p className="text-sm text-gray-500 mb-2">
                          {entretien.talent.titrePoste || 'Freelance'} • {entretien.offre.titre}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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

                        {/* Date alternative proposée */}
                        {entretien.statut === 'DATE_ALTERNATIVE_PROPOSEE' && entretien.dateAlternative && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800 font-medium mb-1">
                              Date alternative proposée par le candidat :
                            </p>
                            <p className="text-sm text-blue-700">
                              {formatDate(entretien.dateAlternative)} à {entretien.heureAlternative}
                            </p>
                            {entretien.notesEntretien && (
                              <p className="text-sm text-blue-600 mt-1 italic">
                                "{entretien.notesEntretien}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {entretien.statut === 'DATE_ALTERNATIVE_PROPOSEE' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAction(entretien.uid, 'accept_alternative')}
                            disabled={actionLoading === entretien.uid}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Accepter
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(entretien.uid, 'cancel')}
                            disabled={actionLoading === entretien.uid}
                            className="text-red-600 border-red-300"
                          >
                            <X className="w-4 h-4 mr-1" />
                            Refuser
                          </Button>
                        </>
                      )}

                      {entretien.statut === 'CONFIRME' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleAction(entretien.uid, 'mark_completed')}
                            disabled={actionLoading === entretien.uid}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Marquer réalisé
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(entretien.uid, 'cancel')}
                            disabled={actionLoading === entretien.uid}
                            className="text-red-600 border-red-300"
                          >
                            Annuler
                          </Button>
                        </>
                      )}

                      {entretien.statut === 'EN_ATTENTE_CONFIRMATION' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(entretien.uid, 'cancel')}
                          disabled={actionLoading === entretien.uid}
                          className="text-red-600 border-red-300"
                        >
                          Annuler
                        </Button>
                      )}
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
