'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Users, Bell, Settings, LogOut, MessageSquare,
  Briefcase, Clock, ChevronRight, Mail, Search, MailOpen, Megaphone, ArrowLeft,
  PenSquare, Send, Loader2, HelpCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Conversation {
  uid: string
  sujet: string | null
  type: 'OFFRE' | 'DIRECT' | 'SUPPORT'
  offre: {
    uid: string
    codeUnique: string
    titre: string
    client: {
      raisonSociale: string
    } | null
  } | null
  participants: Array<{
    type: string
    talent: any | null
    client: any | null
    isAdmin: boolean
  }>
  lastMessage: {
    uid: string
    contenu: string
    createdAt: string
    isFromMe: boolean
  } | null
  unreadCount: number
  archivee: boolean
  updatedAt: string
}

interface BroadcastMessage {
  id: number
  uid: string
  sujet: string
  contenu: string
  lu: boolean
  luLe: string | null
  recuLe: string
}

export default function TalentMessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'annonces'>('annonces')
  const [broadcastUnread, setBroadcastUnread] = useState(0)
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastMessage | null>(null)

  // État pour le dialogue de nouveau message
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false)
  const [newMessageType, setNewMessageType] = useState<'DIRECT' | 'SUPPORT'>('DIRECT')
  const [newMessageSubject, setNewMessageSubject] = useState('')
  const [newMessageContent, setNewMessageContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    fetchConversations()
    fetchBroadcastMessages()
  }, [])

  // Fonction pour envoyer un nouveau message à TRINEXTA
  const handleSendNewMessage = async () => {
    if (!newMessageContent.trim()) return

    setSendingMessage(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: newMessageType,
          sujet: newMessageSubject || undefined,
          message: newMessageContent.trim(),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Fermer le dialogue et rediriger vers la conversation
        setShowNewMessageDialog(false)
        setNewMessageSubject('')
        setNewMessageContent('')
        router.push(`/t/messages/${data.conversation.uid}`)
      } else {
        const error = await res.json()
        alert(error.error || 'Erreur lors de l\'envoi du message')
      }
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors de l\'envoi du message')
    } finally {
      setSendingMessage(false)
    }
  }

  const fetchConversations = async () => {
    setLoading(true)
    try {
      const authRes = await fetch('/api/auth/me', { credentials: 'include' })
      if (authRes.status === 401) {
        router.push('/t/connexion')
        return
      }

      // Utiliser la nouvelle API conversations
      const res = await fetch('/api/talent/conversations', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        // Transformer les donnees pour le format attendu
        const transformedConversations = (data.conversations || []).map((conv: any) => ({
          uid: conv.uid,
          sujet: conv.sujet,
          type: conv.type,
          offre: conv.offre,
          participants: conv.participants.map((p: any) => ({
            type: p.isAdmin ? 'admin' : p.talentId ? 'talent' : 'client',
            talent: p.talent,
            client: null,
            isAdmin: p.isAdmin,
          })),
          lastMessage: conv.messages?.[0] ? {
            uid: conv.messages[0].uid,
            contenu: conv.messages[0].contenu,
            createdAt: conv.messages[0].createdAt,
            isFromMe: !!conv.messages[0].expediteurTalentId,
          } : null,
          unreadCount: conv.unreadCount || 0,
          archivee: conv.archivee,
          updatedAt: conv.updatedAt,
        }))
        setConversations(transformedConversations)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBroadcastMessages = async () => {
    try {
      const res = await fetch('/api/talent/messages', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setBroadcastMessages(data.messages || [])
        setBroadcastUnread(data.nonLus || 0)
      }
    } catch (error) {
      console.error('Erreur broadcast:', error)
    }
  }

  const markBroadcastAsRead = async (messageUid: string) => {
    try {
      await fetch('/api/talent/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageUid }),
      })
      setBroadcastMessages(broadcastMessages.map(m =>
        m.uid === messageUid ? { ...m, lu: true, luLe: new Date().toISOString() } : m
      ))
      setBroadcastUnread(Math.max(0, broadcastUnread - 1))
    } catch (error) {
      console.error('Erreur:', error)
    }
  }

  const openBroadcast = (msg: BroadcastMessage) => {
    setSelectedBroadcast(msg)
    if (!msg.lu) {
      markBroadcastAsRead(msg.uid)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    } else if (days === 1) {
      return 'Hier'
    } else if (days < 7) {
      return date.toLocaleDateString('fr-FR', { weekday: 'long' })
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      conv.sujet?.toLowerCase().includes(searchLower) ||
      conv.offre?.titre.toLowerCase().includes(searchLower) ||
      conv.lastMessage?.contenu.toLowerCase().includes(searchLower)
    )
  })

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
                <Users className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-primary">
                  Offres
                </Link>
                <Link href="/t/matchs" className="text-gray-600 hover:text-primary">
                  Mes Matchs
                </Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">
                  Candidatures
                </Link>
                <Link href="/t/messages" className="text-primary font-medium">
                  Messages
                </Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">
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
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">
            Annonces TRINEXTA et echanges avec les clients
          </p>
        </div>

        {/* Tabs et bouton nouveau message */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'annonces' ? 'default' : 'outline'}
              onClick={() => { setActiveTab('annonces'); setSelectedBroadcast(null); }}
              className="flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" />
              Annonces TRINEXTA
              {broadcastUnread > 0 && (
                <Badge className="bg-red-500 text-white ml-1">{broadcastUnread}</Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'conversations' ? 'default' : 'outline'}
              onClick={() => setActiveTab('conversations')}
              className="flex items-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Conversations
            </Button>
          </div>

          {/* Bouton Contacter TRINEXTA */}
          <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90">
                <PenSquare className="w-4 h-4 mr-2" />
                Contacter TRINEXTA
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Nouveau message</DialogTitle>
                <DialogDescription>
                  Envoyez un message directement à l'équipe TRINEXTA. Nous vous répondrons dans les meilleurs délais.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Type de message */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newMessageType === 'DIRECT' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewMessageType('DIRECT')}
                    className="flex-1"
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Question générale
                  </Button>
                  <Button
                    type="button"
                    variant={newMessageType === 'SUPPORT' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setNewMessageType('SUPPORT')}
                    className="flex-1"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    Demande de support
                  </Button>
                </div>

                {/* Sujet (optionnel) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sujet (optionnel)
                  </label>
                  <Input
                    placeholder="Ex: Question sur ma candidature"
                    value={newMessageSubject}
                    onChange={(e) => setNewMessageSubject(e.target.value)}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Votre message <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    placeholder="Écrivez votre message ici..."
                    rows={5}
                    value={newMessageContent}
                    onChange={(e) => setNewMessageContent(e.target.value)}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowNewMessageDialog(false)}
                  disabled={sendingMessage}
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSendNewMessage}
                  disabled={!newMessageContent.trim() || sendingMessage}
                >
                  {sendingMessage ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Annonces TRINEXTA */}
        {activeTab === 'annonces' && (
          selectedBroadcast ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-xl font-semibold">{selectedBroadcast.sujet}</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Recu le {new Date(selectedBroadcast.recuLe).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedBroadcast(null)}>
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Retour
                  </Button>
                </div>
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-lg">
                  {selectedBroadcast.contenu}
                </div>
              </CardContent>
            </Card>
          ) : broadcastMessages.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Megaphone className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune annonce</h3>
                <p className="text-gray-500">Les annonces de TRINEXTA apparaitront ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {broadcastMessages.map((msg) => (
                <Card
                  key={msg.uid}
                  className={`cursor-pointer hover:shadow-md transition ${
                    !msg.lu ? 'bg-primary/5 border-primary/20' : ''
                  }`}
                  onClick={() => openBroadcast(msg)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {msg.lu ? (
                          <MailOpen className="w-5 h-5 text-gray-400" />
                        ) : (
                          <Mail className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h3 className={`font-medium ${!msg.lu ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                            {msg.sujet}
                          </h3>
                          <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                            {new Date(msg.recuLe).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short'
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {msg.contenu}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        )}

        {/* Recherche conversations */}
        {activeTab === 'conversations' && (
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Rechercher dans les conversations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Liste des conversations */}
        {activeTab === 'conversations' && (
          loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {search ? 'Aucun resultat' : 'Aucune conversation'}
              </h3>
              <p className="text-gray-500">
                {search
                  ? 'Essayez une autre recherche'
                  : 'Vos echanges avec TRINEXTA apparaitront ici'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conv) => (
              <Link key={conv.uid} href={`/t/messages/${conv.uid}`}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer ${conv.unreadCount > 0 ? 'bg-blue-50/50 border-blue-200' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Avatar / Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        conv.type === 'DIRECT' ? 'bg-red-100' :
                        conv.type === 'SUPPORT' ? 'bg-yellow-100' : 'bg-primary/10'
                      }`}>
                        {conv.type === 'DIRECT' ? (
                          <MessageSquare className="w-6 h-6 text-red-600" />
                        ) : conv.type === 'SUPPORT' ? (
                          <Mail className="w-6 h-6 text-yellow-600" />
                        ) : (
                          <Briefcase className="w-6 h-6 text-primary" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className={`font-semibold text-gray-900 truncate ${conv.unreadCount > 0 ? 'font-bold' : ''}`}>
                              {conv.type === 'DIRECT' ? (conv.sujet || 'Message de TRINEXTA') :
                               conv.type === 'SUPPORT' ? (conv.sujet || 'Demande de support') :
                               conv.offre?.titre || conv.sujet || 'Conversation'}
                            </h3>
                            {conv.type === 'DIRECT' && (
                              <p className="text-sm text-red-600 truncate">
                                Message direct de TRINEXTA
                              </p>
                            )}
                            {conv.type === 'SUPPORT' && (
                              <p className="text-sm text-yellow-600 truncate">
                                Question / Support
                              </p>
                            )}
                            {conv.offre?.client && conv.type === 'OFFRE' && (
                              <p className="text-sm text-gray-500 truncate">
                                {conv.offre.client.raisonSociale}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {conv.unreadCount > 0 && (
                              <Badge className="bg-primary text-white text-xs">
                                {conv.unreadCount}
                              </Badge>
                            )}
                            <span className="text-xs text-gray-400">
                              {conv.lastMessage ? formatDate(conv.lastMessage.createdAt) : ''}
                            </span>
                          </div>
                        </div>

                        {conv.lastMessage && (
                          <p className={`text-sm mt-1 truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                            {conv.lastMessage.isFromMe && <span className="text-gray-400">Vous: </span>}
                            {conv.lastMessage.contenu}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          {conv.offre?.codeUnique && (
                            <Badge variant="outline" className="text-xs">
                              {conv.offre.codeUnique}
                            </Badge>
                          )}
                          {conv.type === 'DIRECT' && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              Message direct
                            </Badge>
                          )}
                          {conv.participants.some(p => p.isAdmin) && conv.type !== 'DIRECT' && (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              TRINEXTA
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )
        )}
      </main>
    </div>
  )
}
