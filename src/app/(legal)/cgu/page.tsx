import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation | Talentero',
  description: 'Conditions générales d\'utilisation de la plateforme Talentero',
}

export default function CGUPage() {
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
            Conditions Générales d'Utilisation
          </h1>
          <p className="text-gray-500 mb-8">
            Dernière mise à jour : 14 décembre 2024
          </p>

          <div className="prose prose-slate max-w-none">
            <h2>Article 1 - Présentation de la plateforme</h2>
            <p>
              Talentero est une plateforme de mise en relation entre professionnels du secteur
              informatique (ci-après "Talents" ou "Freelances") et entreprises à la recherche
              de compétences IT (ci-après "Clients"). La plateforme est éditée et opérée par
              la société TRINEXTA by TrusTech IT Support, SAS au capital de 300€, immatriculée
              sous le numéro SIRET 942 020 082 00015, dont le siège social est situé au
              74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes.
            </p>

            <h2>Article 2 - Acceptation des conditions</h2>
            <p>
              L'accès et l'utilisation de la plateforme Talentero impliquent l'acceptation
              pleine et entière des présentes Conditions Générales d'Utilisation (CGU).
              Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser la plateforme.
            </p>

            <h2>Article 3 - Création de compte</h2>
            <h3>3.1 Conditions d'inscription</h3>
            <p>Pour créer un compte sur Talentero, l'utilisateur doit :</p>
            <ul>
              <li>Être une personne physique majeure ou une personne morale</li>
              <li>Disposer de la capacité juridique pour contracter</li>
              <li>Fournir des informations exactes et complètes</li>
              <li>Disposer d'une adresse email valide</li>
            </ul>

            <h3>3.2 Types de comptes</h3>
            <p><strong>Compte Talent (Freelance) :</strong></p>
            <ul>
              <li><strong>Compte complet :</strong> Nécessite un numéro SIRET valide et vérifié</li>
              <li><strong>Compte limité :</strong> Pour les freelances en cours de création d'entreprise</li>
            </ul>
            <p><strong>Compte Client (Entreprise) :</strong></p>
            <ul>
              <li>Soumis à validation par l'équipe TRINEXTA</li>
              <li>Nécessite des informations sur l'entreprise</li>
            </ul>

            <h3>3.3 Sécurité du compte</h3>
            <p>
              L'utilisateur est responsable de la confidentialité de ses identifiants de connexion.
              Il s'engage à informer immédiatement TRINEXTA en cas d'utilisation non autorisée
              de son compte.
            </p>

            <h2>Article 4 - Utilisation de la plateforme</h2>
            <h3>4.1 Règles générales</h3>
            <p>L'utilisateur s'engage à :</p>
            <ul>
              <li>Utiliser la plateforme de manière loyale et conformément à sa destination</li>
              <li>Ne pas publier de contenu illégal, diffamatoire ou contraire aux bonnes mœurs</li>
              <li>Ne pas tenter de contourner les mesures de sécurité</li>
              <li>Ne pas collecter les données des autres utilisateurs</li>
              <li>Respecter les droits de propriété intellectuelle</li>
            </ul>

            <h3>4.2 Contenu publié</h3>
            <p>
              Les utilisateurs sont seuls responsables du contenu qu'ils publient sur la plateforme
              (CV, profil, offres d'emploi, candidatures). TRINEXTA se réserve le droit de supprimer
              tout contenu ne respectant pas les présentes CGU.
            </p>

            <h2>Article 5 - Service de matching</h2>
            <p>
              Talentero utilise un système de matching basé sur l'intelligence artificielle
              pour mettre en relation Talents et Clients. Ce système analyse les compétences,
              l'expérience et les critères de recherche pour proposer les meilleures correspondances.
            </p>
            <p>
              Le score de matching est fourni à titre indicatif et ne garantit pas la réussite
              d'une collaboration.
            </p>

            <h2>Article 6 - Offres d'emploi et candidatures</h2>
            <h3>6.1 Pour les Clients</h3>
            <ul>
              <li>Les offres doivent être réelles et correspondre à un besoin effectif</li>
              <li>Les informations sur la mission doivent être exactes</li>
              <li>Le TJM affiché est celui proposé par TRINEXTA (commission incluse)</li>
            </ul>

            <h3>6.2 Pour les Talents</h3>
            <ul>
              <li>Le profil doit refléter fidèlement les compétences et l'expérience</li>
              <li>Les candidatures doivent être pertinentes par rapport à l'offre</li>
              <li>Le Talent s'engage à répondre dans des délais raisonnables</li>
            </ul>

            <h2>Article 7 - Données personnelles</h2>
            <p>
              Le traitement des données personnelles est régi par notre{' '}
              <Link href="/politique-confidentialite" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>, conforme au RGPD.
            </p>
            <p>En utilisant la plateforme, vous acceptez que vos données soient :</p>
            <ul>
              <li>Utilisées pour le fonctionnement du service</li>
              <li>Partagées avec les parties concernées (Talents/Clients) dans le cadre d'une mise en relation</li>
              <li>Analysées pour améliorer le service de matching</li>
            </ul>

            <h2>Article 8 - Propriété intellectuelle</h2>
            <p>
              Tous les éléments de la plateforme Talentero (code, design, logos, textes, algorithmes)
              sont protégés par le droit de la propriété intellectuelle et appartiennent à TRINEXTA.
            </p>
            <p>
              Les utilisateurs conservent leurs droits sur le contenu qu'ils publient mais accordent
              à TRINEXTA une licence non exclusive d'utilisation dans le cadre du service.
            </p>

            <h2>Article 9 - Limitation de responsabilité</h2>
            <p>TRINEXTA ne peut être tenu responsable :</p>
            <ul>
              <li>Des informations publiées par les utilisateurs</li>
              <li>De la qualité des prestations réalisées par les Talents</li>
              <li>Des litiges entre utilisateurs</li>
              <li>Des interruptions temporaires du service</li>
              <li>Des pertes de données en cas de force majeure</li>
            </ul>

            <h2>Article 10 - Suspension et résiliation</h2>
            <p>
              TRINEXTA se réserve le droit de suspendre ou supprimer un compte en cas de
              non-respect des présentes CGU, sans préavis ni indemnité.
            </p>
            <p>
              L'utilisateur peut supprimer son compte à tout moment depuis les paramètres
              de son profil ou en contactant le support.
            </p>

            <h2>Article 11 - Modifications des CGU</h2>
            <p>
              TRINEXTA peut modifier les présentes CGU à tout moment. Les utilisateurs seront
              informés par email ou notification sur la plateforme. L'utilisation continue
              du service après modification vaut acceptation des nouvelles conditions.
            </p>

            <h2>Article 12 - Droit applicable</h2>
            <p>
              Les présentes CGU sont régies par le droit français. Tout litige sera soumis
              aux tribunaux compétents du ressort du siège social de TRINEXTA.
            </p>

            <h2>Article 13 - Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU, contactez-nous à{' '}
              <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">
                contact@trinexta.fr
              </a>
            </p>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg">
              <p className="font-medium text-gray-900 mb-2">Documents complémentaires :</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>
                  <Link href="/cgv" className="text-primary hover:underline">
                    Conditions Générales de Vente
                  </Link>
                </li>
                <li>
                  <Link href="/politique-confidentialite" className="text-primary hover:underline">
                    Politique de Confidentialité
                  </Link>
                </li>
                <li>
                  <Link href="/mentions-legales" className="text-primary hover:underline">
                    Mentions Légales
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
