import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | Talentero',
  description: 'Politique de confidentialité et protection des données personnelles de Talentero',
}

export default function PolitiqueConfidentialitePage() {
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
            Politique de Confidentialité
          </h1>
          <p className="text-gray-500 mb-8">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>

          <div className="prose prose-slate max-w-none">
            <p className="lead">
              Chez TRINEXTA, nous accordons une importance primordiale à la protection de vos
              données personnelles. Cette politique de confidentialité vous informe sur la
              manière dont nous collectons, utilisons et protégeons vos informations lorsque
              vous utilisez la plateforme Talentero.
            </p>

            <h2>1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles est :
            </p>
            <div className="bg-gray-50 p-4 rounded-lg my-4">
              <p className="mb-1"><strong>TRINEXTA</strong></p>
              <p className="mb-1">Adresse : [À compléter]</p>
              <p className="mb-1">Email : dpo@trinexta.fr</p>
            </div>

            <h2>2. Données collectées</h2>
            <h3>2.1 Données d'identification</h3>
            <ul>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Photo de profil (optionnelle)</li>
              <li>Nationalité (pour les missions nécessitant des habilitations)</li>
            </ul>

            <h3>2.2 Données professionnelles (Talents)</h3>
            <ul>
              <li>CV et parcours professionnel</li>
              <li>Compétences techniques</li>
              <li>Formations et certifications</li>
              <li>Expériences professionnelles</li>
              <li>TJM (Taux Journalier Moyen) souhaité</li>
              <li>Disponibilité et mobilité</li>
            </ul>

            <h3>2.3 Données d'entreprise (Clients et Talents)</h3>
            <ul>
              <li>Raison sociale</li>
              <li>Numéro SIRET/SIREN</li>
              <li>Numéro de TVA intracommunautaire</li>
              <li>Adresse du siège social</li>
              <li>Forme juridique</li>
            </ul>

            <h3>2.4 Données de connexion</h3>
            <ul>
              <li>Adresse IP</li>
              <li>Données de navigation (pages visitées, durée)</li>
              <li>Appareil et navigateur utilisés</li>
              <li>Dates et heures de connexion</li>
            </ul>

            <h2>3. Finalités du traitement</h2>
            <p>Vos données sont collectées pour :</p>
            <ul>
              <li><strong>Gestion des comptes :</strong> Création, authentification et gestion de votre compte</li>
              <li><strong>Mise en relation :</strong> Matching entre Talents et Clients</li>
              <li><strong>Communication :</strong> Envoi d'alertes, notifications et informations sur le service</li>
              <li><strong>Amélioration du service :</strong> Analyse et optimisation de la plateforme</li>
              <li><strong>Conformité légale :</strong> Respect de nos obligations légales et réglementaires</li>
            </ul>

            <h2>4. Base légale du traitement</h2>
            <ul>
              <li><strong>Exécution du contrat :</strong> Pour la gestion de votre compte et des services</li>
              <li><strong>Consentement :</strong> Pour les communications marketing et cookies non essentiels</li>
              <li><strong>Intérêt légitime :</strong> Pour l'amélioration de nos services et la prévention de la fraude</li>
              <li><strong>Obligation légale :</strong> Pour le respect de nos obligations comptables et fiscales</li>
            </ul>

            <h2>5. Destinataires des données</h2>
            <p>Vos données peuvent être partagées avec :</p>
            <ul>
              <li><strong>L'équipe TRINEXTA :</strong> Pour la gestion et le support de la plateforme</li>
              <li><strong>Les autres utilisateurs :</strong> Dans le cadre des mises en relation (profil visible)</li>
              <li><strong>Sous-traitants techniques :</strong> Hébergement (OVH), envoi d'emails, analyse</li>
              <li><strong>Autorités compétentes :</strong> Sur demande légale</li>
            </ul>
            <p>
              Nous ne vendons jamais vos données à des tiers.
            </p>

            <h2>6. Transferts hors UE</h2>
            <p>
              Certains de nos prestataires peuvent être situés en dehors de l'Union Européenne.
              Dans ce cas, nous nous assurons que des garanties appropriées sont mises en place
              (clauses contractuelles types, décisions d'adéquation).
            </p>

            <h2>7. Durée de conservation</h2>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Type de données</th>
                  <th className="text-left">Durée de conservation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Compte actif</td>
                  <td>Pendant toute la durée d'utilisation du service</td>
                </tr>
                <tr>
                  <td>Compte inactif</td>
                  <td>3 ans après la dernière connexion</td>
                </tr>
                <tr>
                  <td>Candidatures</td>
                  <td>2 ans après la fin de la mission</td>
                </tr>
                <tr>
                  <td>Données de connexion</td>
                  <td>1 an</td>
                </tr>
                <tr>
                  <td>Données comptables</td>
                  <td>10 ans (obligation légale)</td>
                </tr>
              </tbody>
            </table>

            <h2>8. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d'accès :</strong> Obtenir une copie de vos données</li>
              <li><strong>Droit de rectification :</strong> Corriger vos données inexactes</li>
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données</li>
              <li><strong>Droit à la limitation :</strong> Restreindre le traitement de vos données</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données</li>
              <li><strong>Droit de retirer votre consentement :</strong> À tout moment pour les traitements basés sur le consentement</li>
            </ul>
            <p>
              Pour exercer ces droits, contactez-nous à{' '}
              <a href="mailto:dpo@trinexta.fr" className="text-primary hover:underline">
                dpo@trinexta.fr
              </a>.
            </p>
            <p>
              Vous pouvez également introduire une réclamation auprès de la CNIL
              (Commission Nationale de l'Informatique et des Libertés).
            </p>

            <h2>9. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
              pour protéger vos données :
            </p>
            <ul>
              <li>Chiffrement des données en transit (HTTPS/TLS)</li>
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Contrôle d'accès strict aux données</li>
              <li>Journalisation des accès</li>
              <li>Mises à jour de sécurité régulières</li>
              <li>Hébergement sécurisé en France</li>
            </ul>

            <h2>10. Cookies</h2>
            <h3>10.1 Cookies utilisés</h3>
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left">Cookie</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Durée</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>auth_token</td>
                  <td>Essentiel (authentification)</td>
                  <td>7 jours</td>
                </tr>
                <tr>
                  <td>cookie_consent</td>
                  <td>Essentiel (préférences)</td>
                  <td>1 an</td>
                </tr>
              </tbody>
            </table>

            <h3>10.2 Gestion des cookies</h3>
            <p>
              Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.
              Notez que la désactivation de certains cookies peut affecter le fonctionnement du site.
            </p>

            <h2>11. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité. Toute modification
              substantielle vous sera notifiée par email ou via la plateforme.
            </p>

            <h2>12. Contact</h2>
            <p>
              Pour toute question concernant cette politique ou vos données personnelles :
            </p>
            <ul>
              <li>Email DPO : <a href="mailto:dpo@trinexta.fr" className="text-primary hover:underline">dpo@trinexta.fr</a></li>
              <li>Email général : <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">contact@trinexta.fr</a></li>
            </ul>

            <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100">
              <p className="font-medium text-blue-900 mb-2">Résumé de vos droits</p>
              <p className="text-sm text-blue-800">
                Vous avez le contrôle sur vos données. À tout moment, vous pouvez accéder à votre profil
                pour modifier vos informations, exporter vos données ou supprimer votre compte.
                Pour toute demande, contactez notre DPO à dpo@trinexta.fr.
              </p>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}
