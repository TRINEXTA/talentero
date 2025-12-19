'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Users, Bell, Settings, LogOut, MessageSquare,
  Briefcase, ChevronRight, Mail, Search, MailOpen, Megaphone, ArrowLeft,
  PenSquare, Send, Loader2, HelpCircle, X, AlertCircle
} from 'lucide-react'

// Types simplifiés
interface ConversationData {
  uid: string
  sujet: string | null
  type: string
  offre: { uid: string; titre: string } | null
  lastMessage: { contenu: string; createdAt: string; isFromMe: boolean } | null
  unreadCount: number
  updatedAt: string
}

interface BroadcastData {
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
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [broadcastMessages, setBroadcastMessages] = useState<BroadcastData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'conversations' | 'annonces'>('annonces')
  const [broadcastUnread, setBroadcastUnread] = useState(0)
  const [selectedBroadcast, setSelectedBroadcast] = useState<BroadcastData | null>(null)

  // Dialog state
  const [showDialog, setShowDialog] = useState(false)
  const [msgSubject, setMsgSubject] = useState('')
  const [msgContent, setMsgContent] = useState('')
  const [sending, setSending] = useState(false)

  // Fonction pour formater les dates de manière sécurisée
  const safeFormatDate = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
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
    } catch {
      return ''
    }
  }, [])

  const safeFormatFullDate = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return ''
    }
  }, [])

  const safeFormatShortDate = useCallback((dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    } catch {
      return ''
    }
  }, [])

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/talent/conversations', { credentials: 'include' })
      if (!res.ok) return

      const data = await res.json()
      const convs = Array.isArray(data?.conversations) ? data.conversations : []

      const transformed: ConversationData[] = convs.map((conv: any) => {
        const lastMsg = Array.isArray(conv?.messages) && conv.messages.length > 0 ? conv.messages[0] : null
        return {
          uid: String(conv?.uid || ''),
          sujet: conv?.sujet || null,
          type: String(conv?.type || 'DIRECT'),
          offre: conv?.offre ? { uid: String(conv.offre.uid || ''), titre: String(conv.offre.titre || '') } : null,
          lastMessage: lastMsg ? {
            contenu: String(lastMsg.contenu || ''),
            createdAt: String(lastMsg.createdAt || ''),
            isFromMe: Boolean(lastMsg.expediteurTalentId),
          } : null,
          unreadCount: Number(conv?.unreadCount) || 0,
          updatedAt: String(conv?.updatedAt || ''),
        }
      })

      setConversations(transformed)
    } catch (err) {
      console.error('Erreur fetch conversations:', err)
    }
  }, [])

  // Fetch broadcast messages
  const fetchBroadcasts = useCallback(async () => {
    try {
      const res = await fetch('/api/talent/messages', { credentials: 'include' })
      if (!res.ok) return

      const data = await res.json()
      const msgs = Array.isArray(data?.messages) ? data.messages : []

      const transformed: BroadcastData[] = msgs.map((m: any) => ({
        id: Number(m?.id) || 0,
        uid: String(m?.uid || ''),
        sujet: String(m?.sujet || 'Sans sujet'),
        contenu: String(m?.contenu || ''),
        lu: Boolean(m?.lu),
        luLe: m?.luLe ? String(m.luLe) : null,
        recuLe: String(m?.recuLe || ''),
      }))

      setBroadcastMessages(transformed)
      setBroadcastUnread(Number(data?.nonLus) || 0)
    } catch (err) {
      console.error('Erreur fetch broadcasts:', err)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)

      try {
        const authRes = await fetch('/api/auth/me', { credentials: 'include' })
        if (authRes.status === 401) {
          router.push('/t/connexion')
          return
        }

        await Promise.all([fetchConversations(), fetchBroadcasts()])
      } catch (err) {
        console.error('Erreur chargement:', err)
        setError('Erreur lors du chargement des messages')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [router, fetchConversations, fetchBroadcasts])

  // Send new message
  const handleSendMessage = async () => {
    if (!msgContent.trim()) return

    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type: 'SUPPORT',
          sujet: msgSubject || 'Question',
          message: msgContent.trim(),
        }),
      })

      if (res.ok) {
        setShowDialog(false)
        setMsgSubject('')
        setMsgContent('')
        await fetchConversations()
        setActiveTab('conversations')
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      console.error('Erreur envoi:', err)
      alert('Erreur lors de l\'envoi du message')
    } finally {
      setSending(false)
    }
  }

  // Mark broadcast as read
  const markAsRead = async (messageUid: string) => {
    try {
      await fetch('/api/talent/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ messageUid }),
      })
      setBroadcastMessages(prev => prev.map(m =>
        m.uid === messageUid ? { ...m, lu: true, luLe: new Date().toISOString() } : m
      ))
      setBroadcastUnread(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error('Erreur mark as read:', err)
    }
  }

  const openBroadcast = (msg: BroadcastData) => {
    setSelectedBroadcast(msg)
    if (!msg.lu) {
      markAsRead(msg.uid)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } catch {}
    router.push('/')
  }

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      (conv.sujet || '').toLowerCase().includes(s) ||
      (conv.offre?.titre || '').toLowerCase().includes(s) ||
      (conv.lastMessage?.contenu || '').toLowerCase().includes(s)
    )
  })

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </CardContent>
        </Card>
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
                <Users className="w-3 h-3 mr-1" />
                Espace Freelance
              </Badge>
              <nav className="hidden md:flex items-center gap-6">
                <Link href="/t/dashboard" className="text-gray-600 hover:text-primary">Dashboard</Link>
                <Link href="/t/offres" className="text-gray-600 hover:text-primary">Offres</Link>
                <Link href="/t/matchs" className="text-gray-600 hover:text-primary">Mes Matchs</Link>
                <Link href="/t/candidatures" className="text-gray-600 hover:text-primary">Candidatures</Link>
                <Link href="/t/profil" className="text-gray-600 hover:text-primary">Mon profil</Link>
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
              <Button variant="ghost" size="icon" onClick={handleLogout}><LogOut className="w-5 h-5" /></Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-600 mt-1">Annonces TRINEXTA et échanges</p>
        </div>

        {/* Tabs + New message button */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'annonces' ? 'default' : 'outline'}
              onClick={() => { setActiveTab('annonces'); setSelectedBroadcast(null); }}
              className="flex items-center gap-2"
            >
              <Megaphone className="w-4 h-4" />
              Annonces
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

          <Button className="bg-primary hover:bg-primary/90" onClick={() => setShowDialog(true)}>
            <PenSquare className="w-4 h-4 mr-2" />
            Contacter TRINEXTA
          </Button>
        </div>

        {/* Dialog modal simple */}
        {showDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Nouveau message</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowDialog(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mb-4">Envoyez un message à l'équipe TRINEXTA.</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sujet</label>
                    <Input
                      placeholder="Ex: Question sur ma candidature"
                      value={msgSubject}
                      onChange={(e) => setMsgSubject(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Votre message <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      placeholder="Écrivez votre message ici..."
                      rows={5}
                      value={msgContent}
                      onChange={(e) => setMsgContent(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setShowDialog(false)} disabled={sending}>
                    Annuler
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!msgContent.trim() || sending}>
                    {sending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    {sending ? 'Envoi...' : 'Envoyer'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Content */}
        {!loading && (
          <>
            {/* Annonces tab */}
            {activeTab === 'annonces' && (
              selectedBroadcast ? (
                <Card>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-semibold">{selectedBroadcast.sujet}</h2>
                        <p className="text-sm text-gray-500 mt-1">
                          Reçu le {safeFormatFullDate(selectedBroadcast.recuLe)}
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
                    <p className="text-gray-500">Les annonces de TRINEXTA apparaîtront ici</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {broadcastMessages.map((msg) => (
                    <Card
                      key={msg.uid || msg.id}
                      className={`cursor-pointer hover:shadow-md transition ${!msg.lu ? 'bg-primary/5 border-primary/20' : ''}`}
                      onClick={() => openBroadcast(msg)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {msg.lu ? <MailOpen className="w-5 h-5 text-gray-400" /> : <Mail className="w-5 h-5 text-primary" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <h3 className={`font-medium ${!msg.lu ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}>
                                {msg.sujet}
                              </h3>
                              <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
                                {safeFormatShortDate(msg.recuLe)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate mt-1">{msg.contenu}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )
            )}

            {/* Conversations tab */}
            {activeTab === 'conversations' && (
              <>
                <div className="relative mb-6">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredConversations.length === 0 ? (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {search ? 'Aucun résultat' : 'Aucune conversation'}
                      </h3>
                      <p className="text-gray-500 mb-4">
                        {search ? 'Essayez une autre recherche' : 'Vos échanges avec TRINEXTA apparaîtront ici'}
                      </p>
                      {!search && (
                        <Button onClick={() => setShowDialog(true)}>
                          <PenSquare className="w-4 h-4 mr-2" />
                          Envoyer un message
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conv) => (
                      <Link key={conv.uid} href={`/t/messages/${conv.uid}`}>
                        <Card className={`hover:shadow-md transition-shadow cursor-pointer ${conv.unreadCount > 0 ? 'bg-blue-50/50 border-blue-200' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                conv.type === 'SUPPORT' ? 'bg-yellow-100' : 'bg-primary/10'
                              }`}>
                                {conv.type === 'SUPPORT' ? (
                                  <HelpCircle className="w-5 h-5 text-yellow-600" />
                                ) : conv.type === 'OFFRE' ? (
                                  <Briefcase className="w-5 h-5 text-primary" />
                                ) : (
                                  <MessageSquare className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className={`font-semibold text-gray-900 truncate ${conv.unreadCount > 0 ? 'font-bold' : ''}`}>
                                    {conv.sujet || conv.offre?.titre || 'Conversation'}
                                  </h3>
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    {conv.unreadCount > 0 && (
                                      <Badge className="bg-primary text-white text-xs">{conv.unreadCount}</Badge>
                                    )}
                                    <span className="text-xs text-gray-400">{safeFormatDate(conv.updatedAt)}</span>
                                  </div>
                                </div>
                                {conv.lastMessage && (
                                  <p className={`text-sm mt-1 truncate ${conv.unreadCount > 0 ? 'text-gray-900' : 'text-gray-500'}`}>
                                    {conv.lastMessage.isFromMe && <span className="text-gray-400">Vous: </span>}
                                    {conv.lastMessage.contenu}
                                  </p>
                                )}
                                <Badge variant="outline" className="text-xs mt-2">
                                  {conv.type === 'SUPPORT' ? 'Support' : conv.type === 'OFFRE' ? 'Offre' : 'Direct'}
                                </Badge>
                              </div>
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
