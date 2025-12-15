'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  Shield, ArrowLeft, Save, Building2, MapPin, Mail, Phone, Globe,
  FileText, Calendar, CheckCircle, XCircle, Loader2, Briefcase, Users
} from 'lucide-react'

interface Client {
  uid: string
  codeUnique: string
  raisonSociale: string
  siret: string | null
  siren: string | null
  codeAPE: string | null
  formeJuridique: string | null
  typeClient: string
  description: string | null
  secteurActivite: string | null
  tailleEntreprise: string | null
  siteWeb: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  pays: string
  statut: string
  valideParAdmin: boolean
  valideLe: string | null
  createdAt: string
  user: {
    uid: string
    email: string
    emailVerified: boolean
    isActive: boolean
    lastLoginAt: string | null
  }
  contacts: Array<{
    id: number
    prenom: string
    nom: string
    email: string
    telephone: string | null
    poste: string | null
    estContactPrincipal: boolean
  }>
  sites: Array<{
    id: number
    nom: string
    adresse: string
    codePostal: string
    ville: string
    estSiegeSocial: boolean
  }>
  offres: Array<{
    uid: string
    titre: string
    statut: string
  }>
}

const STATUT_OPTIONS = [
  { value: 'EN_ATTENTE', label: 'En attente' },
  { value: 'ACTIF', label: 'Actif' },
  { value: 'SUSPENDU', label: 'Suspendu' },
  { value: 'ARCHIVE', label: 'Archive' },
]

const TYPE_CLIENT_OPTIONS = [
  { value: 'DIRECT', label: 'Client Direct' },
  { value: 'SOUSTRAITANCE', label: 'Sous-traitance / ESN' },
]

const TAILLE_OPTIONS = [
  { value: 'TPE', label: 'TPE (< 10 salaries)' },
  { value: 'PME', label: 'PME (10-249 salaries)' },
  { value: 'ETI', label: 'ETI (250-4999 salaries)' },
  { value: 'GRANDE', label: 'Grande entreprise (5000+)' },
]

