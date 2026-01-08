"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Lock, ArrowLeft } from 'lucide-react'

export default function TalentConnexionPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {}
          data.details.forEach((err: { path: string[]; message: string }) => {
            fieldErrors[err.path[0]] = err.message
          })
          setErrors(fieldErrors)
        } else {
          toast({
            title: "Erreur de connexion",
            description: data.error || "Email ou mot de passe incorrect",
            variant: "destructive",
          })
        }
        return
      }

      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur Talentero !",
      })

      router.push(data.redirectUrl || '/t/dashboard')
    } catch {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Réessayez.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 text-gray-600 hover:text-primary mb-8">
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        <h1 className="text-center text-3xl font-bold text-primary">Talentero</h1>
        <h2 className="mt-2 text-center text-xl text-gray-600">
          Espace Freelance
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Connexion</CardTitle>
            <CardDescription>
              Connectez-vous à votre espace freelance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="mt-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={errors.email}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Link
                    href="/mot-de-passe-oublie"
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="mt-1 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    error={errors.password}
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" loading={loading}>
                Se connecter
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Pas encore de compte ?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link href="/t/inscription">
                  <Button variant="outline" className="w-full">
                    Créer un compte freelance
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-gray-500">
          Vous êtes une entreprise ?{' '}
          <Link href="/c/connexion" className="text-primary hover:underline">
            Connexion entreprise
          </Link>
        </p>
      </div>
    </div>
  )
}
