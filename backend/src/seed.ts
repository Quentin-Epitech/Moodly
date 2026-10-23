/**
 * Seed de démo. Lancer avec `npm run db:seed` (ou `node dist/seed.js` dans Docker).
 * ATTENTION : vide toutes les tables avant de les remplir.
 *
 * Scénario :
 *  - Équipe « Produit » (1 manager + 8 employés, ~70 % de participation) :
 *    moral correct (~3,8), baisse nette de J-15 à J-9 (~2,3) dominée par
 *    « Charge de travail », puis remontée partielle après une action du manager.
 *    Aujourd'hui, seuls 3 employés ont répondu : alice (et d'autres) peuvent saisir en live.
 *    Les tableaux de bord s'arrêtent à hier (journée en cours jamais exposée).
 *  - Équipe « Support » (1 manager + 3 employés, participation faible) :
 *    la plupart des jours sont sous le seuil d'anonymat → masqués.
 *  - Équipe « Ventes » (1 manager + 5 employés) : moral stable et bon, pour la
 *    comparaison dans la vue direction.
 *  - Équipe « Logistique » (1 manager + 6 employés) : chute nette CETTE semaine,
 *    management et sens du travail en cause, aucune action publiée → alerte
 *    active pour la démo (le manager peut publier une action en live).
 *  - « Direction » : un compte RH (vue de toutes les équipes, agrégats uniquement).
 *
 * Les humeurs (note, raisons, réponses au questionnaire) passent par
 * services/moodService.submitMood, exactement comme l'API : Submission et
 * MoodEntry restent séparées. En fin de seed, la purge de rétention supprime les
 * Submission des jours passés, comme le fait l'API toutes les heures.
 *
 * Refusé en production (NODE_ENV=production) sauf si ALLOW_DEMO_SEED=true.
 */
import bcrypt from 'bcrypt';
import { env, isProduction } from './config/env';
import type { AuthUser, Role } from './lib/auth';
import { shiftDateKey, todayKey, weekStartKey, zonedTime } from './lib/dates';
import { prisma } from './lib/prisma';
import { createAction } from './services/actionService';
import { addMessage, createCase, setCaseStatus, type CreateCaseInput } from './services/caseService';
import { proposeMeeting, respondToMeeting } from './services/meetingService';
import { submitMood, type AnswerInput } from './services/moodService';
import { isApplicable, type QuestionKind } from './services/questionService';
import { purgeExpiredData } from './services/retentionService';
import { getTeamMoodReport } from './services/teamStatsService';
import { submitWeekly } from './services/weeklyService';

const PASSWORD = 'password123';
const DAYS = 90;
/** Fenêtre de l'aperçu affiché en fin de seed */
const OVERVIEW_DAYS = 30;
const MAX_TAGS = 3;
const MAX_OPTIONS = 3;
/** Probabilité par défaut de cocher une option d'une question à choix multiples */
const DEFAULT_OPTION_ODDS = 0.25;
/** Part des questions applicables laissées sans réponse */
const SKIP_QUESTION_ODDS = 0.2;

const TAG_LABELS = [
  'Charge de travail',
  "Ambiance d'équipe",
  'Management',
  'Sens du travail',
  'Équilibre vie pro/perso',
  'Conditions matérielles',
] as const;
type TagLabel = (typeof TAG_LABELS)[number];

// ---------------------------------------------------------------------------
// Questionnaire adaptatif
// ---------------------------------------------------------------------------

type QuestionSeed = {
  key: string;
  label: string;
  kind: QuestionKind;
  /** Posée seulement si cette raison est cochée */
  tag?: TagLabel;
  /** Posée seulement si la note est dans [minScore, maxScore] */
  minScore?: number;
  maxScore?: number;
  options: string[];
};

