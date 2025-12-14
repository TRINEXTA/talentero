'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Logo } from '@/components/ui/logo'
import {
  Building2, Users, Briefcase, Shield, Zap, Clock,
  CheckCircle, ArrowRight, Star, BarChart3, Target
} from 'lucide-react'

export default function EntreprisesPage() {
  const avantages = [
    {
      icon: Shield,
      title: 'Profils verifies',
      description: 'Tous nos freelances sont audites par notre equipe avant integration au vivier.',
      color: 'bg-green-100 text-green-600',
    },
    {
      icon: Zap,
      title: 'Matching IA',
      description: 'Notre algorithme trouve les profils les plus adaptes a vos besoins en quelques secondes.',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Clock,
      title: 'Gain de temps',
      description: 'Recevez des profils qualifies sous 24h au lieu de semaines de sourcing.',
      color: 'bg-purple-100 text-purple-600',
    },
    {
      icon: Target,
      title: 'Shortlist sur-mesure',
      description: 'Creez vos propres viviers de talents pour vos besoins recurrents.',
      color: 'bg-orange-100 text-orange-600',
    },
    {
      icon: BarChart3,
      title: 'Suivi transparent',
      description: 'Dashboard complet pour suivre vos offres, candidatures et missions en cours.',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: Users,
      title: 'Accompagnement',
      description: 'Un consultant dedie vous accompagne dans vos recrutements IT.',
      color: 'bg-pink-100 text-pink-600',
    },
  ]

  const etapes = [
    {
      numero: '01',
      titre: 'Creez votre compte',
      description: 'Inscription gratuite en 2 minutes. Renseignez les informations de votre entreprise.',
    },
    {
      numero: '02',
      titre: 'Publiez vos besoins',
      description: 'Decrivez votre mission, competences recherchees, budget et modalites.',
    },
    {
      numero: '03',
      titre: 'Recevez des profils',
      description: 'Notre IA vous propose les meilleurs candidats sous 24h.',
    },
    {
      numero: '04',
      titre: 'Selectionnez et demarrez',
      description: 'Echangez avec les talents, validez et lancez votre mission.',
    },
  ]

  const temoignages = [
    {
      nom: 'Marie D.',
      poste: 'CTO',
      entreprise: 'FinTech Paris',
      texte: 'Grace a Talentero, nous avons trouve notre Lead Developer en moins d\'une semaine. La qualite des profils est remarquable.',
      note: 5,
    },
    {
      nom: 'Thomas B.',
      poste: 'Directeur IT',
      entreprise: 'Groupe Retail',
      texte: 'L\'interface est intuitive et le matching IA nous fait gagner un temps precieux dans nos recrutements IT.',
      note: 5,
    },
    {
      nom: 'Sophie L.',
      poste: 'RH Manager',
      entreprise: 'ESN Lyon',
      texte: 'Excellent vivier de freelances pour nos projets en regie. La reactivite de l\'equipe TRINEXTA est un vrai plus.',
      note: 5,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <Logo size="sm" showText />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/offres" className="text-gray-600 hover:text-gray-900">
                Offres
              </Link>
              <Link href="/freelances" className="text-gray-600 hover:text-gray-900">
                Freelances
              </Link>
              <Link href="/entreprises" className="text-primary font-medium">
                Entreprises
              </Link>
              <Link href="/c/connexion" className="text-gray-600 hover:text-gray-900">
                Connexion
              </Link>
              <Link href="/c/inscription">
                <Button>Commencer gratuitement</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-hero text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="bg-white/20 text-white mb-6">
                <Building2 className="w-4 h-4 mr-2" />
                Espace Entreprises
              </Badge>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Recrutez les meilleurs talents IT en un clic
              </h1>
              <p className="text-xl text-gray-300 mb-8">
                Accedez a un vivier de freelances IT qualifies et verifies.
                Notre IA trouve le profil ideal pour votre mission en quelques secondes.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/c/inscription">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100">
                    Creer mon compte gratuit
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Link href="/freelances">
                  <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                    Voir les profils
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-8 mt-8 pt-8 border-t border-white/20">
                <div>
                  <p className="text-3xl font-bold">500+</p>
                  <p className="text-sm text-gray-300">Freelances IT</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">24h</p>
                  <p className="text-sm text-gray-300">Delai moyen</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">98%</p>
                  <p className="text-sm text-gray-300">Satisfaction</p>
                </div>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Developpeur React Senior</p>
                      <p className="text-sm text-gray-300">Match trouve - 95% compatible</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">DevOps Engineer</p>
                      <p className="text-sm text-gray-300">Match trouve - 92% compatible</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/10 rounded-xl">
                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold">Data Scientist</p>
                      <p className="text-sm text-gray-300">Match trouve - 88% compatible</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Avantages */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir Talentero ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une plateforme concue pour simplifier vos recrutements IT
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {avantages.map((avantage, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-xl ${avantage.color} flex items-center justify-center mb-4`}>
                    <avantage.icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-semibold text-xl text-gray-900 mb-2">
                    {avantage.title}
                  </h3>
                  <p className="text-gray-600">
                    {avantage.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comment ca marche */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Comment ca marche ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              4 etapes simples pour trouver votre freelance ideal
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {etapes.map((etape, index) => (
              <div key={index} className="relative">
                <div className="text-6xl font-bold text-primary/10 absolute -top-4 -left-2">
                  {etape.numero}
                </div>
                <div className="relative pt-8">
                  <h3 className="font-semibold text-lg text-gray-900 mb-2">
                    {etape.titre}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {etape.description}
                  </p>
                </div>
                {index < etapes.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2">
                    <ArrowRight className="w-6 h-6 text-gray-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Link href="/c/inscription">
              <Button size="lg">
                Commencer maintenant
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Temoignages */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Ils nous font confiance
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Decouvrez les retours de nos clients entreprises
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {temoignages.map((temoignage, index) => (
              <Card key={index} className="bg-white">
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(temoignage.note)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-6 italic">
                    "{temoignage.texte}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {temoignage.nom.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{temoignage.nom}</p>
                      <p className="text-sm text-gray-500">
                        {temoignage.poste} - {temoignage.entreprise}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="bg-primary py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pret a recruter vos talents IT ?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Rejoignez les entreprises qui font confiance a Talentero
            pour leurs recrutements IT.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/c/inscription">
              <Button size="lg" className="bg-white text-primary hover:bg-gray-100">
                Creer mon compte gratuit
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10">
                Nous contacter
              </Button>
            </Link>
          </div>
          <p className="text-white/60 text-sm mt-6">
            Inscription gratuite - Aucune carte bancaire requise
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo size="sm" darkMode />
              <span className="text-white/60">Opere par TRINEXTA</span>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <Link href="/cgu" className="hover:text-white">CGU</Link>
              <Link href="/cgv" className="hover:text-white">CGV</Link>
              <Link href="/mentions-legales" className="hover:text-white">Mentions legales</Link>
              <Link href="/politique-confidentialite" className="hover:text-white">Confidentialite</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