export default function AdminClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const uid = params.uid as string

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'infos' | 'contacts' | 'offres'>('infos')

  useEffect(() => {
    if (uid) {
      fetchClient()
    }
  }, [uid])

  const fetchClient = async () => {
    try {
      const res = await fetch(`/api/admin/clients/${uid}`)
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/admin/login')
          return
        }
        throw new Error('Erreur')
      }
      const data = await res.json()
      setClient(data.client)
    } catch (error) {
      console.error('Erreur:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger le client",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!client) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/clients/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raisonSociale: client.raisonSociale,
          siret: client.siret,
          siren: client.siren,
          codeAPE: client.codeAPE,
          formeJuridique: client.formeJuridique,
          typeClient: client.typeClient,
          description: client.description,
          secteurActivite: client.secteurActivite,
          tailleEntreprise: client.tailleEntreprise,
          siteWeb: client.siteWeb,
          adresse: client.adresse,
          codePostal: client.codePostal,
          ville: client.ville,
          statut: client.statut,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Succes",
        description: "Client mis a jour",
      })
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleValidate = async () => {
    try {
      const res = await fetch(`/api/admin/clients/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate' }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Succes",
        description: "Client valide",
      })
      fetchClient()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de valider",
        variant: "destructive",
      })
    }
  }

  const handleSuspend = async () => {
    try {
      const res = await fetch(`/api/admin/clients/${uid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'suspend' }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast({
        title: "Succes",
        description: "Client suspendu",
      })
      fetchClient()
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de suspendre",
        variant: "destructive",
      })
    }
  }

  const getStatutBadge = (statut: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      EN_ATTENTE: { label: 'En attente', className: 'bg-yellow-600' },
      ACTIF: { label: 'Actif', className: 'bg-green-600' },
      SUSPENDU: { label: 'Suspendu', className: 'bg-red-600' },
      ARCHIVE: { label: 'Archive', className: 'bg-gray-600' },
    }
    const config = configs[statut] || { label: statut, className: 'bg-gray-600' }
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Client non trouve</h2>
          <Link href="/admin/clients">
            <Button>Retour aux clients</Button>
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
              <Link href="/admin/clients" className="text-gray-400 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  {client.raisonSociale}
                  {getStatutBadge(client.statut)}
                </h1>
                <p className="text-sm text-gray-400">{client.codeUnique} - {client.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {client.statut === 'EN_ATTENTE' && (
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={handleValidate}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Valider
                </Button>
              )}
              {client.statut === 'ACTIF' && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-red-600 text-red-400"
                  onClick={handleSuspend}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Suspendre
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'infos' ? 'default' : 'outline'}
            onClick={() => setActiveTab('infos')}
            className={activeTab !== 'infos' ? 'border-gray-700 text-gray-300' : ''}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Informations
          </Button>
          <Button
            variant={activeTab === 'contacts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('contacts')}
            className={activeTab !== 'contacts' ? 'border-gray-700 text-gray-300' : ''}
          >
            <Users className="w-4 h-4 mr-2" />
            Contacts ({client.contacts.length})
          </Button>
          <Button
            variant={activeTab === 'offres' ? 'default' : 'outline'}
            onClick={() => setActiveTab('offres')}
            className={activeTab !== 'offres' ? 'border-gray-700 text-gray-300' : ''}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            Offres ({client.offres.length})
          </Button>
        </div>

        {activeTab === 'infos' && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Colonne principale */}
            <div className="lg:col-span-2 space-y-6">
              {/* Infos entreprise */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5" />
                    Informations entreprise
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Raison sociale</Label>
                    <Input
                      value={client.raisonSociale}
                      onChange={(e) => setClient({ ...client, raisonSociale: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">SIRET</Label>
                      <Input
                        value={client.siret || ''}
                        onChange={(e) => setClient({ ...client, siret: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">SIREN</Label>
                      <Input
                        value={client.siren || ''}
                        onChange={(e) => setClient({ ...client, siren: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Code APE</Label>
                      <Input
                        value={client.codeAPE || ''}
                        onChange={(e) => setClient({ ...client, codeAPE: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Forme juridique</Label>
                      <Input
                        value={client.formeJuridique || ''}
                        onChange={(e) => setClient({ ...client, formeJuridique: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={client.description || ''}
                      onChange={(e) => setClient({ ...client, description: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                      rows={4}
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Secteur d'activite</Label>
                      <Input
                        value={client.secteurActivite || ''}
                        onChange={(e) => setClient({ ...client, secteurActivite: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Site web</Label>
                      <Input
                        value={client.siteWeb || ''}
                        onChange={(e) => setClient({ ...client, siteWeb: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Adresse */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Adresse
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Adresse</Label>
                    <Input
                      value={client.adresse || ''}
                      onChange={(e) => setClient({ ...client, adresse: e.target.value })}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Code postal</Label>
                      <Input
                        value={client.codePostal || ''}
                        onChange={(e) => setClient({ ...client, codePostal: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Ville</Label>
                      <Input
                        value={client.ville || ''}
                        onChange={(e) => setClient({ ...client, ville: e.target.value })}
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sites */}
              {client.sites.length > 0 && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Sites</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {client.sites.map((site) => (
                        <div key={site.id} className="p-3 bg-gray-700 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-white">{site.nom}</p>
                              <p className="text-sm text-gray-400">
                                {site.adresse}, {site.codePostal} {site.ville}
                              </p>
                            </div>
                            {site.estSiegeSocial && (
                              <Badge className="bg-blue-600">Siege</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Colonne laterale */}
            <div className="space-y-6">
              {/* Statut */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Statut</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Statut du compte</Label>
                    <Select
                      value={client.statut}
                      onValueChange={(value) => setClient({ ...client, statut: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Type de client</Label>
                    <Select
                      value={client.typeClient}
                      onValueChange={(value) => setClient({ ...client, typeClient: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TYPE_CLIENT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Taille entreprise</Label>
                    <Select
                      value={client.tailleEntreprise || ''}
                      onValueChange={(value) => setClient({ ...client, tailleEntreprise: value })}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Selectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {TAILLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Compte */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Compte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{client.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.user.emailVerified ? (
                      <Badge className="bg-green-600">Email verifie</Badge>
                    ) : (
                      <Badge className="bg-yellow-600">Email non verifie</Badge>
                    )}
                    {client.user.isActive ? (
                      <Badge className="bg-green-600">Actif</Badge>
                    ) : (
                      <Badge className="bg-red-600">Inactif</Badge>
                    )}
                  </div>
                  {client.valideLe && (
                    <div>
                      <p className="text-sm text-gray-400">Valide le</p>
                      <p className="text-white">{new Date(client.valideLe).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Stats */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Statistiques</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center p-4 bg-gray-700 rounded-lg">
                    <Briefcase className="w-6 h-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-white">{client.offres.length}</p>
                    <p className="text-sm text-gray-400">Offres</p>
                  </div>
                  <div className="mt-4 text-sm text-gray-400">
                    <p>Inscrit le {new Date(client.createdAt).toLocaleDateString('fr-FR')}</p>
                    {client.user.lastLoginAt && (
                      <p>Derniere connexion: {new Date(client.user.lastLoginAt).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div className="space-y-4">
            {client.contacts.length === 0 ? (
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Aucun contact enregistre</p>
                </CardContent>
              </Card>
            ) : (
              client.contacts.map((contact) => (
                <Card key={contact.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-white">
                          {contact.prenom} {contact.nom}
                        </h3>
                        {contact.poste && <p className="text-gray-400">{contact.poste}</p>}
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-300 flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {contact.email}
                          </p>
                          {contact.telephone && (
                            <p className="text-sm text-gray-300 flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {contact.telephone}
                            </p>
                          )}
                        </div>
                      </div>
                      {contact.estContactPrincipal && (
                        <Badge className="bg-primary">Contact principal</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {activeTab === 'offres' && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">{client.offres.length} offre(s)</p>
              <Link href={`/admin/offres?client=${client.uid}`}>
                <Button className="mt-4">Voir les offres</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