const QUESTIONS: QuestionSeed[] = [
  {
    key: 'since_when',
    label: 'Depuis quand ça ne va pas ?',
    kind: 'single',
    maxScore: 2,
    options: ["Juste aujourd'hui", 'Depuis quelques jours', 'Depuis plusieurs semaines'],
  },
  {
    key: 'workload',
    label: "Côté charge de travail, qu'est-ce qui pèse le plus ?",
    kind: 'multi',
    tag: 'Charge de travail',
    options: [
      'Trop de tâches en parallèle',
      'Délais irréalistes',
      'Trop de réunions',
      "Manque d'effectif",
      'Urgences imprévues',
    ],
  },
  {
    key: 'team',
    label: "Côté ambiance d'équipe ?",
    kind: 'multi',
    tag: "Ambiance d'équipe",
    options: [
      'Tensions ou conflits',
      "Manque d'entraide",
      'Isolement (télétravail)',
      'Communication difficile',
      'Bonne entraide',
    ],
  },
  {
    key: 'management',
    label: 'Côté management ?',
    kind: 'multi',
    tag: 'Management',
    options: [
      'Manque de reconnaissance',
      'Objectifs flous',
      'Micro-management',
      'Peu disponible',
      'Décisions pas expliquées',
      'Bon soutien',
    ],
  },
  {
    key: 'meaning',
    label: 'Côté sens du travail ?',
    kind: 'multi',
    tag: 'Sens du travail',
    options: [
      'Tâches répétitives',
      "Pas d'impact visible",
      'Désaccord avec les priorités',
      "Pas de perspective d'évolution",
      'Fierté du travail accompli',
    ],
  },
  {
    key: 'balance',
    label: 'Côté équilibre vie pro / perso ?',
    kind: 'multi',
    tag: 'Équilibre vie pro/perso',
    options: [
      "Heures sup' fréquentes",
      'Sollicitations hors horaires',
      'Difficile de déconnecter',
      'Horaires rigides',
      'Bon équilibre en ce moment',
    ],
  },
  {
    key: 'conditions',
    label: 'Côté conditions matérielles ?',
    kind: 'multi',
    tag: 'Conditions matérielles',
    options: [
      'Outils ou logiciels lents',
      'Bruit, open space',
      'Poste de travail inconfortable',
      'Télétravail mal équipé',
      'Rien à signaler',
    ],
  },
  {
    key: 'positive',
    label: "Qu'est-ce qui a aidé aujourd'hui ?",
    kind: 'multi',
    minScore: 4,
    options: [
      "Une bonne dynamique d'équipe",
      'Un objectif atteint',
      'De la reconnaissance',
      'Une charge raisonnable',
      "De l'autonomie",
    ],
  },
  {
    key: 'needs',
    label: "Qu'est-ce qui t'aiderait cette semaine ?",
    kind: 'multi',
    options: [
      'Moins de réunions',
      'Des priorités plus claires',
      'Un point avec mon manager',
      "Plus d'autonomie",
      'Du temps pour me former',
      'Rien de particulier',
    ],
  },
];

// ---------------------------------------------------------------------------
// Scénarios
// ---------------------------------------------------------------------------

/**
 * Une phase du scénario : de J-from à J-to inclus, moyenne visée, probabilité de
 * chaque raison, et `answerOdds` par libellé d'option : probabilité pour une
 * question "multi" (défaut 0,25), poids relatif pour une question "single" (défaut 1).
 */
type Phase = {
  from: number;
  to: number;
  mean: number;
  tagOdds: Partial<Record<TagLabel, number>>;
  answerOdds?: Record<string, number>;
};

const CALM_ANSWERS = {
  'Rien de particulier': 0.5,
  'Bonne entraide': 0.5,
  'Fierté du travail accompli': 0.4,
  "Une bonne dynamique d'équipe": 0.5,
  'Un objectif atteint': 0.3,
  'Rien à signaler': 0.4,
  'Bon équilibre en ce moment': 0.4,
  'Bon soutien': 0.4,
};

