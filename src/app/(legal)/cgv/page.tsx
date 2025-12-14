import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente | Talentero',
  description: 'Conditions générales de vente de la plateforme Talentero, opérée par TRINEXTA',
}

export default function CGVPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/" className="flex items-center text-gray-500 hover:text-gray-700">
              <ChevronLeft className="w-5 h-5 mr-1" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="bg-white rounded-xl shadow-sm p-8 md:p-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Conditions Générales de Vente
          </h1>
          <p className="text-gray-500 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="prose prose-slate max-w-none">
            <h2>Article 1 - Objet</h2>
            <p>
              Les présentes Conditions Générales de Vente (CGV) régissent les relations contractuelles
              entre la société TRINEXTA, opérateur de la plateforme Talentero, et ses clients
              (entreprises utilisatrices et freelances).
            </p>
            <p>
              Talentero est une plateforme de mise en relation entre entreprises recherchant des
              compétences IT en freelance et consultants indépendants du secteur informatique.
            </p>

            <h2>Article 2 - Identification du prestataire</h2>
            <p>
              <strong>Raison sociale :</strong> TRINEXTA<br />
              <strong>Forme juridique :</strong> [À compléter]<br />
              <strong>Siège social :</strong> [À compléter]<br />
              <strong>SIRET :</strong> [À compléter]<br />
              <strong>Email :</strong> contact@trinexta.fr
            </p>

            <h2>Article 3 - Services proposés</h2>
            <h3>3.1 Pour les entreprises clientes</h3>
            <ul>
              <li>Publication d'offres de missions freelance</li>
              <li>Accès à une base de talents IT qualifiés</li>
              <li>Système de matching intelligent (IA)</li>
              <li>Présélection de candidats (shortlist)</li>
              <li>Accompagnement dans le processus de recrutement</li>
            </ul>

            <h3>3.2 Pour les freelances (Talents)</h3>
            <ul>
              <li>Création d'un profil professionnel</li>
              <li>Accès aux offres de missions</li>
              <li>Candidature aux missions correspondant à leur profil</li>
              <li>Alertes personnalisées sur les nouvelles opportunités</li>
              <li>Visibilité auprès des entreprises partenaires</li>
            </ul>

            <h2>Article 4 - Tarification</h2>
            <h3>4.1 Pour les entreprises</h3>
            <p>
              Les tarifs sont communiqués sur devis selon les besoins spécifiques de chaque entreprise.
              TRINEXTA applique une commission sur le TJM (Taux Journalier Moyen) du freelance sélectionné.
            </p>

            <h3>4.2 Pour les freelances</h3>
            <p>
              L'inscription et l'utilisation de la plateforme sont gratuites pour les freelances.
              Aucune commission n'est prélevée sur les revenus du freelance.
            </p>

            <h2>Article 5 - Inscription et compte utilisateur</h2>
            <p>
              L'utilisation des services nécessite la création d'un compte utilisateur.
              L'utilisateur s'engage à fournir des informations exactes et à jour.
            </p>
            <p>
              Pour les freelances : un numéro SIRET valide est requis pour un compte complet.
              Les freelances en cours de création d'entreprise peuvent bénéficier d'un compte limité.
            </p>

            <h2>Article 6 - Obligations des parties</h2>
            <h3>6.1 Obligations de TRINEXTA</h3>
            <ul>
              <li>Assurer le bon fonctionnement de la plateforme</li>
              <li>Protéger les données personnelles des utilisateurs</li>
              <li>Vérifier les informations fournies par les utilisateurs</li>
              <li>Accompagner les clients dans leur processus de recrutement</li>
            </ul>

            <h3>6.2 Obligations des utilisateurs</h3>
            <ul>
              <li>Fournir des informations exactes et à jour</li>
              <li>Respecter les conditions d'utilisation de la plateforme</li>
              <li>Ne pas utiliser la plateforme à des fins frauduleuses</li>
              <li>Respecter la confidentialité des informations échangées</li>
            </ul>

            <h2>Article 7 - Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments de la plateforme Talentero (logo, design, textes, algorithmes)
              sont la propriété exclusive de TRINEXTA et sont protégés par le droit de la propriété intellectuelle.
            </p>

            <h2>Article 8 - Responsabilité</h2>
            <p>
              TRINEXTA agit en tant qu'intermédiaire et ne peut être tenu responsable :
            </p>
            <ul>
              <li>Du contenu publié par les utilisateurs</li>
              <li>De la qualité des prestations réalisées par les freelances</li>
              <li>Des litiges entre entreprises et freelances</li>
            </ul>

            <h2>Article 9 - Durée et résiliation</h2>
            <p>
              Le compte utilisateur est créé pour une durée indéterminée.
              Chaque partie peut résilier à tout moment, sous réserve du respect des engagements en cours.
            </p>

            <h2>Article 10 - Protection des données</h2>
            <p>
              Les données personnelles sont traitées conformément à notre{' '}
              <Link href="/politique-confidentialite" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>{' '}
              et au Règlement Général sur la Protection des Données (RGPD).
            </p>

            <h2>Article 11 - Droit applicable et juridiction</h2>
            <p>
              Les présentes CGV sont soumises au droit français.
              En cas de litige, et après tentative de résolution amiable, les tribunaux compétents
              seront ceux du ressort du siège social de TRINEXTA.
            </p>

            <h2>Article 12 - Modification des CGV</h2>
            <p>
              TRINEXTA se réserve le droit de modifier les présentes CGV à tout moment.
              Les utilisateurs seront informés par email de toute modification substantielle.
            </p>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                Pour toute question concernant ces conditions, contactez-nous à{' '}
                <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">
                  contact@trinexta.fr
                </a>
              </p>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
