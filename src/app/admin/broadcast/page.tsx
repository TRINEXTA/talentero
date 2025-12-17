'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import {
  MessageSquare, Send, ChevronLeft, Users, Mail, Loader2, Check, Filter
} from 'lucide-react'

interface BroadcastMessage {
  id: number
  uid: string
  sujet: string
  contenu: string
  totalEnvoye: number
  totalLu: number
  createdAt: string
  expediteur?: {
    email: string
  }
  _count: {
    destinataires: number
  }
}

export default function AdminBroadcastPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [messages, setMessages] = useState<BroadcastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  // Nouveau message
  const [sujet, setSujet] = useState('')
  const [contenu, setContenu] = useState('')

  // Filtres pour les destinataires
  const [filterEmailVerifie, setFilterEmailVerifie] = useState<string>('')
  const [filterStatut, setFilterStatut] = useState<string>('')
  const [filterJamaisConnecte, setFilterJamaisConnecte] = useState(false)
  const [filterImporte, setFilterImporte] = useState(false)

  // Prévisualisation
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/admin/broadcast')
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const previewDestinataires = async () => {
    setLoadingPreview(true)
    try {
      const filters: Record<string, unknown> = {}
      if (filterEmailVerifie === 'true') filters.emailVerifie = true
      if (filterEmailVerifie === 'false') filters.emailVerifie = false
      if (filterStatut) filters.statut = filterStatut
      if (filterJamaisConnecte) filters.jamaisConnecte = true
      if (filterImporte) filters.importeParAdmin = true

      const params = new URLSearchParams()
      if (filterEmailVerifie) params.set('emailVerifie', filterEmailVerifie)
      if (filterStatut) params.set('statut', filterStatut)
      if (filterJamaisConnecte) params.set('emailVerifie', 'jamaisConnecte')
      if (filterImporte) params.set('importeParAdmin', 'true')

      const res = await fetch(`/api/admin/talents?${params.toString()}&limit=1`)
      if (res.ok) {
        const data = await res.json()
        setPreviewCount(data.pagination.total)
      }
    } catch (error) {
      console.error('Erreur preview:', error)
    } finally {
      setLoadingPreview(false)
    }
  }

  const sendBroadcast = async () => {
    if (!sujet.trim() || !contenu.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir le sujet et le contenu",
        variant: "destructive",
      })
      return
    }

    if (previewCount === 0) {
      toast({
        title: "Erreur",
        description: "Aucun destinataire correspondant aux filtres",
        variant: "destructive",
      })
      return
    }

    if (!confirm(`Envoyer ce message à ${previewCount} talent(s) ?`)) {
      return
    }

    setSending(true)
    try {
      const filters: Record<string, unknown> = {}
      if (filterEmailVerifie === 'true') filters.emailVerifie = true
      if (filterEmailVerifie === 'false') filters.emailVerifie = false
      if (filterStatut) filters.statut = filterStatut
      if (filterJamaisConnecte) filters.jamaisConnecte = true
      if (filterImporte) filters.importeParAdmin = true

      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sujet,
          contenu,
          filters,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast({
        title: "Message envoyé",
        description: `Message envoyé à ${data.totalEnvoye} talent(s)`,
      })

      // Reset form
      setSujet('')
      setContenu('')
      setPreviewCount(null)

      // Refresh messages
      fetchMessages()
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'envoyer le message",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-6 h-6 text-primary" />
                <h1 className="text-xl font-semibold text-gray-900">Messagerie Broadcast</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Nouveau message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Nouveau message
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filtres destinataires */}
              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="w-4 h-4" />
                  Filtrer les destinataires
                </Label>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500">Statut email</Label>
                    <select
                      value={filterEmailVerifie}
                      onChange={(e) => {
                        setFilterEmailVerifie(e.target.value)
                        setPreviewCount(null)
                      }}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Tous</option>
                      <option value="true">Email vérifié</option>
                      <option value="false">Email non vérifié</option>
                    </select>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-500">Statut talent</Label>
                    <select
                      value={filterStatut}
                      onChange={(e) => {
                        setFilterStatut(e.target.value)
                        setPreviewCount(null)
                      }}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm"
                    >
                      <option value="">Tous</option>
                      <option value="ACTIF">Actif</option>
                      <option value="INACTIF">Inactif</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filterJamaisConnecte}
                      onChange={(e) => {
                        setFilterJamaisConnecte(e.target.checked)
                        setPreviewCount(null)
                      }}
                      className="rounded"
                    />
                    Jamais connecté
                  </label>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filterImporte}
                      onChange={(e) => {
                        setFilterImporte(e.target.checked)
                        setPreviewCount(null)
                      }}
                      className="rounded"
                    />
                    Importé par admin
                  </label>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={previewDestinataires}
                  disabled={loadingPreview}
                  className="w-full"
                >
                  {loadingPreview ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4 mr-2" />
                  )}
                  Voir le nombre de destinataires
                </Button>

                {previewCount !== null && (
                  <div className="text-center p-2 bg-primary/10 rounded-lg">
                    <span className="text-lg font-bold text-primary">{previewCount}</span>
                    <span className="text-sm text-gray-600"> talent(s) correspondant(s)</span>
                  </div>
                )}
              </div>

              {/* Contenu du message */}
              <div>
                <Label>Sujet</Label>
                <Input
                  value={sujet}
                  onChange={(e) => setSujet(e.target.value)}
                  placeholder="Ex: Completez votre profil pour plus d'opportunites"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Message</Label>
                <Textarea
                  value={contenu}
                  onChange={(e) => setContenu(e.target.value)}
                  placeholder="Bonjour,&#10;&#10;Nous avons remarque que votre profil n'est pas complet..."
                  rows={8}
                  className="mt-1"
                />
              </div>

              <Button
                onClick={sendBroadcast}
                disabled={sending || !sujet || !contenu}
                className="w-full"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Envoyer le message
              </Button>
            </CardContent>
          </Card>

          {/* Historique des messages */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Messages envoyés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Aucun message envoyé
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.uid} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{msg.sujet}</h4>
                        <Badge variant="outline" className="text-xs">
                          {msg._count.destinataires} dest.
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {msg.contenu}
                      </p>
                      <div className="flex justify-between items-center text-xs text-gray-400">
                        <span>{new Date(msg.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                        <span className="flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          {msg.totalLu}/{msg.totalEnvoye} lu(s)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