const PRODUIT_STORY: Phase[] = [
  // Moral correct
  {
    from: 89,
    to: 16,
    mean: 3.8,
    tagOdds: {
      "Ambiance d'équipe": 0.3,
      'Sens du travail': 0.25,
      'Charge de travail': 0.15,
      'Conditions matérielles': 0.1,
    },
    answerOdds: CALM_ANSWERS,
  },
  // Baisse nette : charge de travail très dominante, délais et heures sup'
  {
    from: 15,
    to: 9,
    mean: 2.3,
    tagOdds: { 'Charge de travail': 0.85, 'Équilibre vie pro/perso': 0.4, Management: 0.2 },
    answerOdds: {
      'Délais irréalistes': 0.7,
      'Trop de tâches en parallèle': 0.6,
      'Urgences imprévues': 0.4,
      "Heures sup' fréquentes": 0.6,
      'Difficile de déconnecter': 0.4,
      'Objectifs flous': 0.5,
      'Des priorités plus claires': 0.6,
      'Moins de réunions': 0.35,
      'Un point avec mon manager': 0.3,
      'Depuis quelques jours': 3,
      'Depuis plusieurs semaines': 2,
    },
  },
  // Remontée partielle après l'action du manager
  {
    from: 8,
    to: 1,
    mean: 3.2,
    tagOdds: { 'Charge de travail': 0.4, "Ambiance d'équipe": 0.25, Management: 0.2 },
    answerOdds: {
      'Trop de tâches en parallèle': 0.4,
      'Des priorités plus claires': 0.35,
      'Bon soutien': 0.5,
      'Une charge raisonnable': 0.3,
      'Rien de particulier': 0.3,
    },
  },
  // Aujourd'hui (participation partielle, voir todayParticipants)
  {
    from: 0,
    to: 0,
    mean: 3.6,
    tagOdds: { "Ambiance d'équipe": 0.3, 'Charge de travail': 0.2 },
    answerOdds: CALM_ANSWERS,
  },
];

const SUPPORT_STORY: Phase[] = [
  {
    from: 89,
    to: 1,
    mean: 3.4,
    tagOdds: { 'Charge de travail': 0.3, 'Conditions matérielles': 0.3, "Ambiance d'équipe": 0.2 },
    answerOdds: {
      'Outils ou logiciels lents': 0.5,
      'Bruit, open space': 0.4,
      'Du temps pour me former': 0.3,
      'Rien de particulier': 0.3,
    },
  },
];

const VENTES_STORY: Phase[] = [
  {
    from: 89,
    to: 0,
    mean: 4.0,
    tagOdds: { 'Sens du travail': 0.3, "Ambiance d'équipe": 0.3, Management: 0.15 },
    answerOdds: { ...CALM_ANSWERS, 'De la reconnaissance': 0.3 },
  },
];

const LOGISTIQUE_STORY: Phase[] = [
  {
    from: 89,
    to: 8,
    mean: 3.9,
    tagOdds: { 'Sens du travail': 0.3, "Ambiance d'équipe": 0.25, 'Charge de travail': 0.1 },
    answerOdds: CALM_ANSWERS,
  },
  // Chute en cours : réorganisation mal expliquée
  {
    from: 7,
    to: 0,
    mean: 2.4,
    tagOdds: { Management: 0.7, 'Sens du travail': 0.5, "Ambiance d'équipe": 0.3 },
    answerOdds: {
      'Objectifs flous': 0.6,
      'Décisions pas expliquées': 0.5,
      'Manque de reconnaissance': 0.4,
      'Désaccord avec les priorités': 0.5,
      "Pas d'impact visible": 0.3,
      'Tensions ou conflits': 0.3,
      'Des priorités plus claires': 0.5,
      'Un point avec mon manager': 0.5,
      'Depuis quelques jours': 3,
    },
  },
];

/** Actions publiées par les managers (offset en jours avant aujourd'hui) */
type SeedEvent = { weekday: number; time: string; durationMin: number; location: string };

const ACTIONS: { team: string; daysAgo: number; message: string; event?: SeedEvent }[] = [
  {
    team: 'Produit',
    daysAgo: 8,
    message:
      "Charge de travail : on gèle les nouvelles demandes jusqu'à la fin du sprint et on repriorise ensemble lundi.",
  },
  {
    team: 'Produit',
    daysAgo: 3,
    message: 'Les délais du projet Atlas sont décalés de deux semaines. Merci pour vos retours, ils ont servi.',
  },
  {
    team: 'Produit',
    daysAgo: 1,
    message: "Point d'équipe vendredi : on fait ensemble le bilan d'Atlas et on fixe les priorités du mois.",
    event: { weekday: 5, time: '10:00', durationMin: 45, location: 'Salle Atlas' },
  },
  { team: 'Support', daysAgo: 20, message: "Deuxième écran et casque anti-bruit commandés pour toute l'équipe." },
];

