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
  Building2, FileText, Download, Eye, Calendar, CreditCard,
  AlertCircle, Settings, LogOut, CheckCircle, Clock, XCircle,
  Euro, TrendingUp, Receipt
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface LigneFacture {
  id: number
  description: string
  quantite: number
  prixUnitaireHT: number
  montantHT: number
}

interface Facture {
  uid: string
  numero: string
  description: string
  montantHT: number
  tauxTVA: number
  montantTVA: number
  montantTTC: number
  statut: string
  dateEmission: string | null
  dateEcheance: string | null
  datePaiement: string | null
  modePaiement: string | null
  lignes: LigneFacture[]
  createdAt: string
}

interface FacturationStats {
  totalFactures: number
  totalHT: number
  totalTTC: number
  enAttente: number
  payees: number
  enRetard: number
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  EMISE: { label: 'Émise', color: 'bg-blue-100 text-blue-800', icon: FileText },
  ENVOYEE: { label: 'Envoyée', color: 'bg-purple-100 text-purple-800', icon: FileText },
  EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PAYEE: { label: 'Payée', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EN_RETARD: { label: 'En retard', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  ANNULEE: { label: 'Annulée', color: 'bg-gray-100 text-gray-800', icon: XCircle },
}

export default function ClientFacturesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [factures, setFactures] = useState<Facture[]>([])
  const [stats, setStats] = useState<FacturationStats | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [selectedFacture, setSelectedFacture] = useState<Facture | null>(null)

  useEffect(() => {
    fetchFactures()
  }, [])

  const fetchFactures = async () => {
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

      const res = await fetch('/api/client/factures')
      if (res.ok) {
        const data = await res.json()
        setFactures(data.factures)
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredFactures = factures.filter(f => {
    if (filter === 'all') return true
    return f.statut === filter
  })

  const isOverdue = (facture: Facture) => {
    if (facture.statut === 'PAYEE' || facture.statut === 'ANNULEE') return false
    if (!facture.dateEcheance) return false
    return new Date(facture.dateEcheance) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/c/dashboard" className="text-gray-300 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/c/offres" className="text-gray-300 hover:text-primary">
                  Offres
                </Link>
                <Link href="/c/shortlists" className="text-gray-300 hover:text-primary">
                  Shortlists
                </Link>
                <Link href="/c/entretiens" className="text-gray-300 hover:text-primary">
                  Entretiens
                </Link>
                <Link href="/c/reviews" className="text-gray-300 hover:text-primary">
                  Avis
                </Link>
                <Link href="/c/factures" className="text-primary font-medium">
                  Factures
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <Link href="/c/messages">
                <Button variant="ghost" size="sm">Messages</Button>
              </Link>
              <Link href="/c/profil">
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST' })
                  router.push('/c/connexion')
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
            <h1 className="text-2xl font-bold text-white">Mes factures</h1>
            <p className="text-gray-300">Consultez vos factures et suivez vos paiements</p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalFactures}</p>
                    <p className="text-sm text-gray-300">Factures totales</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Euro className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.totalTTC.toLocaleString('fr-FR')} €</p>
                    <p className="text-sm text-gray-300">Total TTC</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.enAttente}</p>
                    <p className="text-sm text-gray-300">En attente</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-600 border-gray-500">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{stats.enRetard}</p>
                    <p className="text-sm text-gray-300">En retard</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'EN_ATTENTE', label: 'En attente' },
            { value: 'PAYEE', label: 'Payées' },
            { value: 'EN_RETARD', label: 'En retard' },
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
          {/* Invoices List */}
          <div className="lg:col-span-2 space-y-4">
            {filteredFactures.length === 0 ? (
              <Card className="bg-gray-600 border-gray-500">
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-300">Aucune facture trouvée</p>
                </CardContent>
              </Card>
            ) : (
              filteredFactures.map(facture => {
                const config = statutConfig[facture.statut] || statutConfig.EN_ATTENTE
                const StatusIcon = config.icon
                const overdue = isOverdue(facture)

                return (
                  <Card
                    key={facture.uid}
                    className={`bg-gray-600 border-gray-500 cursor-pointer transition-all hover:shadow-md ${
                      selectedFacture?.uid === facture.uid ? 'ring-2 ring-primary' : ''
                    } ${overdue ? 'border-red-300' : ''}`}
                    onClick={() => setSelectedFacture(facture)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg text-white">{facture.numero}</h3>
                            <Badge className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                            {overdue && (
                              <Badge className="bg-red-100 text-red-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                En retard
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-300 mb-2">{facture.description}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-300">
                            {facture.dateEmission && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Émise le {format(new Date(facture.dateEmission), 'd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                            {facture.dateEcheance && (
                              <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                                <Clock className="h-4 w-4" />
                                Échéance: {format(new Date(facture.dateEcheance), 'd MMM yyyy', { locale: fr })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-white">
                            {facture.montantTTC.toLocaleString('fr-FR')} €
                          </p>
                          <p className="text-sm text-gray-300">TTC</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Invoice Detail */}
          <div className="lg:col-span-1">
            {selectedFacture ? (
              <Card className="bg-gray-600 border-gray-500 sticky top-24">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedFacture.numero}
                  </CardTitle>
                  <CardDescription>{selectedFacture.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status */}
                  <div>
                    {(() => {
                      const config = statutConfig[selectedFacture.statut] || statutConfig.EN_ATTENTE
                      return (
                        <Badge className={`${config.color} text-sm`}>
                          {config.label}
                        </Badge>
                      )
                    })()}
                    {selectedFacture.datePaiement && (
                      <p className="text-sm text-gray-300 mt-2">
                        Payée le {format(new Date(selectedFacture.datePaiement), 'd MMMM yyyy', { locale: fr })}
                        {selectedFacture.modePaiement && ` par ${selectedFacture.modePaiement.toLowerCase().replace('_', ' ')}`}
                      </p>
                    )}
                  </div>

                  {/* Dates */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-300">Dates</h4>
                    {selectedFacture.dateEmission && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Émise le</span>
                        <span className="text-white">{format(new Date(selectedFacture.dateEmission), 'd MMM yyyy', { locale: fr })}</span>
                      </div>
                    )}
                    {selectedFacture.dateEcheance && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Échéance</span>
                        <span className={isOverdue(selectedFacture) ? 'text-red-400 font-medium' : 'text-white'}>
                          {format(new Date(selectedFacture.dateEcheance), 'd MMM yyyy', { locale: fr })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Lines */}
                  {selectedFacture.lignes.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-300">Détail</h4>
                      <div className="space-y-2">
                        {selectedFacture.lignes.map(ligne => (
                          <div key={ligne.id} className="text-sm p-2 bg-gray-500 rounded">
                            <div className="flex justify-between">
                              <span className="text-white">{ligne.description}</span>
                              <span className="font-medium text-white">{ligne.montantHT.toLocaleString('fr-FR')} €</span>
                            </div>
                            <p className="text-xs text-gray-300">
                              {ligne.quantite} x {ligne.prixUnitaireHT.toLocaleString('fr-FR')} € HT
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t border-gray-500 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Total HT</span>
                      <span className="text-white">{selectedFacture.montantHT.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">TVA ({selectedFacture.tauxTVA}%)</span>
                      <span className="text-white">{selectedFacture.montantTVA.toLocaleString('fr-FR')} €</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-500">
                      <span className="text-white">Total TTC</span>
                      <span className="text-white">{selectedFacture.montantTTC.toLocaleString('fr-FR')} €</span>
                    </div>
                  </div>

                  {/* Actions */}
                  {selectedFacture.statut !== 'PAYEE' && selectedFacture.statut !== 'ANNULEE' && (
                    <div className="pt-4 border-t border-gray-500">
                      <p className="text-sm text-gray-300 mb-3">
                        Pour procéder au paiement, veuillez contacter notre équipe ou utiliser les coordonnées bancaires indiquées sur la facture.
                      </p>
                      <Button variant="outline" className="w-full">
                        <CreditCard className="h-4 w-4 mr-2" />
                        Informations de paiement
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-600 border-gray-500">
                <CardContent className="py-12 text-center">
                  <Eye className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-300">Sélectionnez une facture pour voir les détails</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
