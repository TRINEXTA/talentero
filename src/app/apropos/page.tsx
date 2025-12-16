import Link from 'next/link'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import {
  Users, Building2, Target, Shield, Zap, CheckCircle,
  Mail, Phone, MapPin, ArrowRight
} from 'lucide-react'

export const metadata = {
  title: 'A propos - Talentero by TRINEXTA',
  description: 'Decouvrez TRINEXTA, ESN specialisee dans le placement de consultants IT independants.',
}

export default function AproposPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <Logo showText />
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/offres" className="text-gray-600 hover:text-gray-900">
                Offres
              </Link>
              <Link href="/freelances" className="text-gray-600 hover:text-gray-900">
                Talents
              </Link>
              <Link href="/apropos" className="text-primary font-medium">
                A propos
              </Link>
              <Link href="/login">
                <Button variant="outline">Connexion</Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-primary/20 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              TRINEXTA
            </h1>
            <p className="text-xl text-gray-300 mb-4">
              ESN specialisee dans le placement de consultants IT independants
            </p>
            <p className="text-gray-400">
              Talentero est la plateforme digitale de TRINEXTA, concue pour connecter
              les meilleurs talents freelance IT avec des missions passionnantes.
            </p>
          </div>
        </div>
      </section>

      {/* Notre Mission */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Notre Mission</h2>
              <p className="text-gray-600 mb-4">
                Chez TRINEXTA, nous croyons que le freelancing IT est l&apos;avenir du travail.
                Notre mission est de faciliter la rencontre entre les entreprises en quete
                d&apos;expertise technique et les consultants independants talentueux.
              </p>
              <p className="text-gray-600 mb-6">
                Grace a Talentero, notre plateforme innovante, nous utilisons l&apos;intelligence
                artificielle pour matcher automatiquement les competences des freelances avec
                les besoins des missions, garantissant ainsi le meilleur fit possible.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Matching intelligent par competences</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Accompagnement personnalise</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-gray-700">Processus transparent et rapide</span>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-primary mb-2">500+</div>
                  <div className="text-sm text-gray-600">Freelances IT</div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-primary mb-2">100+</div>
                  <div className="text-sm text-gray-600">Clients</div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-primary mb-2">200+</div>
                  <div className="text-sm text-gray-600">Missions pourvues</div>
                </div>
                <div className="text-center p-6 bg-white rounded-xl shadow-sm">
                  <div className="text-3xl font-bold text-primary mb-2">95%</div>
                  <div className="text-sm text-gray-600">Satisfaction</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Services */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Nos Services
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Pour les Freelances
              </h3>
              <p className="text-gray-600 mb-4">
                Accedez a des missions qualifiees correspondant a vos competences.
                Plus besoin de prospecter, les opportunites viennent a vous.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Profil anonymise pour proteger votre identite
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Notifications de missions matchees
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Gestion simplifiee des candidatures
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Pour les Entreprises
              </h3>
              <p className="text-gray-600 mb-4">
                Trouvez rapidement les meilleurs consultants IT pour vos projets
                grace a notre algorithme de matching intelligent.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Shortlists de candidats preselectionnees
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  CVs anonymises aux couleurs de votre entreprise
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Suivi complet du processus de recrutement
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Sous-traitance ESN
              </h3>
              <p className="text-gray-600 mb-4">
                TRINEXTA accompagne egalement les ESN dans leurs besoins de
                sous-traitance pour repondre a leurs appels d&apos;offres.
              </p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Reponse rapide aux AO
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Pool de talents qualifies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Partenariat de confiance
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Nos Valeurs */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Nos Valeurs
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Transparence</h3>
              <p className="text-sm text-gray-600">
                Communication claire et honnete avec tous nos partenaires
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Excellence</h3>
              <p className="text-sm text-gray-600">
                Selection rigoureuse des profils pour garantir la qualite
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Proximite</h3>
              <p className="text-sm text-gray-600">
                Accompagnement personnalise tout au long des missions
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Reactivite</h3>
              <p className="text-sm text-gray-600">
                Reponses rapides et processus optimise
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold mb-6">Contactez-nous</h2>
              <p className="text-gray-400 mb-8">
                Vous avez des questions ? Notre equipe est a votre disposition
                pour vous accompagner dans vos projets.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <a href="mailto:contact@trinexta.fr" className="text-white hover:text-primary">
                      contact@trinexta.fr
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Telephone</div>
                    <a href="tel:0978250746" className="text-white hover:text-primary">
                      09 78 25 07 46
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Adresse</div>
                    <div className="text-white">
                      74B Boulevard Henri Dunant<br />
                      91100 Corbeil-Essonnes
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-8">
              <h3 className="text-xl font-semibold mb-6">Rejoignez Talentero</h3>
              <div className="space-y-4">
                <Link href="/t/inscription">
                  <Button className="w-full justify-between" size="lg">
                    Je suis Freelance
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link href="/c/inscription">
                  <Button className="w-full justify-between bg-white text-gray-900 hover:bg-gray-100" size="lg">
                    Je suis une Entreprise
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-sm">by TRINEXTA</span>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/cgu" className="hover:text-white">CGU</Link>
              <Link href="/politique-confidentialite" className="hover:text-white">Confidentialite</Link>
              <Link href="/mentions-legales" className="hover:text-white">Mentions legales</Link>
            </div>
            <div className="text-sm">
              &copy; {new Date().getFullYear()} TRINEXTA. Tous droits reserves.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