// ---------------------------------------------------------------------------
// Générateurs
// ---------------------------------------------------------------------------

// Générateur pseudo-aléatoire déterministe (mulberry32) : même scénario à chaque seed
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickScore(mean: number, rand: () => number): number {
  const noisy = mean + (rand() - 0.5) * 2.4;
  return Math.min(5, Math.max(1, Math.round(noisy)));
}

function pickTags(odds: Phase['tagOdds'], tagIds: Map<string, number>, rand: () => number): number[] {
  const chosen: number[] = [];
  for (const [label, probability] of Object.entries(odds)) {
    if (rand() < probability) chosen.push(tagIds.get(label)!);
  }
  return chosen.slice(0, MAX_TAGS);
}

type SeededQuestion = {
  id: number;
  kind: QuestionKind;
  tagId: number | null;
  minScore: number | null;
  maxScore: number | null;
  options: { id: number; label: string }[];
};

function weightedPick<T>(items: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let remaining = rand() * total;
  for (let i = 0; i < items.length; i++) {
    remaining -= weights[i];
    if (remaining <= 0) return items[i];
  }
  return items[items.length - 1];
}

function pickAnswers(
  score: number,
  tagIds: number[],
  phase: Phase,
  questions: SeededQuestion[],
  rand: () => number,
): AnswerInput[] {
  const answers: AnswerInput[] = [];
  for (const question of questions) {
    if (!isApplicable(question, score, tagIds)) continue;
    if (rand() < SKIP_QUESTION_ODDS) continue;

    if (question.kind === 'single') {
      const weights = question.options.map((o) => phase.answerOdds?.[o.label] ?? 1);
      answers.push({ questionId: question.id, optionIds: [weightedPick(question.options, weights, rand).id] });
      continue;
    }

    const chosen = question.options
      .filter((o) => rand() < (phase.answerOdds?.[o.label] ?? DEFAULT_OPTION_ODDS))
      .slice(0, MAX_OPTIONS);
    if (chosen.length === 0) {
      const weights = question.options.map((o) => phase.answerOdds?.[o.label] ?? DEFAULT_OPTION_ODDS);
      chosen.push(weightedPick(question.options, weights, rand));
    }
    answers.push({ questionId: question.id, optionIds: chosen.map((o) => o.id) });
  }
  return answers;
}

// ---------------------------------------------------------------------------
// Création des données
// ---------------------------------------------------------------------------

type SeededTeam = Awaited<ReturnType<typeof createTeam>>;

async function createTeam(
  name: string,
  leadEmail: string,
  leadRole: Role,
  employeeNames: string[],
  passwordHash: string,
) {
  const employee: Role = 'EMPLOYEE';
  const team = await prisma.team.create({
    data: {
      name,
      users: {
        create: [
          { email: leadEmail, passwordHash, role: leadRole },
          ...employeeNames.map((n) => ({ email: `${n}@moodly.app`, passwordHash, role: employee })),
        ],
      },
    },
    include: { users: { orderBy: { id: 'asc' } } },
  });
  const [lead, ...employees] = team.users;
  return { team, lead, employees };
}

async function createQuestions(tagIds: Map<string, number>): Promise<SeededQuestion[]> {
  const created: SeededQuestion[] = [];
  for (const [order, seed] of QUESTIONS.entries()) {
    const question = await prisma.question.create({
      data: {
        key: seed.key,
        label: seed.label,
        kind: seed.kind,
        tagId: seed.tag ? tagIds.get(seed.tag)! : null,
        minScore: seed.minScore ?? null,
        maxScore: seed.maxScore ?? null,
        order,
        options: { create: seed.options.map((label, i) => ({ label, order: i })) },
      },
      include: { options: { orderBy: { order: 'asc' }, select: { id: true, label: true } } },
    });
    created.push({
      id: question.id,
      kind: seed.kind,
      tagId: question.tagId,
      minScore: question.minScore,
      maxScore: question.maxScore,
      options: question.options,
    });
  }
  return created;
}

