// Contenu de la page « Conseils ». Texte d'information générale : il ne remplace
// ni un avis médical ni l'accompagnement des RH. À relire avec les RH / la
// médecine du travail de l'entreprise avant un déploiement réel.

export type AdviceSection = {
  title: string;
  intro: string;
  tips: string[];
  /** Raccourci vers une demande, proposé aux employés */
  action?: { label: string; type: 'ACTION_REQUEST' | 'COLLEAGUE_ISSUE' | 'MANAGER_ISSUE' | 'CONTACT' };
};

export const ADVICE: AdviceSection[] = [
  {
    title: 'Gérer sa charge',
    intro: 'Une charge trop lourde se règle mieux tôt que tard, et rarement seul.',
    tips: [
      "Listez ce qui est en cours et classez-le : urgent et important d'abord, le reste peut attendre ou être délégué.",
      "Quand une nouvelle demande arrive, demandez ce qu'elle remplace plutôt que de l'ajouter.",
      'Découpez les gros sujets en étapes courtes : le progrès devient visible.',
      'Signalez la surcharge dès qu’elle dure plus d’une ou deux semaines, avec des faits (sujets, délais).',
    ],
    action: { label: 'Demander à alléger ma charge', type: 'ACTION_REQUEST' },
  },
  {
    title: 'Le stress',
    intro: 'Un peu de stress aide à se mobiliser ; quand il s’installe, il épuise.',
    tips: [
      'Repérez les signaux : sommeil perturbé, irritabilité, fatigue qui ne passe pas avec le repos, difficulté à se concentrer.',
      'Faites de vraies pauses, loin de l’écran, et quelques minutes de respiration lente quand la tension monte.',
      'Bougez : une marche de vingt minutes suffit souvent à faire redescendre la pression.',
      "Si le stress dure plusieurs semaines, parlez-en à votre médecin ou à la médecine du travail : c'est leur rôle.",
    ],
  },
  {
    title: 'Se déconnecter',
    intro: 'Le droit à la déconnexion existe : le temps de repos n’est pas du temps de travail en attente.',
    tips: [
      'Coupez les notifications professionnelles en dehors de vos horaires.',
      "Fixez une heure de fin de journée et annoncez-la, ça aide les autres à s'organiser.",
      'Un message reçu le soir peut attendre le lendemain, sauf urgence convenue à l’avance.',
    ],
  },
  {
    title: 'Une difficulté avec un collègue',
    intro: 'La plupart des tensions se règlent par une discussion bien préparée.',
    tips: [
      'Quand c’est possible, parlez-en directement et au calme : les faits, ce que vous avez ressenti, ce dont vous avez besoin.',
      'Évitez les reproches généraux (« tu fais toujours… ») : un exemple précis est plus utile.',
      "Si la discussion n'est pas possible ou ne change rien, votre manager peut aider : vous pouvez le lui signaler, y compris anonymement.",
    ],
    action: { label: 'Signaler un problème avec un collègue', type: 'COLLEAGUE_ISSUE' },
  },
  {
    title: 'Une difficulté avec son manager',
    intro: 'Un désaccord avec son manager est courant ; il ne doit pas devenir une souffrance.',
    tips: [
      'Préparez un échange : ce qui pose problème, des exemples, ce qui vous aiderait.',
      'Demandez des objectifs et des priorités écrits quand ils changent souvent.',
      "Si l'échange n'est pas possible, les RH peuvent intervenir : votre signalement ne sera jamais montré à votre manager.",
    ],
    action: { label: 'Signaler aux RH', type: 'MANAGER_ISSUE' },
  },
  {
    title: 'Qui contacter',
    intro: 'Vous n’êtes pas seul ou seule face à une situation difficile.',
    tips: [
      'Votre manager, pour la charge, les priorités et le fonctionnement de l’équipe.',
      'Les RH, pour une difficulté avec votre manager, votre évolution, ou toute question sensible.',
      'La médecine du travail (service de prévention et de santé au travail), en toute confidentialité.',
      'Les représentants du personnel (CSE) et le référent harcèlement de votre entreprise.',
      "En cas d'urgence : le 15 (SAMU) ou le 112. En cas de détresse ou d'idées suicidaires : le 3114, gratuit, 24 h/24.",
    ],
    action: { label: 'Demander un échange', type: 'CONTACT' },
  },
];
