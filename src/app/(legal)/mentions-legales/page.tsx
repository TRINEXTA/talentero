import { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Mentions Légales | Talentero',
  description: 'Mentions légales de la plateforme Talentero, opérée par TRINEXTA by TrusTech IT Support',
}

export default function MentionsLegalesPage() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Mentions Légales
          </h1>

          <div className="prose prose-slate max-w-none">
            <h2>1. Éditeur du site</h2>
            <p>
              Le site <strong>talentero.fr</strong> est édité par :
            </p>
            <div className="bg-gray-50 p-6 rounded-lg my-4 not-prose">
              <p className="font-semibold text-lg text-gray-900 mb-3">TRINEXTA by TrusTech IT Support</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
                <p><span className="font-medium">Forme juridique :</span> Société par actions simplifiée (SAS)</p>
                <p><span className="font-medium">Capital social :</span> 300 €</p>
                <p><span className="font-medium">Siège social :</span> 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</p>
                <p><span className="font-medium">SIRET :</span> 942 020 082 00015</p>
                <p><span className="font-medium">Code NAF/APE :</span> 6202A - Conseil en systèmes et logiciels informatiques</p>
                <p><span className="font-medium">N° TVA Intracommunautaire :</span> FR81942020082</p>
              </div>
            </div>
            <p>
              <strong>Directeur de la publication :</strong> Le représentant légal de la société<br />
              <strong>Email :</strong> <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">contact@trinexta.fr</a><br />
              <strong>Téléphone :</strong> 09 78 25 07 46
            </p>

            <h2>2. Hébergement</h2>
            <p>Le site est hébergé par :</p>
            <div className="bg-gray-50 p-6 rounded-lg my-4 not-prose">
              <p className="font-semibold text-gray-900 mb-2">OVH SAS</p>
              <div className="text-sm text-gray-700 space-y-1">
                <p>2 rue Kellermann</p>
                <p>59100 Roubaix - France</p>
                <p>Téléphone : 1007</p>
                <p>Site web : <a href="https://www.ovhcloud.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">www.ovhcloud.com</a></p>
              </div>
            </div>

            <h2>3. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu de ce site (textes, images, vidéos, logos, graphismes,
              code source, base de données) est la propriété exclusive de TRINEXTA ou de
              ses partenaires et est protégé par les lois françaises et internationales
              relatives à la propriété intellectuelle.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication, adaptation
              de tout ou partie des éléments du site, quel que soit le moyen ou le procédé
              utilisé, est interdite, sauf autorisation écrite préalable de TRINEXTA.
            </p>
            <p>
              Le nom "Talentero", le logo et l'ensemble des marques utilisées sur ce site
              sont des marques déposées. Toute utilisation non autorisée est interdite.
            </p>

            <h2>4. Données personnelles</h2>
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD) et
              à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de
              rectification, de suppression et de portabilité de vos données personnelles.
            </p>
            <p>
              Pour plus d'informations sur la gestion de vos données, consultez notre{' '}
              <Link href="/politique-confidentialite" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>.
            </p>
            <p>
              <strong>Délégué à la Protection des Données (DPO) :</strong><br />
              Email : <a href="mailto:dpo@trinexta.fr" className="text-primary hover:underline">dpo@trinexta.fr</a>
            </p>

            <h2>5. Cookies</h2>
            <p>
              Le site utilise des cookies pour améliorer l'expérience utilisateur.
              En naviguant sur le site, vous acceptez l'utilisation de cookies
              conformément à notre{' '}
              <Link href="/politique-confidentialite" className="text-primary hover:underline">
                Politique de Confidentialité
              </Link>.
            </p>
            <p>Types de cookies utilisés :</p>
            <ul>
              <li><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site</li>
              <li><strong>Cookies d'authentification :</strong> Pour maintenir votre session</li>
              <li><strong>Cookies analytiques :</strong> Pour comprendre l'utilisation du site</li>
            </ul>

            <h2>6. Limitation de responsabilité</h2>
            <p>
              TRINEXTA s'efforce d'assurer l'exactitude et la mise à jour des informations
              diffusées sur ce site. Toutefois, TRINEXTA ne peut garantir l'exactitude,
              la précision ou l'exhaustivité des informations mises à disposition.
            </p>
            <p>
              TRINEXTA décline toute responsabilité :
            </p>
            <ul>
              <li>Pour toute imprécision, inexactitude ou omission portant sur des informations disponibles sur le site</li>
              <li>Pour tous dommages résultant d'une intrusion frauduleuse d'un tiers</li>
              <li>Pour tout contenu publié par les utilisateurs de la plateforme</li>
            </ul>

            <h2>7. Liens hypertextes</h2>
            <p>
              Le site peut contenir des liens vers d'autres sites. TRINEXTA n'exerce
              aucun contrôle sur ces sites et n'assume aucune responsabilité quant
              à leur contenu.
            </p>

            <h2>8. Droit applicable</h2>
            <p>
              Les présentes mentions légales sont régies par le droit français.
              Tout litige relatif à l'utilisation du site sera soumis à la compétence
              exclusive des tribunaux français du ressort du siège social de TRINEXTA.
            </p>

            <h2>9. Contact</h2>
            <p>
              Pour toute question concernant le site ou ces mentions légales,
              vous pouvez nous contacter :
            </p>
            <ul>
              <li>Par email : <a href="mailto:contact@trinexta.fr" className="text-primary hover:underline">contact@trinexta.fr</a></li>
              <li>Par téléphone : 09 78 25 07 46</li>
              <li>Par courrier : TRINEXTA - 74B Boulevard Henri Dunant, 91100 Corbeil-Essonnes</li>
            </ul>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg not-prose">
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
                  <Link href="/politique-confidentialite" className="text-primary hover:underline">
                    Politique de Confidentialité
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
