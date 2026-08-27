import type { LegalTranslations } from '../types';

const legal: LegalTranslations = {
    title: 'Mentions légales',
    lastUpdatedLabel: 'Dernière mise à jour',
    lastUpdatedDate: '2026-03-26',

    eulaTitle: 'Contrat de licence utilisateur final (EULA)',
    tosTitle: "Conditions d'utilisation",
    dmcaTitle: "Avis Droits d'auteur / DMCA",

    sections: {
        scopeAndAcceptance: {
            heading: "Acceptation et champ d'application",
            body: [
                "Les présentes conditions (y compris l’EULA, les Conditions d’utilisation et l’Avis Droits d’auteur/DMCA) régissent votre utilisation d’Al-Baseera IPTV Player (l’« Application »). En téléchargeant, installant, accédant à ou utilisant l’Application, vous acceptez d’être lié par ces conditions.",
                "Si vous n’acceptez pas, n’utilisez pas l’Application.",
            ],
        },
        noContentProvided: {
            heading: 'Aucun contenu fourni ou hébergé',
            body: [
                "L’Application est uniquement un lecteur multimédia. L’Application n’inclut pas, ne fournit pas, ne vend pas, ne concède pas de licence, ne distribue pas et ne diffuse aucun contenu, chaîne ou liste de lecture par défaut.",
                "Les développeurs n’hébergent aucun fichier média, liste de lecture, chaîne ou flux, et n’exploitent aucun service IPTV.",
            ],
        },
        userProvidedContent: {
            heading: 'Contenu fourni par l’utilisateur uniquement',
            body: [
                "Pour utiliser l’Application, vous devez fournir vos propres sources de contenu, telles que des listes M3U, des identifiants Xtream Codes ou des URL de flux directes, provenant de serveurs que vous contrôlez ou auxquels vous êtes autorisé à accéder.",
                "Vous déclarez et garantissez disposer de tous les droits, licences et autorisations nécessaires pour accéder à tout contenu chargé dans l’Application et l’utiliser.",
            ],
        },
        userResponsibility: {
            heading: 'Responsabilité de l’utilisateur (légalité et droits d’auteur)',
            body: [
                "Vous êtes seul et entièrement (100 %) responsable de la légalité du contenu auquel vous accédez, que vous diffusez ou affichez via l’Application, y compris du respect des lois sur le droit d’auteur et droits voisins applicables dans votre juridiction.",
                "Vous acceptez de ne pas utiliser l’Application pour accéder à du contenu contrefaisant, non autorisé ou illégal, ni pour en faciliter l’accès.",
            ],
        },
        noAffiliation: {
            heading: 'Aucune affiliation ni approbation',
            body: [
                "Les développeurs ne vendent pas, n’approuvent pas, ne sponsorisent pas et ne sont affiliés à aucun fournisseur IPTV ni service média tiers.",
                "Toute référence à des tiers est faite à des fins de compatibilité ou de description et n’implique aucune association ni approbation.",
            ],
        },
        prohibitedUses: {
            heading: 'Usages interdits',
            body: [
                "Vous ne devez pas utiliser l’Application pour enfreindre une loi ou un règlement, y compris les lois sur le droit d’auteur.",
                "Vous ne devez pas téléverser, partager, promouvoir ou faire la publicité de listes de lecture ou flux contrefaisants via l’Application.",
                "Vous ne devez pas tenter de contourner, désactiver ou interférer avec la sécurité, les contrôles d’accès, le DRM, les restrictions géographiques ou les restrictions réseau applicables à un contenu ou service.",
                "Vous ne devez pas rétro‑concevoir, décompiler ou tenter d’extraire le code source de l’Application, sauf dans la mesure permise par la loi.",
            ],
        },
        thirdPartyServices: {
            heading: 'Services et liens tiers',
            body: [
                "L’Application peut vous permettre de vous connecter à des serveurs ou services tiers que vous choisissez de configurer. Ces tiers ne sont pas contrôlés par les développeurs et peuvent avoir leurs propres conditions et politiques de confidentialité.",
                "Les développeurs ne sont pas responsables du contenu tiers, de sa disponibilité, de sa qualité, de sa légalité, ni des dommages résultant de votre utilisation de services tiers.",
            ],
        },
        termination: {
            heading: 'Résiliation',
            body: [
                "Votre droit d’utiliser l’Application peut être suspendu ou résilié si vous violez ces conditions ou si la loi l’exige.",
                "En cas de résiliation, vous devez cesser d’utiliser l’Application. Les dispositions destinées à survivre (notamment les exclusions de garanties, limitation de responsabilité, indemnisation et droit applicable) survivront.",
            ],
        },
        disclaimers: {
            heading: 'Exclusions de garanties',
            body: [
                'L’APPLICATION EST FOURNIE « EN L’ÉTAT » ET « SELON DISPONIBILITÉ », SANS GARANTIE D’AUCUNE SORTE, EXPRESSE, IMPLICITE OU LÉGALE, Y COMPRIS LES GARANTIES IMPLICITES DE QUALITÉ MARCHANDE, D’ADÉQUATION À UN USAGE PARTICULIER ET DE NON‑CONTREFAÇON.',
                "Les développeurs ne garantissent pas que l’Application sera ininterrompue, exempte d’erreurs, sécurisée ou compatible avec tous les appareils ou sources de contenu.",
            ],
        },
        limitationOfLiability: {
            heading: 'Limitation de responsabilité',
            body: [
                "DANS LA MESURE MAXIMALE PERMISE PAR LA LOI, LES DÉVELOPPEURS NE SERONT PAS RESPONSABLES DES DOMMAGES INDIRECTS, ACCESSOIRES, SPÉCIAUX, CONSÉCUTIFS, EXEMPLAIRES OU PUNITIFS, NI DE TOUTE PERTE DE PROFITS, REVENUS, DONNÉES OU CLIENTÈLE, DÉCOULANT DE OU LIÉE À VOTRE UTILISATION DE L’APPLICATION.",
                "Dans la mesure où la responsabilité ne peut être exclue, la responsabilité totale des développeurs sera limitée au montant que vous avez payé pour l’Application (le cas échéant) au cours des douze (12) mois précédant l’événement à l’origine de la réclamation.",
            ],
        },
        indemnification: {
            heading: 'Indemnisation',
            body: [
                "Vous acceptez de défendre, d’indemniser et de dégager de toute responsabilité les développeurs contre toute réclamation, dommage, responsabilité, perte et dépense (y compris des frais d’avocat raisonnables) résultant de ou liée à vos sources de contenu, votre utilisation de l’Application, ou votre violation de ces conditions ou de toute loi.",
            ],
        },
        dmcaNotice: {
            heading: "Avis Droits d’auteur / DMCA (aucun hébergement)",
            body: [
                "Les développeurs n’hébergent, ne stockent, ne transmettent ni ne distribuent aucun contenu média. L’Application ne fait que lire le contenu fourni et contrôlé par l’utilisateur ou par des serveurs tiers configurés par l’utilisateur.",
                "Si vous estimez qu’un contenu accessible via l’Application porte atteinte à des droits d’auteur, vous devez adresser votre plainte à l’hébergeur ou à l’opérateur du serveur qui stocke ou transmet le contenu, et non aux développeurs de l’Application.",
            ],
        },
        dmcaHowToSubmit: {
            heading: 'Soumettre une notification de droit d’auteur',
            body: [
                "Si vous devez malgré tout contacter les développeurs au sujet d’une préoccupation relative au droit d’auteur, envoyez une notification à l’adresse email ci‑dessous en incluant : (a) l’identification de l’œuvre protégée ; (b) l’identification du contenu prétendument contrefaisant (avec suffisamment d’informations pour le localiser, y compris le serveur/URL) ; (c) vos coordonnées ; (d) une déclaration de bonne foi ; et (e) une déclaration sous peine de parjure que la notification est exacte et que vous êtes le titulaire des droits ou autorisé à agir en son nom.",
            ],
        },
        governingLaw: {
            heading: 'Droit applicable et juridiction',
            body: [
                "Les présentes conditions sont régies par les lois de l’État du Delaware, États‑Unis, sans égard aux règles de conflit de lois.",
                "Vous acceptez que tout litige découlant de ou lié à l’Application ou aux présentes conditions soit porté devant les tribunaux étatiques ou fédéraux situés dans le Delaware, et vous consentez à leur compétence.",
            ],
        },
        contact: {
            heading: 'Contact',
            body: [
                'Pour les demandes légales (y compris les notifications de droit d’auteur), contactez :',
                'Email : layalsaeb60@gmail.com',
            ],
        },
    },
};

export default legal;

