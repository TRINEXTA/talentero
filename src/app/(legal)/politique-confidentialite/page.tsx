import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Politique de Confidentialité | Talentero',
  description: 'Politique de confidentialité et protection des données personnelles de Talentero par TRINEXTA',
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
            Dernière mise à jour : 14 décembre 2024
          </p>

          <div className="prose prose-slate max-w-none">
            <p className="lead text-lg text-gray-700">
              Chez TRINEXTA, nous accordons une importance primordiale à la protection de vos
              données personnelles. Cette politique de confidentialité vous informe sur la
              manière dont nous collectons, utilisons et protégeons vos informations lorsque
              vous utilisez la plateforme Talentero.
            </p>

            <h2>1. Responsable du traitement</h2>
            <p>
              Le responsable du traitement des données personnelles est :
            </p>
            <div className="bg-gray-50 p-6 rounded-lg my-4 not-prose">
              <p className="font-semibold text-lg text-gray-900 mb-3">TRINEXTA by TrusTech IT Support</p>
              <div className="text-sm text-gray-700 space-y-1">
                <p><span className="font-medium">Adresse :</span> 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</p>
                <p><span className="font-medium">Email DPO :</span> <a href="mailto:dpo@trinexta.fr" className="text-primary hover:underline">dpo@trinexta.fr</a></p>
                <p><span className="font-medium">Email général :</span> <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">contact@trinexta.fr</a></p>
                <p><span className="font-medium">Téléphone :</span> 09 78 25 07 46</p>
              </div>
            </div>

            <h2>2. Données collectées</h2>
            <h3>2.1 Données d'identification</h3>
            <ul>
              <li>Nom et prénom</li>
              <li>Adresse email</li>
              <li>Numéro de téléphone</li>
              <li>Photo de profil (optionnelle)</li>
              <li>Nationalité (pour les missions nécessitant des habilitations de sécurité)</li>
            </ul>

            <h3>2.2 Données professionnelles (Talents / Freelances)</h3>
            <ul>
              <li>CV et parcours professionnel</li>
              <li>Compétences techniques et fonctionnelles</li>
              <li>Formations et certifications</li>
              <li>Expériences professionnelles détaillées</li>
              <li>TJM (Taux Journalier Moyen) souhaité</li>
              <li>Disponibilité et préférences de mobilité</li>
              <li>Zones géographiques d'intervention</li>
              <li>Profils LinkedIn, GitHub, Portfolio (optionnels)</li>
            </ul>

            <h3>2.3 Données d'entreprise (Clients et Talents)</h3>
            <ul>
              <li>Raison sociale</li>
              <li>Numéro SIRET/SIREN</li>
              <li>Numéro de TVA intracommunautaire</li>
              <li>Adresse du siège social</li>
              <li>Forme juridique</li>
              <li>Code APE/NAF</li>
            </ul>

            <h3>2.4 Données de connexion et navigation</h3>
            <ul>
              <li>Adresse IP</li>
              <li>Données de navigation (pages visitées, durée des sessions)</li>
              <li>Appareil et navigateur utilisés</li>
              <li>Dates et heures de connexion</li>
            </ul>

            <h2>3. Finalités du traitement</h2>
            <p>Vos données sont collectées pour les finalités suivantes :</p>
            <ul>
              <li><strong>Gestion des comptes :</strong> Création, authentification et administration de votre compte utilisateur</li>
              <li><strong>Mise en relation :</strong> Matching intelligent entre Talents et Clients via notre algorithme IA</li>
              <li><strong>Communication :</strong> Envoi d'alertes, notifications de matching, et informations sur les missions</li>
              <li><strong>Amélioration du service :</strong> Analyse et optimisation de la plateforme et de l'algorithme de matching</li>
              <li><strong>Gestion des candidatures :</strong> Suivi du processus de recrutement (shortlists, entretiens, sélections)</li>
              <li><strong>Conformité légale :</strong> Respect de nos obligations légales et réglementaires (vérification SIRET)</li>
            </ul>

            <h2>4. Base légale du traitement</h2>
            <ul>
              <li><strong>Exécution du contrat :</strong> Pour la gestion de votre compte et la fourniture des services</li>
              <li><strong>Consentement :</strong> Pour les communications marketing et les cookies non essentiels</li>
              <li><strong>Intérêt légitime :</strong> Pour l'amélioration de nos services, la prévention de la fraude et la sécurité</li>
              <li><strong>Obligation légale :</strong> Pour le respect de nos obligations comptables, fiscales et de vérification d'identité</li>
            </ul>

            <h2>5. Destinataires des données</h2>
            <p>Vos données peuvent être partagées avec :</p>
            <ul>
              <li><strong>L'équipe TRINEXTA :</strong> Pour la gestion de la plateforme, le support utilisateur et l'accompagnement dans le recrutement</li>
              <li><strong>Les autres utilisateurs :</strong> Dans le cadre des mises en relation (profils visibles aux clients, CV anonymisés pour sous-traitance)</li>
              <li><strong>Prestataires techniques :</strong>
                <ul>
                  <li>Microsoft Azure (Microsoft Graph pour les emails)</li>
                  <li>OVH (hébergement des serveurs)</li>
                  <li>Anthropic (API Claude pour le matching IA et parsing CV)</li>
                </ul>
              </li>
              <li><strong>API INSEE :</strong> Pour la vérification des numéros SIRET</li>
              <li><strong>Autorités compétentes :</strong> Sur demande légale uniquement</li>
            </ul>
            <p className="font-medium">
              Nous ne vendons jamais vos données à des tiers.
            </p>

            <h2>6. Transferts hors UE</h2>
            <p>
              Certains de nos prestataires (notamment Anthropic pour l'IA) peuvent être situés
              en dehors de l'Union Européenne. Dans ce cas, nous nous assurons que des garanties
              appropriées sont mises en place :
            </p>
            <ul>
              <li>Clauses contractuelles types de la Commission Européenne</li>
              <li>Décisions d'adéquation de la Commission Européenne</li>
              <li>Certification des prestataires (ex: DPF pour les États-Unis)</li>
            </ul>

            <h2>7. Durée de conservation</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Type de données</th>
                    <th className="text-left py-2">Durée de conservation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Compte actif</td>
                    <td className="py-2">Pendant toute la durée d'utilisation du service</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Compte inactif</td>
                    <td className="py-2">3 ans après la dernière connexion</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Candidatures</td>
                    <td className="py-2">2 ans après la fin de la mission ou du processus</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">CV et profils</td>
                    <td className="py-2">Durée du compte + 3 ans</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Données de connexion</td>
                    <td className="py-2">1 an</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">Messages et conversations</td>
                    <td className="py-2">2 ans après la dernière activité</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">Données comptables</td>
                    <td className="py-2">10 ans (obligation légale)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h2>8. Vos droits</h2>
            <p>Conformément au RGPD, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Droit d'accès :</strong> Obtenir une copie de toutes les données que nous détenons sur vous</li>
              <li><strong>Droit de rectification :</strong> Corriger les données inexactes ou incomplètes</li>
              <li><strong>Droit à l'effacement :</strong> Demander la suppression de vos données ("droit à l'oubli")</li>
              <li><strong>Droit à la limitation :</strong> Restreindre temporairement le traitement de vos données</li>
              <li><strong>Droit à la portabilité :</strong> Recevoir vos données dans un format structuré et lisible</li>
              <li><strong>Droit d'opposition :</strong> Vous opposer au traitement de vos données pour motifs légitimes</li>
              <li><strong>Droit de retirer votre consentement :</strong> À tout moment pour les traitements basés sur le consentement</li>
            </ul>
            <p>
              <strong>Pour exercer ces droits :</strong> Contactez notre DPO à{' '}
              <a href="mailto:dpo@trinexta.fr" className="text-primary hover:underline">
                dpo@trinexta.fr
              </a>{' '}
              ou utilisez les fonctionnalités de votre espace personnel.
            </p>
            <p>
              Vous pouvez également introduire une réclamation auprès de la CNIL
              (Commission Nationale de l'Informatique et des Libertés) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.cnil.fr</a>
            </p>

            <h2>9. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
              pour protéger vos données :
            </p>
            <ul>
              <li>Chiffrement des données en transit (HTTPS/TLS 1.3)</li>
              <li>Chiffrement des mots de passe (algorithme bcrypt)</li>
              <li>Authentification par tokens JWT sécurisés</li>
              <li>Contrôle d'accès strict aux données selon les rôles</li>
              <li>Journalisation des accès et actions sensibles</li>
              <li>Mises à jour de sécurité régulières</li>
              <li>Hébergement sécurisé en France (OVH)</li>
              <li>Sauvegardes régulières et plan de reprise d'activité</li>
            </ul>

            <h2>10. Cookies</h2>
            <h3>10.1 Cookies utilisés</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Cookie</th>
                    <th className="text-left py-2 pr-4">Type</th>
                    <th className="text-left py-2">Durée</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-2 pr-4">auth_token</td>
                    <td className="py-2 pr-4">Essentiel (authentification)</td>
                    <td className="py-2">7 jours</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 pr-4">session_id</td>
                    <td className="py-2 pr-4">Essentiel (session)</td>
                    <td className="py-2">Session</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">cookie_consent</td>
                    <td className="py-2 pr-4">Essentiel (préférences)</td>
                    <td className="py-2">1 an</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3>10.2 Gestion des cookies</h3>
            <p>
              Vous pouvez gérer vos préférences de cookies via les paramètres de votre navigateur.
              Notez que la désactivation des cookies essentiels peut affecter le fonctionnement du site.
            </p>

            <h2>11. Intelligence Artificielle</h2>
            <p>
              Talentero utilise l'intelligence artificielle (API Claude d'Anthropic) pour :
            </p>
            <ul>
              <li>Parser automatiquement les CV et extraire les compétences</li>
              <li>Calculer les scores de matching entre talents et offres</li>
              <li>Générer des feedbacks personnalisés (compétences manquantes, TJM)</li>
              <li>Rédiger des communications personnalisées</li>
            </ul>
            <p>
              Ces traitements automatisés n'ont pas d'effet juridique significatif et peuvent
              être contestés auprès de notre équipe. Un humain valide toujours les décisions
              importantes (shortlists, sélections).
            </p>

            <h2>12. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité. Toute modification
              substantielle vous sera notifiée par email ou via une notification sur la plateforme
              au moins 30 jours avant son entrée en vigueur.
            </p>

            <h2>13. Contact</h2>
            <p>
              Pour toute question concernant cette politique ou vos données personnelles :
            </p>
            <ul>
              <li><strong>Email DPO :</strong> <a href="mailto:dpo@trinexta.fr" className="text-primary hover:underline">dpo@trinexta.fr</a></li>
              <li><strong>Email général :</strong> <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">contact@trinexta.fr</a></li>
              <li><strong>Téléphone :</strong> 09 78 25 07 46</li>
              <li><strong>Courrier :</strong> TRINEXTA - DPO - 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</li>
            </ul>

            <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-100 not-prose">
              <p className="font-semibold text-blue-900 mb-2">Résumé de vos droits</p>
              <p className="text-sm text-blue-800">
                Vous avez le contrôle total sur vos données. À tout moment, vous pouvez accéder
                à votre profil pour modifier vos informations, exporter vos données ou supprimer
                votre compte. Pour toute demande particulière, notre DPO est disponible à{' '}
                <a href="mailto:dpo@trinexta.fr" className="text-blue-700 hover:underline font-medium">
                  dpo@trinexta.fr
                </a>.
              </p>
            </div>

            <div className="mt-6 p-6 bg-gray-50 rounded-lg not-prose">
              <p className="font-medium text-gray-900 mb-3">Documents juridiques :</p>
              <ul className="text-sm text-gray-600 space-y-2">
                <li>
                  <Link href="/cgu" className="text-primary hover:underline">
                    Conditions Générales d'Utilisation
                  </Link>
                </li>
                <li>
                  <Link href="/cgv" className="text-primary hover:underline">
                    Conditions Générales de Vente
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