// ---------------------------------------------------------------------------
// Bilans hebdomadaires : 12 semaines closes + la semaine en cours (partielle)
// ---------------------------------------------------------------------------

const WEEKS = 12;

type WeekProfile = { score: number; workload: number; stress: number; participation: number };

/** Profil d'une équipe selon l'ancienneté de la semaine (0 = semaine en cours) */
const WEEKLY_PROFILES: Record<string, (weeksAgo: number) => WeekProfile> = {
  // Surcharge pendant la chute (il y a 1 à 2 semaines), puis retour progressif
  Produit: (w) =>
    w === 2
      ? { score: 2.3, workload: 4.6, stress: 4.2, participation: 0.85 }
      : w === 1
        ? { score: 3, workload: 3.7, stress: 3.5, participation: 0.8 }
        : { score: 3.8, workload: 3, stress: 2.6, participation: 0.8 },
  Support: () => ({ score: 3.4, workload: 3.4, stress: 2.8, participation: 0.5 }),
  Ventes: () => ({ score: 4, workload: 3, stress: 2.3, participation: 0.75 }),
  // Stress qui explose la semaine dernière (réorganisation)
  Logistique: (w) =>
    w <= 1
      ? { score: 2.4, workload: 3.9, stress: 4.3, participation: 0.85 }
      : { score: 3.9, workload: 2.9, stress: 2.4, participation: 0.8 },
};

const clampScale = (value: number) => Math.min(5, Math.max(1, Math.round(value)));

async function seedWeekly(
  { team, employees }: SeededTeam,
  rand: () => number,
  today: string,
  /** Index des employés laissés libres pour faire leur bilan en démo */
  freeThisWeek: number[],
): Promise<number> {
  const profile = WEEKLY_PROFILES[team.name];
  const thisWeek = weekStartKey(today);
  let created = 0;
  for (let weeksAgo = WEEKS; weeksAgo >= 0; weeksAgo--) {
    const week = shiftDateKey(thisWeek, -7 * weeksAgo);
    const p = profile(weeksAgo);
    for (const [index, user] of employees.entries()) {
      if (weeksAgo === 0 && freeThisWeek.includes(index)) continue;
      if (rand() >= p.participation) continue;
      const noise = () => (rand() - 0.5) * 2;
      await submitWeekly({
        userId: user.id,
        teamId: team.id,
        week,
        score: clampScale(p.score + noise()),
        workload: clampScale(p.workload + noise()),
        stress: clampScale(p.stress + noise()),
      });
      created++;
    }
  }
  return created;
}

// ---------------------------------------------------------------------------
// Demandes & signalements (passent par caseService, comme l'API)
// ---------------------------------------------------------------------------

const asUser = (user: { id: number; role: string; teamId: number }): AuthUser => ({
  id: user.id,
  role: user.role as Role,
  teamId: user.teamId,
  mustChangePassword: false,
});

// Étale une demande de démo sur les derniers jours : création il y a `daysAgo` jours,
// réponses aux jours donnés, heures rondes (comme pour une demande anonyme).
/** Prochain jour de la semaine donné (1 = lundi … 5 = vendredi), à partir de demain */
function nextWeekday(today: string, weekday: number): string {
  for (let offset = 1; offset <= 7; offset++) {
    const key = shiftDateKey(today, offset);
    const [y, m, d] = key.split('-').map(Number);
    if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === weekday) return key;
  }
  return shiftDateKey(today, 7);
}

