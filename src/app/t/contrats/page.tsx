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
  FileText, Calendar, Euro, Building2, Settings, LogOut,
  CheckCircle, Clock, XCircle, AlertCircle, PenTool,
  Eye, FileSignature
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface Contrat {
  uid: string
  numero: string
  titre: string
  statut: string
  typeContrat: string
  dateDebut: string
  dateFin: string | null
  tjm: number
  signeParTalent: boolean
  signeParClient: boolean
  createdAt: string
  client: {
    uid: string
    raisonSociale: string
    logoUrl: string | null
  }
}

interface ContratStats {
  total: number
  brouillons: number
  enAttenteSignature: number
  actifs: number
  termines: number
  resilies: number
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EN_ATTENTE_SIGNATURE: { label: 'À signer', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  SIGNE_CLIENT: { label: 'En attente de votre signature', color: 'bg-blue-100 text-blue-800', icon: PenTool },
  SIGNE_TALENT: { label: 'En attente du client', color: 'bg-purple-100 text-purple-800', icon: PenTool },
  ACTIF: { label: 'Actif', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  SUSPENDU: { label: 'Suspendu', color: 'bg-orange-100 text-orange-800', icon: AlertCircle },
  TERMINE: { label: 'Terminé', color: 'bg-gray-100 text-gray-800', icon: CheckCircle },
  RESILIE: { label: 'Résilié', color: 'bg-red-100 text-red-800', icon: XCircle },
  ANNULE: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const typeContratLabels: Record<string, string> = {
  FREELANCE: 'Freelance',
  PORTAGE: 'Portage',
  REGIE: 'Régie',
  FORFAIT: 'Forfait',
  CDI_CHANTIER: 'CDI Chantier',
}

export default function TalentContratsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contrats, setContrats] = useState<Contrat[]>([])
  const [stats, setStats] = useState<ContratStats | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [selectedContrat, setSelectedContrat] = useState<Contrat | null>(null)
  const [signLoading, setSignLoading] = useState(false)

  useEffect(() => {
    fetchContrats()
  }, [])

  const fetchContrats = async () => {
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

      const res = await fetch('/api/talent/contrats')
      if (res.ok) {
        const data = await res.json()
        setContrats(data.contrats)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async (uid: string) => {
    if (!confirm('Êtes-vous sûr de vouloir signer ce contrat ?')) return

    setSignLoading(true)
    try {
      const res = await fetch(`/api/talent/contrats/${uid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signer' }),
      })

      if (res.ok) {
        fetchContrats()
        setSelectedContrat(null)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setSignLoading(false)
    }
  }

  const filteredContrats = contrats.filter(c => {
    if (filter === 'all') return true
    if (filter === 'a_signer') {
      return c.statut === 'EN_ATTENTE_SIGNATURE' || c.statut === 'SIGNE_CLIENT'
    }
    return c.statut === filter
  })

  const needsSignature = (contrat: Contrat) => {
    return (contrat.statut === 'EN_ATTENTE_SIGNATURE' || contrat.statut === 'SIGNE_CLIENT') && !contrat.signeParTalent
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-gray-900">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-gray-900">
                  Offres
                </Link>
                <Link href="/t/matchs" className="text-gray-600 hover:text-gray-900">
                  Mes Matchs
                </Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-gray-900">
                  Candidatures
                </Link>
                <Link href="/t/entretiens" className="text-gray-600 hover:text-gray-900">
                  Entretiens
                </Link>
                <Link href="/t/contrats" className="text-primary font-medium">
                  Contrats
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Link href="/t/profil">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/t/connexion')
                }}
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mes contrats</h1>
            <p className="text-gray-600">Consultez et signez vos contrats de mission</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileSignature className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-sm text-gray-500">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.enAttenteSignature}</p>
                    <p className="text-sm text-gray-500">À signer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.actifs}</p>
                    <p className="text-sm text-gray-500">Actifs</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.termines}</p>
                    <p className="text-sm text-gray-500">Terminés</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'Tous' },
            { value: 'a_signer', label: 'À signer' },
            { value: 'ACTIF', label: 'Actifs' },
            { value: 'TERMINE', label: 'Terminés' },
          ].map(option => (
            <Button
              key={option.value}
              variant={filter === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contracts List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredContrats.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileSignature className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Aucun contrat trouvé</p>
                </CardContent>
              </Card>
            ) : (
              filteredContrats.map(contrat => {
                const config = statutConfig[contrat.statut] || statutConfig.EN_ATTENTE_SIGNATURE
                const StatusIcon = config.icon
                const canSign = needsSignature(contrat)

                return (
                  <Card
                    key={contrat.uid}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedContrat?.uid === contrat.uid ? 'ring-2 ring-primary' : ''
                    } ${canSign ? 'border-yellow-300' : ''}`}
                    onClick={() => setSelectedContrat(contrat)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{contrat.numero}</h3>
                            <Badge className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            {canSign && (
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <PenTool className="h-3 w-3 mr-1" />
                                Action requise
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-900 mb-2">{contrat.titre}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-4 w-4" />
                              {contrat.client.raisonSociale}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(contrat.dateDebut), 'd MMM yyyy', { locale: fr })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Euro className="h-4 w-4" />
                              {contrat.tjm} €/jour
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Contract Detail */}
          <div className="lg:col-span-1">
            {selectedContrat ? (
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSignature className="h-5 w-5" />
                    {selectedContrat.numero}
                  </CardTitle>
                  <CardDescription>{selectedContrat.titre}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status */}
                  <div>
                    {(() => {
                      const config = statutConfig[selectedContrat.statut] || statutConfig.EN_ATTENTE_SIGNATURE
                      return (
                        <Badge className={`${config.color} text-sm`}>
                          {config.label}
                        </Badge>
                      )
                    })()}
                  </div>

                  {/* Client Info */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Client</h4>
                    <div className="flex items-center gap-3">
                      {selectedContrat.client.logoUrl ? (
                        <img
                          src={selectedContrat.client.logoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-gray-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{selectedContrat.client.raisonSociale}</p>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Détails</h4>
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Type</span>
                        <span>{typeContratLabels[selectedContrat.typeContrat]}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date de début</span>
                        <span>{format(new Date(selectedContrat.dateDebut), 'd MMMM yyyy', { locale: fr })}</span>
                      </div>
                      {selectedContrat.dateFin && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Date de fin</span>
                          <span>{format(new Date(selectedContrat.dateFin), 'd MMMM yyyy', { locale: fr })}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">TJM</span>
                        <span className="font-medium">{selectedContrat.tjm} €</span>
                      </div>
                    </div>
                  </div>

                  {/* Signatures */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700">Signatures</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Votre signature</span>
                        {selectedContrat.signeParTalent ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Signé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            En attente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Client</span>
                        {selectedContrat.signeParClient ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Signé
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">
                            En attente
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sign Button */}
                  {needsSignature(selectedContrat) && (
                    <div className="pt-4 border-t">
                      <Button
                        className="w-full"
                        onClick={() => handleSign(selectedContrat.uid)}
                        disabled={signLoading}
                      >
                        <PenTool className="h-4 w-4 mr-2" />
                        {signLoading ? 'Signature...' : 'Signer le contrat'}
                      </Button>
                      <p className="text-xs text-gray-500 text-center mt-2">
                        En signant, vous acceptez les termes du contrat
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Sélectionnez un contrat pour voir les détails</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
