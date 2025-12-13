import Link from 'next/link'
import { ArrowRight, Upload, Zap, Users, CheckCircle, Shield, Clock } from 'lucide-react'
import { Logo } from '@/components/ui/logo'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Logo size="sm" animated={true} />
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/offres" className="text-gray-600 hover:text-primary transition">
                Offres
              </Link>
              <Link href="/entreprises" className="text-gray-600 hover:text-primary transition">
                Entreprises
              </Link>
              <Link href="/a-propos" className="text-gray-600 hover:text-primary transition">
                À propos
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/t/connexion" 
                className="text-gray-600 hover:text-primary transition"
              >
                Connexion
              </Link>
              <Link 
                href="/offres" 
                className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition flex items-center gap-2"
              >
                Voir les offres
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-hero text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
              Where IT talent meets
              <span className="block text-accent-300"> opportunity</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Postulez en 30 secondes. Réponse instantanée. 
              <br />Le recrutement freelance IT sans friction.
            </p>
            
            {/* CTA Box */}
            <div className="bg-white rounded-2xl p-8 max-w-xl mx-auto shadow-2xl">
              <div className="flex items-center justify-center gap-3 mb-6">
                <Upload className="w-8 h-8 text-primary" />
                <span className="text-gray-800 text-lg font-medium">
                  Déposez votre CV et postulez instantanément
                </span>
              </div>
              <Link 
                href="/offres"
                className="w-full bg-primary text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-primary-700 transition flex items-center justify-center gap-2"
              >
                Voir les offres disponibles
                <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-gray-500 text-sm mt-4">
                Inscription gratuite • Vérification SIRET • 100% indépendants
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary">30s</div>
              <div className="text-gray-600 mt-1">Temps d'inscription</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-success">100%</div>
              <div className="text-gray-600 mt-1">Matching instantané</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-accent">0€</div>
              <div className="text-gray-600 mt-1">Inscription gratuite</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">24h</div>
              <div className="text-gray-600 mt-1">Réponse garantie</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Talents */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-gray-600">
              Freelance IT ? Trouvez votre prochaine mission en 3 étapes
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm card-hover">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-sm text-primary font-semibold mb-2">Étape 1</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Déposez votre CV
              </h3>
              <p className="text-gray-600">
                Upload votre CV, notre IA extrait automatiquement vos compétences. 
                Complétez votre SIRET et c'est parti.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm card-hover">
              <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-8 h-8 text-success" />
              </div>
              <div className="text-sm text-success font-semibold mb-2">Étape 2</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Matching instantané
              </h3>
              <p className="text-gray-600">
                Postulez et découvrez immédiatement votre score de matching. 
                Pas d'attente, pas de "on reviendra vers vous".
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm card-hover">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <div className="text-sm text-accent font-semibold mb-2">Étape 3</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                TRINEXTA vous accompagne
              </h3>
              <p className="text-gray-600">
                Un humain valide chaque mise en relation. 
                Négociation, contrat, démarrage : on gère tout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Talentero */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Pourquoi Talentero ?
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                On a créé la plateforme qu'on aurait aimé avoir. 
                Simple, rapide, transparente.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <CheckCircle className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Réponse instantanée</h4>
                    <p className="text-gray-600">
                      Fini les semaines d'attente. Vous savez immédiatement si votre profil matche.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Shield className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">100% indépendants vérifiés</h4>
                    <p className="text-gray-600">
                      Vérification SIRET obligatoire. Que des vrais freelances.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Clock className="w-6 h-6 text-success flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-gray-900">Inscription en 30 secondes</h4>
                    <p className="text-gray-600">
                      Upload CV + SIRET = c'est fait. Pas de formulaires interminables.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary/5 to-success/5 rounded-3xl p-8">
              <div className="bg-white rounded-2xl p-6 shadow-lg mb-4">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Score de matching</div>
                    <div className="text-sm text-gray-500">Dev Full Stack Java - BNP</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div className="bg-success h-3 rounded-full" style={{ width: '85%' }}></div>
                  </div>
                  <span className="text-2xl font-bold text-success">85%</span>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  ✅ Java, Spring, Angular correspondent<br />
                  ✅ TJM dans la fourchette<br />
                  ⚠️ Kubernetes demandé (non détecté)
                </div>
              </div>
              <p className="text-center text-gray-500 text-sm">
                Exemple de feedback après candidature
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Prêt à trouver votre prochaine mission ?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Rejoignez les freelances IT qui ont choisi la simplicité.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/offres"
              className="bg-white text-primary px-8 py-4 rounded-xl text-lg font-semibold hover:bg-gray-100 transition flex items-center justify-center gap-2"
            >
              Voir les offres
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/c/inscription"
              className="bg-primary-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary-800 transition border border-white/20"
            >
              Je suis une entreprise
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <Logo size="md" animated={false} darkMode={true} />
              <p className="text-sm mt-4">
                Plateforme de recrutement freelance IT nouvelle génération.
                <br />Opérée par TRINEXTA.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Freelances</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/offres" className="hover:text-white transition">Voir les offres</Link></li>
                <li><Link href="/t/inscription" className="hover:text-white transition">S'inscrire</Link></li>
                <li><Link href="/t/connexion" className="hover:text-white transition">Connexion</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Entreprises</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/entreprises" className="hover:text-white transition">Nos services</Link></li>
                <li><Link href="/c/inscription" className="hover:text-white transition">Publier une offre</Link></li>
                <li><Link href="/c/connexion" className="hover:text-white transition">Connexion</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">TRINEXTA</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/a-propos" className="hover:text-white transition">À propos</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contact</Link></li>
                <li><Link href="/mentions-legales" className="hover:text-white transition">Mentions légales</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm">
            <p>© {new Date().getFullYear()} Talentero - TRINEXTA by TrusTech IT Support. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
