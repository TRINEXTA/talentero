import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Conditions Générales de Vente | Talentero',
  description: 'Conditions générales de vente de la plateforme Talentero, opérée par TRINEXTA by TrusTech IT Support',
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
            Dernière mise à jour : 14 décembre 2024
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
            <div className="bg-gray-50 p-6 rounded-lg my-4 not-prose">
              <p className="font-semibold text-lg text-gray-900 mb-3">TRINEXTA by TrusTech IT Support</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <p><span className="font-medium">Forme juridique :</span> Société par actions simplifiée (SAS)</p>
                <p><span className="font-medium">Capital social :</span> 300 €</p>
                <p><span className="font-medium">Siège social :</span> 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</p>
                <p><span className="font-medium">SIRET :</span> 942 020 082 00015</p>
                <p><span className="font-medium">Code NAF/APE :</span> 6202A</p>
                <p><span className="font-medium">N° TVA :</span> FR81942020082</p>
                <p><span className="font-medium">Email :</span> contact@trinexta.fr</p>
                <p><span className="font-medium">Téléphone :</span> 09 78 25 07 46</p>
              </div>
            </div>

            <h2>Article 3 - Services proposés</h2>
            <h3>3.1 Pour les entreprises clientes</h3>
            <ul>
              <li>Publication d'offres de missions freelance</li>
              <li>Accès à une base de talents IT qualifiés et vérifiés</li>
              <li>Système de matching intelligent basé sur l'intelligence artificielle</li>
              <li>Présélection de candidats sous forme de shortlist</li>
              <li>Organisation et suivi des entretiens</li>
              <li>Accompagnement dans le processus de recrutement</li>
            </ul>

            <h3>3.2 Pour les freelances (Talents)</h3>
            <ul>
              <li>Création d'un profil professionnel complet</li>
              <li>Accès aux offres de missions correspondant à leur profil</li>
              <li>Candidature aux missions avec scoring de compatibilité</li>
              <li>Alertes personnalisées sur les nouvelles opportunités</li>
              <li>Visibilité auprès des entreprises partenaires</li>
              <li>Accompagnement dans les processus de candidature</li>
            </ul>

            <h2>Article 4 - Tarification</h2>
            <h3>4.1 Pour les entreprises</h3>
            <p>
              TRINEXTA applique une commission sur le TJM (Taux Journalier Moyen) du freelance
              sélectionné. Cette commission est définie contractuellement avec chaque client.
            </p>
            <p>
              <strong>Important :</strong> Le TJM affiché sur les offres est celui proposé par TRINEXTA
              aux talents (commission incluse). Le TJM réel facturé au client peut différer selon
              les conditions négociées.
            </p>

            <h3>4.2 Pour les freelances</h3>
            <p>
              L'inscription et l'utilisation de la plateforme sont <strong>entièrement gratuites</strong> pour
              les freelances. Aucune commission n'est prélevée sur les revenus du freelance.
            </p>
            <p>
              Le TJM affiché sur les offres correspond au montant que percevra le freelance
              pour sa prestation.
            </p>

            <h2>Article 5 - Inscription et compte utilisateur</h2>
            <h3>5.1 Conditions d'inscription</h3>
            <p>
              L'utilisation des services nécessite la création d'un compte utilisateur.
              L'utilisateur s'engage à fournir des informations exactes et à jour.
            </p>

            <h3>5.2 Pour les freelances</h3>
            <p>
              Un numéro SIRET valide est requis pour un compte complet et l'accès à toutes
              les fonctionnalités. Les freelances en cours de création d'entreprise peuvent
              bénéficier d'un compte limité en attendant l'obtention de leur SIRET.
            </p>

            <h3>5.3 Pour les entreprises</h3>
            <p>
              L'inscription des entreprises est soumise à validation par l'équipe TRINEXTA.
              Cette validation permet de garantir la qualité des offres publiées sur la plateforme.
            </p>

            <h2>Article 6 - Processus de mise en relation</h2>
            <h3>6.1 Publication des offres</h3>
            <p>
              Les offres d'emploi sont publiées après validation par TRINEXTA. Cette validation
              permet de s'assurer de la qualité et de la pertinence des offres.
            </p>

            <h3>6.2 Matching et candidatures</h3>
            <p>
              Un algorithme de matching basé sur l'IA analyse les profils des talents et les
              compare aux critères des offres. Les talents dont le profil correspond reçoivent
              une notification et peuvent postuler.
            </p>

            <h3>6.3 Shortlist et sélection</h3>
            <p>
              TRINEXTA constitue une shortlist de candidats qualifiés qu'elle soumet au client.
              Le client peut alors demander des entretiens avec les candidats de son choix.
            </p>

            <h3>6.4 Entretiens</h3>
            <p>
              Les entretiens sont organisés via la plateforme. Le client propose des créneaux,
              les talents confirment leur disponibilité, et TRINEXTA génère les liens de visioconférence.
            </p>

            <h2>Article 7 - Obligations des parties</h2>
            <h3>7.1 Obligations de TRINEXTA</h3>
            <ul>
              <li>Assurer le bon fonctionnement technique de la plateforme</li>
              <li>Protéger les données personnelles des utilisateurs conformément au RGPD</li>
              <li>Vérifier les informations fournies par les utilisateurs (SIRET notamment)</li>
              <li>Accompagner les clients dans leur processus de recrutement</li>
              <li>Garantir la confidentialité des informations échangées</li>
            </ul>

            <h3>7.2 Obligations des entreprises clientes</h3>
            <ul>
              <li>Fournir des informations exactes sur l'entreprise et les missions</li>
              <li>Publier des offres correspondant à des besoins réels</li>
              <li>Respecter les délais de réponse aux candidatures</li>
              <li>Honorer les engagements pris avec les freelances sélectionnés</li>
              <li>Régler les prestations dans les délais convenus</li>
            </ul>

            <h3>7.3 Obligations des freelances</h3>
            <ul>
              <li>Fournir des informations exactes sur leurs compétences et expériences</li>
              <li>Maintenir leur profil à jour</li>
              <li>Répondre dans des délais raisonnables aux sollicitations</li>
              <li>Respecter les engagements pris lors d'une mission</li>
              <li>Disposer d'un statut juridique valide (numéro SIRET)</li>
            </ul>

            <h2>Article 8 - Propriété intellectuelle</h2>
            <p>
              L'ensemble des éléments de la plateforme Talentero (logo, design, textes, algorithmes)
              sont la propriété exclusive de TRINEXTA et sont protégés par le droit de la propriété
              intellectuelle.
            </p>
            <p>
              Les utilisateurs conservent la propriété intellectuelle des contenus qu'ils publient
              (CV, descriptions de profil) mais accordent à TRINEXTA une licence d'utilisation
              dans le cadre du service.
            </p>

            <h2>Article 9 - Responsabilité</h2>
            <p>
              TRINEXTA agit en tant qu'intermédiaire de mise en relation et ne peut être tenu
              responsable :
            </p>
            <ul>
              <li>Du contenu publié par les utilisateurs (profils, offres, messages)</li>
              <li>De la qualité des prestations réalisées par les freelances</li>
              <li>Des litiges entre entreprises et freelances</li>
              <li>Des décisions de recrutement prises par les entreprises</li>
              <li>De l'interruption temporaire du service pour maintenance</li>
            </ul>

            <h2>Article 10 - Confidentialité</h2>
            <h3>10.1 Pour les offres en sous-traitance</h3>
            <p>
              Pour les offres provenant de donneurs d'ordre (sous-traitance), les CV sont transmis
              sous forme anonymisée. L'identité des candidats n'est révélée qu'après accord du
              donneur d'ordre.
            </p>

            <h3>10.2 Pour les offres directes</h3>
            <p>
              Les profils des candidats sont présentés aux clients avec leur accord. Les informations
              personnelles restent confidentielles jusqu'à la sélection finale.
            </p>

            <h2>Article 11 - Durée et résiliation</h2>
            <p>
              Le compte utilisateur est créé pour une durée indéterminée. Chaque partie peut
              résilier à tout moment, sous réserve du respect des engagements en cours.
            </p>
            <p>
              TRINEXTA se réserve le droit de suspendre ou supprimer un compte en cas de
              non-respect des présentes CGV, sans préavis ni indemnité.
            </p>

            <h2>Article 12 - Protection des données</h2>
            <p>
              Les données personnelles sont traitées conformément à notre{' '}
              <Link href="/politique-confidentialite" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>{' '}
              et au Règlement Général sur la Protection des Données (RGPD).
            </p>

            <h2>Article 13 - Facturation et paiement</h2>
            <h3>13.1 Modalités de facturation</h3>
            <p>
              La facturation des prestations de mise en relation est effectuée selon les modalités
              définies dans le contrat signé avec chaque client.
            </p>

            <h3>13.2 Délais de paiement</h3>
            <p>
              Sauf accord contraire, les factures sont payables à 30 jours date de facture.
              Tout retard de paiement entraîne l'application de pénalités de retard au taux
              légal en vigueur.
            </p>

            <h2>Article 14 - Droit applicable et juridiction</h2>
            <p>
              Les présentes CGV sont soumises au droit français. En cas de litige, et après
              tentative de résolution amiable, les tribunaux compétents seront ceux du ressort
              du siège social de TRINEXTA (Tribunal de Commerce d'Évry).
            </p>

            <h2>Article 15 - Modification des CGV</h2>
            <p>
              TRINEXTA se réserve le droit de modifier les présentes CGV à tout moment.
              Les utilisateurs seront informés par email de toute modification substantielle.
              L'utilisation continue des services après modification vaut acceptation des
              nouvelles conditions.
            </p>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg not-prose">
              <p className="text-sm text-gray-600">
                Pour toute question concernant ces conditions, contactez-nous à{' '}
                <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">
                  contact@trinexta.fr
                </a>
                {' '}ou par téléphone au 09 78 25 07 46.
              </p>
            </div>

            <div className="mt-6 p-6 bg-gray-50 rounded-lg not-prose">
              <p className="font-medium text-gray-900 mb-3">Documents complémentaires :</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <Link href="/cgu" className="text-primary hover:underline">
                    Conditions Générales d'Utilisation
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
