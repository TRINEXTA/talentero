'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  MessageSquare, ChevronLeft, Send, User, Shield,
  HelpCircle, Briefcase, Mail, Loader2, AlertCircle
} from 'lucide-react'

interface MessageData {
  id: number
  uid: string
  contenu: string
  createdAt: string
  expediteurAdmin: boolean
  expediteurTalentId: number | null
  expediteur: {
    type: string
    nom: string
    prenom?: string
  } | null
}

interface ConversationData {
  uid: string
  type: string
  sujet: string | null
  createdAt: string
  participants: Array<{
    talent: {
      uid: string
      codeUnique: string
      prenom: string
      nom: string
    } | null
    isAdmin: boolean
  }>
  messages: MessageData[]
  offre: { uid: string; titre: string } | null
}

export default function AdminConversationPage() {
  // Utiliser useParams au lieu de use(params)
  const params = useParams()
  const uid = typeof params?.uid === 'string' ? params.uid : ''

  const router = useRouter()
  const [conversation, setConversation] = useState<ConversationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages])

  // Fetch conversation
  useEffect(() => {
    if (!uid) {
      setError('ID de conversation manquant')
      setLoading(false)
      return
    }

    const fetchConversation = async () => {
      try {
        setError(null)
        const res = await fetch(`/api/admin/conversations/${uid}/messages`)

        if (res.status === 401) {
          router.push('/admin/login')
          return
        }

        if (res.status === 404) {
          router.push('/admin/messages')
          return
        }

        if (!res.ok) {
          setError('Erreur lors du chargement')
          return
        }

        const data = await res.json()

        if (data?.conversation) {
          const conv = data.conversation
          const safeConv: ConversationData = {
            uid: String(conv.uid || uid),
            type: String(conv.type || 'DIRECT'),
            sujet: conv.sujet || null,
            createdAt: String(conv.createdAt || ''),
            participants: Array.isArray(conv.participants) ? conv.participants.map((p: any) => ({
              talent: p.talent ? {
                uid: String(p.talent.uid || ''),
                codeUnique: String(p.talent.codeUnique || ''),
                prenom: String(p.talent.prenom || ''),
                nom: String(p.talent.nom || '')
              } : null,
              isAdmin: Boolean(p.isAdmin)
            })) : [],
            messages: Array.isArray(conv.messages) ? conv.messages.map((m: any) => ({
              id: Number(m.id) || 0,
              uid: String(m.uid || ''),
              contenu: String(m.contenu || ''),
              createdAt: String(m.createdAt || ''),
              expediteurAdmin: Boolean(m.expediteurAdmin),
              expediteurTalentId: m.expediteurTalentId || null,
              expediteur: m.expediteur || null
            })) : [],
            offre: conv.offre ? {
              uid: String(conv.offre.uid || ''),
              titre: String(conv.offre.titre || '')
            } : null
          }
          setConversation(safeConv)
        }
      } catch (err) {
        console.error('Erreur:', err)
        setError('Erreur de connexion')
      } finally {
        setLoading(false)
      }
    }

    fetchConversation()
    const interval = setInterval(fetchConversation, 10000)
    return () => clearInterval(interval)
  }, [uid, router])

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending || !uid) return

    setSending(true)
    try {
      const res = await fetch(`/api/admin/conversations/${uid}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (res.ok) {
        setNewMessage('')
        // Refresh
        const refreshRes = await fetch(`/api/admin/conversations/${uid}/messages`)
        if (refreshRes.ok) {
          const data = await refreshRes.json()
          if (data?.conversation) {
            const conv = data.conversation
            setConversation({
              uid: String(conv.uid || uid),
              type: String(conv.type || 'DIRECT'),
              sujet: conv.sujet || null,
              createdAt: String(conv.createdAt || ''),
              participants: Array.isArray(conv.participants) ? conv.participants.map((p: any) => ({
                talent: p.talent ? {
                  uid: String(p.talent.uid || ''),
                  codeUnique: String(p.talent.codeUnique || ''),
                  prenom: String(p.talent.prenom || ''),
                  nom: String(p.talent.nom || '')
                } : null,
                isAdmin: Boolean(p.isAdmin)
              })) : [],
              messages: Array.isArray(conv.messages) ? conv.messages.map((m: any) => ({
                id: Number(m.id) || 0,
                uid: String(m.uid || ''),
                contenu: String(m.contenu || ''),
                createdAt: String(m.createdAt || ''),
                expediteurAdmin: Boolean(m.expediteurAdmin),
                expediteurTalentId: m.expediteurTalentId || null,
                expediteur: m.expediteur || null
              })) : [],
              offre: conv.offre ? {
                uid: String(conv.offre.uid || ''),
                titre: String(conv.offre.titre || '')
              } : null
            })
          }
        }
      } else {
        const errData = await res.json().catch(() => ({}))
        alert(errData.error || 'Erreur lors de l\'envoi')
      }
    } catch (err) {
      console.error('Erreur:', err)
      alert('Erreur lors de l\'envoi du message')
    } finally {
      setSending(false)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return ''
    try {
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return ''
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SUPPORT': return <HelpCircle className="w-4 h-4" />
      case 'DIRECT': return <Mail className="w-4 h-4" />
      case 'OFFRE': return <Briefcase className="w-4 h-4" />
      default: return <MessageSquare className="w-4 h-4" />
    }
  }

  const getTalent = () => {
    if (!conversation) return null
    const talentParticipant = conversation.participants.find(p => p.talent)
    return talentParticipant?.talent || null
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Erreur</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.push('/admin/messages')}>Retour aux messages</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Not found
  if (!conversation) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Conversation non trouvée</h2>
            <Button onClick={() => router.push('/admin/messages')}>Retour aux messages</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const talent = getTalent()

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 h-16">
            <Link href="/admin/messages" className="text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-gray-900">
                  {talent ? `${talent.prenom} ${talent.nom}` : 'Conversation'}
                </h1>
                <Badge variant="outline" className="text-xs">
                  {getTypeIcon(conversation.type)}
                  <span className="ml-1">{conversation.type}</span>
                </Badge>
                {talent && (
                  <Badge variant="outline" className="text-xs">{talent.codeUnique}</Badge>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {conversation.sujet || conversation.offre?.titre || 'Sans sujet'}
              </p>
            </div>
            {talent && (
              <Link href={`/admin/talents/${talent.uid}`}>
                <Button variant="outline" size="sm">Voir profil</Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {conversation.messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun message</p>
            </div>
          ) : (
            conversation.messages.map((msg) => {
              const isFromAdmin = msg.expediteurAdmin

              return (
                <div key={msg.id || msg.uid} className={`flex ${isFromAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%]`}>
                    {/* Sender info */}
                    <div className={`flex items-center gap-2 mb-1 ${isFromAdmin ? 'justify-end mr-2' : 'ml-2'}`}>
                      {!isFromAdmin && (
                        <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        {isFromAdmin ? 'TRINEXTA' : (
                          msg.expediteur?.prenom
                            ? `${msg.expediteur.prenom} ${msg.expediteur.nom || ''}`
                            : msg.expediteur?.nom || 'Talent'
                        )}
                      </span>
                      {isFromAdmin && (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div className={`rounded-2xl px-4 py-2 ${
                      isFromAdmin
                        ? 'bg-primary text-white rounded-br-md'
                        : 'bg-white text-gray-900 border rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.contenu}</p>
                    </div>
                    <p className={`text-xs text-gray-400 mt-1 ${isFromAdmin ? 'text-right mr-2' : 'ml-2'}`}>
                      {formatDate(msg.createdAt)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input */}
      <div className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Textarea
                placeholder="Écrire une réponse..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
                className="resize-none min-h-[44px] max-h-[200px]"
                rows={1}
              />
            </div>
            <Button type="submit" disabled={!newMessage.trim() || sending}>
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">Entrée pour envoyer, Shift+Entrée pour saut de ligne</p>
        </form>
      </div>
    </div>
  )
}