async function backdateCase(id: number, today: string, daysAgo: number, replyDaysAgo: number[], resolved: boolean) {
  const at = (days: number, hour: number) =>
    new Date(`${shiftDateKey(today, -days)}T${String(hour).padStart(2, '0')}:00:00.000Z`);
  const times = [at(daysAgo, 8), ...replyDaysAgo.map((days) => at(days, 13))];
  const messages = await prisma.caseMessage.findMany({
    where: { caseId: id },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  for (const [index, message] of messages.entries()) {
    await prisma.caseMessage.update({ where: { id: message.id }, data: { createdAt: times[index] } });
  }
  const created = times[0];
  const last = times[times.length - 1];
  await prisma.case.update({
    where: { id },
    data: {
      createdAt: created,
      lastMessageAt: last,
      // Une réponse reçue reste « non lue » pour le demandeur, sauf si la demande est close
      requesterReadAt: resolved ? last : created,
      handlerReadAt: replyDaysAgo.length > 0 ? last : null,
      resolvedAt: resolved ? last : null,
    },
  });
}

async function seedCases(
  teams: Record<'produit' | 'logistique' | 'ventes' | 'direction', SeededTeam>,
  today: string,
): Promise<number> {
  const { produit, logistique, ventes, direction } = teams;
  const hr = asUser(direction.lead);
  const scenarios: {
    author: SeededTeam['employees'][number];
    input: CreateCaseInput;
    daysAgo: number;
    replies?: { by: AuthUser; body: string; daysAgo: number }[];
    /** Rendez-vous proposé par le destinataire après sa réponse, accepté ou en attente */
    meeting?: SeedEvent & { accepted: boolean };
    status?: 'RESOLVED';
  }[] = [
    {
      author: produit.employees[1], // bob
      input: {
        type: 'ACTION_REQUEST',
        category: 'Alléger ma charge',
        subject: 'Trop de sujets en parallèle depuis Atlas',
        message:
          "Je suis sur Atlas, le reporting mensuel et le support client en même temps. Est-ce qu'on peut retirer un des trois ?",
        anonymous: false,
      },
      daysAgo: 4,
      replies: [
        {
          by: asUser(produit.lead),
          body: "Merci de l'avoir dit. Je retire le reporting de ta liste dès cette semaine, on en reparle jeudi.",
          daysAgo: 3,
        },
      ],
      meeting: { weekday: 4, time: '14:00', durationMin: 30, location: 'Bureau du manager', accepted: true },
    },
    {
      author: produit.employees[4], // emma
      input: {
        type: 'COLLEAGUE_ISSUE',
        category: 'Tension ou conflit',
        subject: 'Réunions du lundi très tendues',
        message:
          "Les réunions du lundi tournent régulièrement au conflit entre deux personnes de l'équipe, ça pèse sur tout le monde.",
        anonymous: true,
      },
      daysAgo: 2,
    },
    {
      author: logistique.employees[1], // rania
      input: {
        type: 'MANAGER_ISSUE',
        category: 'Communication difficile',
        subject: 'Réorganisation jamais expliquée',
        message:
          'Depuis la réorganisation, les décisions tombent sans explication et nos questions restent sans réponse.',
        anonymous: false,
      },
      // Restée sans réponse : signalée aux RH comme « à traiter »
      daysAgo: 9,
    },
    {
      author: logistique.employees[2], // samir
      input: {
        type: 'CONTACT',
        category: 'Évolution professionnelle',
        subject: 'Point sur mon évolution',
        message: "J'aimerais faire un point sur mes possibilités d'évolution, la réorganisation change mon poste.",
        recipient: 'HR',
        anonymous: false,
      },
      daysAgo: 6,
      replies: [
        { by: hr, body: 'Bien sûr, je vous propose un échange mardi à 10 h. Cela vous convient ?', daysAgo: 5 },
      ],
      meeting: { weekday: 2, time: '10:00', durationMin: 45, location: 'Bureau RH, 2e étage', accepted: false },
    },
    {
      author: ventes.employees[0], // lea
      input: {
        type: 'CONTACT',
        category: 'Point individuel',
        subject: 'Objectifs du trimestre',
        message: 'Est-ce que nous pouvons revoir ensemble mes objectifs du trimestre ?',
        recipient: 'MANAGER',
        anonymous: false,
      },
      daysAgo: 12,
      replies: [{ by: asUser(ventes.lead), body: "C'est fait, merci pour l'échange de ce matin.", daysAgo: 10 }],
      status: 'RESOLVED',
    },
  ];

  for (const scenario of scenarios) {
    const { case: created } = await createCase(asUser(scenario.author), scenario.input);
    for (const reply of scenario.replies ?? []) await addMessage(reply.by, created.id, reply.body);
    if (scenario.status) {
      const handler = scenario.input.recipient === 'HR' ? hr : asUser(scenario.replies?.[0]?.by ?? hr);
      await setCaseStatus(handler, created.id, scenario.status);
    }
    const replyDays = (scenario.replies ?? []).map((reply) => reply.daysAgo);
    await backdateCase(created.id, today, scenario.daysAgo, replyDays, scenario.status === 'RESOLVED');

    if (scenario.meeting) {
      // Proposé juste après la réponse du destinataire, accepté deux heures plus tard
      const answeredAt = new Date(`${shiftDateKey(today, -(replyDays.at(-1) ?? scenario.daysAgo))}T13:05:00.000Z`);
      const handler = scenario.replies?.[0]?.by ?? hr;
      const startsAt = zonedTime(nextWeekday(today, scenario.meeting.weekday), scenario.meeting.time);
      const { durationMin, location } = scenario.meeting;
      const detail = await proposeMeeting(handler, created.id, { startsAt, durationMin, location }, answeredAt);
      if (scenario.meeting.accepted) {
        const meetingId = detail.messages.at(-1)!.meeting!.id;
        await respondToMeeting(
          asUser(scenario.author),
          meetingId,
          'ACCEPT',
          new Date(answeredAt.getTime() + 2 * 3600_000),
        );
      }
    }
  }
  return scenarios.length;
}

type StoryOptions = {
  participation: number;
  /** Index des employés qui ont déjà répondu aujourd'hui (les autres restent libres pour la démo) */
  todayParticipants: number[];
};

async function seedStory(
  { team, employees }: SeededTeam,
  story: Phase[],
  tagIds: Map<string, number>,
  questions: SeededQuestion[],
  rand: () => number,
  options: StoryOptions,
  today: string,
): Promise<number> {
  let created = 0;
  for (let offset = DAYS - 1; offset >= 0; offset--) {
    const phase = story.find((p) => offset <= p.from && offset >= p.to);
    if (!phase) continue;

    const date = shiftDateKey(today, -offset);
    for (const [index, user] of employees.entries()) {
      const participates = offset === 0 ? options.todayParticipants.includes(index) : rand() < options.participation;
      if (!participates) continue;

      const score = pickScore(phase.mean, rand);
      const chosenTags = pickTags(phase.tagOdds, tagIds, rand);
      await submitMood({
        userId: user.id,
        teamId: team.id,
        date,
        score,
        tagIds: chosenTags,
        answers: pickAnswers(score, chosenTags, phase, questions, rand),
      });
      created++;
    }
  }
  return created;
}

async function main() {
  if (isProduction && !env.ALLOW_DEMO_SEED) {
    console.error('Seed de démo refusé en production : il vide toute la base. ALLOW_DEMO_SEED=true pour forcer.');
    process.exitCode = 1;
    return;
  }

  const today = todayKey();
  const rand = mulberry32(20261012);

  // Remise à zéro (ordre imposé par les clés étrangères)
  await prisma.caseMessage.deleteMany();
  await prisma.caseMeeting.deleteMany();
  await prisma.case.deleteMany();
  await prisma.weeklyCheckin.deleteMany();
  await prisma.weeklySubmission.deleteMany();
  await prisma.moodEntryAnswer.deleteMany();
  await prisma.moodEntryTag.deleteMany();
  await prisma.moodEntry.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.teamAction.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.team.deleteMany();

  const tagIds = new Map<string, number>();
  for (const label of TAG_LABELS) {
    const tag = await prisma.tag.create({ data: { label } });
    tagIds.set(label, tag.id);
  }
  const questions = await createQuestions(tagIds);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const produit = await createTeam(
    'Produit',
    'manager.produit@moodly.app',
    'MANAGER',
    ['alice', 'bob', 'chloe', 'david', 'emma', 'farid', 'gaelle', 'hugo'],
    passwordHash,
  );
  const support = await createTeam(
    'Support',
    'manager.support@moodly.app',
    'MANAGER',
    ['ines', 'jules', 'karim'],
    passwordHash,
  );
  const ventes = await createTeam(
    'Ventes',
    'manager.ventes@moodly.app',
    'MANAGER',
    ['lea', 'marc', 'nadia', 'omar', 'paula'],
    passwordHash,
  );
  const logistique = await createTeam(
    'Logistique',
    'manager.logistique@moodly.app',
    'MANAGER',
    ['quentin', 'rania', 'samir', 'tania', 'ugo', 'victor'],
    passwordHash,
  );
  const direction = await createTeam('Direction', 'rh@moodly.app', 'HR', [], passwordHash);

  // Aujourd'hui : bob, chloe et david ont répondu ; alice & co restent libres pour la démo
  const counts = {
    Produit: await seedStory(
      produit,
      PRODUIT_STORY,
      tagIds,
      questions,
      rand,
      { participation: 0.7, todayParticipants: [1, 2, 3] },
      today,
    ),
    Support: await seedStory(
      support,
      SUPPORT_STORY,
      tagIds,
      questions,
      rand,
      { participation: 0.5, todayParticipants: [] },
      today,
    ),
    Ventes: await seedStory(
      ventes,
      VENTES_STORY,
      tagIds,
      questions,
      rand,
      { participation: 0.6, todayParticipants: [0, 1, 2] },
      today,
    ),
    Logistique: await seedStory(
      logistique,
      LOGISTIQUE_STORY,
      tagIds,
      questions,
      rand,
      { participation: 0.75, todayParticipants: [0, 1, 2, 3] },
      today,
    ),
  };

  const weeklyCounts = {
    // alice reste libre pour faire son bilan en démo
    Produit: await seedWeekly(produit, rand, today, [0]),
    Support: await seedWeekly(support, rand, today, []),
    Ventes: await seedWeekly(ventes, rand, today, []),
    Logistique: await seedWeekly(logistique, rand, today, []),
  };
  const caseCount = await seedCases({ produit, logistique, ventes, direction }, today);
  console.log(
    `Bilans hebdomadaires : ${Object.values(weeklyCounts).reduce((a, b) => a + b, 0)} · demandes : ${caseCount}`,
  );

  const teamsByName = new Map([
    ['Produit', produit.team.id],
    ['Support', support.team.id],
    ['Ventes', ventes.team.id],
    ['Logistique', logistique.team.id],
  ]);
  for (const action of ACTIONS) {
    const createdAt = new Date(`${shiftDateKey(today, -action.daysAgo)}T09:00:00.000Z`);
    const event = action.event && {
      startsAt: zonedTime(nextWeekday(today, action.event.weekday), action.event.time),
      durationMin: action.event.durationMin,
      location: action.event.location,
    };
    await createAction(teamsByName.get(action.team)!, action.message, { createdAt, event });
  }

  console.log(
    `Seed terminé (${Object.entries(counts)
      .map(([name, n]) => `${n} réponses ${name}`)
      .join(', ')}, ${ACTIONS.length} actions).\n`,
  );
  const purged = await purgeExpiredData(today);
  console.log(`Purge de rétention : ${purged.submissions} Submission des jours passés supprimées.\n`);

  console.log(`Comptes de test (mot de passe commun : ${PASSWORD})`);
  for (const { lead, employees } of [produit, support, ventes, logistique, direction]) {
    console.log(`  ${lead.role.padEnd(9)} ${lead.email}`);
    for (const user of employees) console.log(`  ${user.role.padEnd(9)} ${user.email}`);
  }

  console.log(`\nAperçu manager sur ${OVERVIEW_DAYS} jours clos (jusqu'à hier) :`);
  for (const { team } of [produit, support, ventes, logistique]) {
    const report = await getTeamMoodReport(team.id, OVERVIEW_DAYS, today);
    const visible = report.days.filter((d) => !d.hidden).length;
    const { avg7, trend, alert } = report.summary;
    console.log(
      `  ${team.name.padEnd(8)} ${visible} visibles, ${OVERVIEW_DAYS - visible} masqués · moyenne 7 j ${avg7 ?? '—'} (${trend ?? '—'}) · alerte : ${alert.level}`,
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
