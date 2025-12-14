'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Building2, Bell, Settings, LogOut, Save,
  MapPin, Phone, Mail, Globe, Users, FileText,
  CheckCircle, AlertCircle, Upload, Trash2
} from 'lucide-react'

interface ClientProfile {
  uid: string
  codeUnique: string
  raisonSociale: string
  siret: string | null
  siren: string | null
  formeJuridique: string | null
  secteurActivite: string | null
  tailleEntreprise: string | null
  adresse: string | null
  codePostal: string | null
  ville: string | null
  pays: string
  telephone: string | null
  siteWeb: string | null
  logoUrl: string | null
  description: string | null
  statut: string
  typeClient: string
  valideParAdmin: boolean
  contacts: Contact[]
}

interface Contact {
  id: number
  uid: string
  prenom: string
  nom: string
  email: string
  telephone: string | null
  fonction: string | null
  estContactPrincipal: boolean
}

interface UserData {
  user: {
    uid: string
    email: string
    role: string
    details: ClientProfile | null
  }
}

export default function ClientProfilPage() {
  const router = useRouter()
  const [data, setData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState({
    raisonSociale: '',
    siret: '',
    formeJuridique: '',
    secteurActivite: '',
    tailleEntreprise: '',
    adresse: '',
    codePostal: '',
    ville: '',
    siteWeb: '',
    description: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (!res.ok) {
        router.push('/c/connexion')
        return
      }
      const userData = await res.json()

      if (userData.user.role !== 'CLIENT' && userData.user.role !== 'ADMIN') {
        router.push('/c/connexion')
        return
      }

      setData(userData)

      if (userData.user.details) {
        const d = userData.user.details
        setFormData({
          raisonSociale: d.raisonSociale || '',
          siret: d.siret || '',
          formeJuridique: d.formeJuridique || '',
          secteurActivite: d.secteurActivite || '',
          tailleEntreprise: d.tailleEntreprise || '',
          adresse: d.adresse || '',
          codePostal: d.codePostal || '',
          ville: d.ville || '',
          siteWeb: d.siteWeb || '',
          description: d.description || '',
        })
      }
    } catch (error) {
      console.error('Erreur:', error)
      router.push('/c/connexion')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/client/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Profil mis a jour avec succes' })
        fetchProfile()
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Erreur lors de la mise a jour' })
      }
    } catch (error) {
      console.error('Erreur:', error)
      setMessage({ type: 'error', text: 'Erreur de connexion' })
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const getStatutBadge = (statut: string, valide: boolean) => {
    if (valide) {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verifie
        </Badge>
      )
    }
    if (statut === 'EN_ATTENTE') {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          En attente de validation
        </Badge>
      )
    }
    return <Badge className="bg-gray-100 text-gray-800">{statut}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!data) return null

  const { user } = data
  const profile = user.details
  const contactPrincipal = profile?.contacts?.find(c => c.estContactPrincipal)

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
                <Link href="/c/profil" className="text-primary font-medium">
                  Mon profil
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
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

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profil entreprise</h1>
          <p className="text-gray-600 mt-1">
            Gerez les informations de votre entreprise
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Statut */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Statut du compte</CardTitle>
                  <CardDescription>Code client: {profile?.codeUnique}</CardDescription>
                </div>
                {profile && getStatutBadge(profile.statut, profile.valideParAdmin)}
              </div>
            </CardHeader>
            {!profile?.valideParAdmin && (
              <CardContent>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Votre compte est en attente de validation par l'equipe TRINEXTA.
                    Vous recevrez un email une fois votre compte valide.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Informations entreprise */}
          <Card>
            <CardHeader>
              <CardTitle>Informations entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="raisonSociale">Raison sociale *</Label>
                  <Input
                    id="raisonSociale"
                    value={formData.raisonSociale}
                    onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={formData.siret}
                    onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                    maxLength={14}
                    disabled
                  />
                  <p className="text-xs text-gray-500">Le SIRET ne peut etre modifie</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="formeJuridique">Forme juridique</Label>
                  <select
                    id="formeJuridique"
                    value={formData.formeJuridique}
                    onChange={(e) => setFormData({ ...formData, formeJuridique: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  >
                    <option value="">Selectionnez</option>
                    <option value="SAS">SAS</option>
                    <option value="SARL">SARL</option>
                    <option value="SA">SA</option>
                    <option value="EURL">EURL</option>
                    <option value="SNC">SNC</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secteurActivite">Secteur d'activite</Label>
                  <Input
                    id="secteurActivite"
                    value={formData.secteurActivite}
                    onChange={(e) => setFormData({ ...formData, secteurActivite: e.target.value })}
                    placeholder="ex: Services informatiques"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tailleEntreprise">Taille de l'entreprise</Label>
                <select
                  id="tailleEntreprise"
                  value={formData.tailleEntreprise}
                  onChange={(e) => setFormData({ ...formData, tailleEntreprise: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                >
                  <option value="">Selectionnez</option>
                  <option value="1-10">1-10 employes</option>
                  <option value="11-50">11-50 employes</option>
                  <option value="51-200">51-200 employes</option>
                  <option value="201-500">201-500 employes</option>
                  <option value="500+">Plus de 500 employes</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description de l'entreprise</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background resize-none"
                  placeholder="Presentez votre entreprise en quelques lignes..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Coordonnees */}
          <Card>
            <CardHeader>
              <CardTitle>Coordonnees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="adresse">Adresse</Label>
                <Input
                  id="adresse"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codePostal">Code postal</Label>
                  <Input
                    id="codePostal"
                    value={formData.codePostal}
                    onChange={(e) => setFormData({ ...formData, codePostal: e.target.value })}
                    maxLength={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ville">Ville</Label>
                  <Input
                    id="ville"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteWeb">Site web</Label>
                <Input
                  id="siteWeb"
                  type="url"
                  value={formData.siteWeb}
                  onChange={(e) => setFormData({ ...formData, siteWeb: e.target.value })}
                  placeholder="https://"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact principal */}
          <Card>
            <CardHeader>
              <CardTitle>Contact principal</CardTitle>
              <CardDescription>
                Responsable du compte entreprise
              </CardDescription>
            </CardHeader>
            <CardContent>
              {contactPrincipal ? (
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {contactPrincipal.prenom} {contactPrincipal.nom}
                    </p>
                    <p className="text-sm text-gray-500">{contactPrincipal.fonction || 'Contact principal'}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {contactPrincipal.email}
                      </span>
                      {contactPrincipal.telephone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contactPrincipal.telephone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Aucun contact principal defini</p>
              )}
            </CardContent>
          </Card>

          {/* Bouton de sauvegarde */}
          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={saving} size="lg">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  )
}
