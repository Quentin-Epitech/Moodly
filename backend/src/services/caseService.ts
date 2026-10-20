import { createHash, randomInt } from 'node:crypto';
import { z } from 'zod';
import type { AuthUser } from '../lib/auth';
import { badRequest, forbidden, notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';

// Demandes & signalements : le canal NOMINATIF (sauf option anonyme) entre un
// employé et son manager ou les RH. Rien ici n'est relié aux humeurs ni aux bilans.

export const caseTypeSchema = z.enum(['ACTION_REQUEST', 'COLLEAGUE_ISSUE', 'MANAGER_ISSUE', 'CONTACT']);
export type CaseType = z.infer<typeof caseTypeSchema>;
export const recipientSchema = z.enum(['MANAGER', 'HR']);
export type Recipient = z.infer<typeof recipientSchema>;
export const caseStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']);
export type CaseStatus = z.infer<typeof caseStatusSchema>;
export type Side = 'REQUESTER' | 'HANDLER';

type CaseTypeConfig = {
  label: string;
  description: string;
  /** Destinataire imposé, ou au choix du demandeur */
  recipient: Recipient | 'CHOICE';
  anonymousAllowed: boolean;
  categories: string[];
};

/** Règles de routage (exposées à l'app par GET /cases/types) */
export const CASE_TYPES: Record<CaseType, CaseTypeConfig> = {
  ACTION_REQUEST: {
    label: "Demande d'action",
    description: 'Demander à votre manager un changement concret : charge, priorités, délais, outils…',
    recipient: 'MANAGER',
    anonymousAllowed: false,
    categories: [
      'Alléger ma charge',
      'Clarifier mes priorités',
      'Revoir des délais',
      'Formation',
      'Matériel ou outils',
      'Autre',
    ],
  },
  COLLEAGUE_ISSUE: {
    label: 'Problème avec un collègue',
    description: 'Signaler une difficulté avec un ou une collègue. Traité par votre manager.',
    recipient: 'MANAGER',
    anonymousAllowed: true,
    categories: [
      'Tension ou conflit',
      'Communication difficile',
      'Répartition du travail',
      'Comportement inapproprié',
      'Autre',
    ],
  },
  MANAGER_ISSUE: {
    label: 'Problème avec mon manager',
    description: 'Signaler une difficulté avec votre manager. Traité par les RH, jamais montré à votre manager.',
    recipient: 'HR',
    anonymousAllowed: true,
    categories: [
      'Charge ou objectifs imposés',
      'Manque de reconnaissance',
      'Communication difficile',
      'Comportement inapproprié',
      'Autre',
    ],
  },
  CONTACT: {
    label: 'Échanger avec quelqu’un',
    description: 'Demander un échange avec votre manager ou avec les RH.',
    recipient: 'CHOICE',
    anonymousAllowed: false,
    categories: ['Point individuel', 'Question', 'Évolution professionnelle', 'Autre'],
  },
};

const RECIPIENT_LABELS: Record<Recipient, string> = { MANAGER: "Manager de l'équipe", HR: 'Ressources humaines' };

export const createCaseSchema = z.object({
  type: caseTypeSchema,
  category: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(3, 'Objet trop court').max(120, '120 caractères maximum'),
  message: z
    .string()
    .trim()
    .min(10, 'Message trop court (10 caractères minimum)')
    .max(2000, '2 000 caractères maximum'),
  anonymous: z.boolean().default(false),
  /** Seulement pour CONTACT */
  recipient: recipientSchema.optional(),
});
export type CreateCaseInput = z.infer<typeof createCaseSchema>;

export const messageSchema = z.object({
  body: z.string().trim().min(1, 'Message vide').max(2000, '2 000 caractères maximum'),
});

export const meetingStatusSchema = z.enum(['PROPOSED', 'ACCEPTED', 'DECLINED', 'CANCELLED']);
export type MeetingStatus = z.infer<typeof meetingStatusSchema>;
export type MessageKind = 'TEXT' | 'MEETING_PROPOSED' | 'MEETING_ACCEPTED' | 'MEETING_DECLINED' | 'MEETING_CANCELLED';

export type MeetingDto = {
  id: number;
  /** ISO 8601 (UTC) */
  startsAt: string;
  durationMin: number;
  location: string;
  status: MeetingStatus;
  proposedBy: Side;
  /** L'autre côté peut accepter ou refuser une proposition à venir */
  canRespond: boolean;
  /** Le proposant peut retirer sa proposition ; chacun peut annuler un rendez-vous accepté */
  canCancel: boolean;
};

export type CaseMessageDto = {
  id: number;
  sender: Side;
  kind: MessageKind;
  /** Rendez-vous, dans son état actuel, pour un message MEETING_PROPOSED */
  meeting: MeetingDto | null;
  /** « Vous », « Demandeur anonyme », email du demandeur (vu par le manager / RH) ou du manager / RH */
  authorLabel: string;
  mine: boolean;
  body: string;
  createdAt: string;
};

export type CaseSummary = {
  id: number;
  type: CaseType;
  typeLabel: string;
  category: string;
  subject: string;
  recipient: Recipient;
  recipientLabel: string;
  status: CaseStatus;
  anonymous: boolean;
  teamName: string;
  /** Email du demandeur, seulement pour qui traite une demande nominative */
  requester: string | null;
  viewer: Side;
  unread: boolean;
  createdAt: string;
  lastMessageAt: string;
};

export type CaseDetail = CaseSummary & { messages: CaseMessageDto[] };

// ---------------------------------------------------------------------------
// Code de suivi des demandes anonymes : affiché une fois, seule l'empreinte est stockée
// ---------------------------------------------------------------------------

const TOKEN_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAccessToken(): string {
  const raw = Array.from({ length: 20 }, () => TOKEN_ALPHABET[randomInt(TOKEN_ALPHABET.length)]).join('');
  return raw.match(/.{4}/g)!.join('-');
}

function normalizeToken(token: string): string {
  return token.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function hashAccessToken(token: string): string {
  return createHash('sha256').update(normalizeToken(token)).digest('hex');
}

/** Une demande anonyme ne garde qu'une heure approximative : pas de recoupement à la minute près. */
function anonymousTimestamp(now = new Date()): Date {
  const rounded = new Date(now);
  rounded.setUTCMinutes(0, 0, 0);
  return rounded;
}

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

type CaseRow = NonNullable<Awaited<ReturnType<typeof loadCase>>>;

function loadCase(id: number) {
  return prisma.case.findUnique({
    where: { id },
    include: {
      team: { select: { name: true } },
      author: { select: { email: true } },
      messages: {
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: { handler: { select: { email: true, role: true } }, meeting: true },
      },
    },
  });
}

/** Qui traite une demande : les managers de l'équipe, ou les RH. Un manager ne voit jamais une demande adressée aux RH. */
function isHandler(user: AuthUser, row: { recipient: string; teamId: number }): boolean {
  if (row.recipient === 'MANAGER') return user.role === 'MANAGER' && user.teamId === row.teamId;
  if (row.recipient === 'HR') return user.role === 'HR';
  return false;
}

function sideOf(user: AuthUser, row: CaseRow, token?: string): Side | null {
  if (token && row.accessTokenHash && hashAccessToken(token) === row.accessTokenHash) return 'REQUESTER';
  if (!row.anonymous && row.authorId === user.id) return 'REQUESTER';
  if (isHandler(user, row)) return 'HANDLER';
  return null;
}

/** 404 aussi quand l'accès est refusé : on ne révèle pas l'existence d'une demande. */
export async function loadAccessible(user: AuthUser, id: number, token?: string) {
  const row = await loadCase(id);
  const side = row ? sideOf(user, row, token) : null;
  if (!row || !side) throw notFound('Demande introuvable');
  return { row, side };
}

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

function isUnread(
  row: { lastMessageAt: Date; requesterReadAt: Date | null; handlerReadAt: Date | null },
  lastSender: string | undefined,
  side: Side,
) {
  if (!lastSender || lastSender === side) return false;
  const readAt = side === 'REQUESTER' ? row.requesterReadAt : row.handlerReadAt;
  return readAt === null || row.lastMessageAt > readAt;
}

function toSummary(
  row: {
    id: number;
    type: string;
    category: string;
    subject: string;
    recipient: string;
    status: string;
    anonymous: boolean;
    createdAt: Date;
    lastMessageAt: Date;
    requesterReadAt: Date | null;
    handlerReadAt: Date | null;
    team: { name: string };
    author: { email: string } | null;
  },
  side: Side,
  lastSender: string | undefined,
): CaseSummary {
  const type = caseTypeSchema.parse(row.type);
  const recipient = recipientSchema.parse(row.recipient);
  return {
    id: row.id,
    type,
    typeLabel: CASE_TYPES[type].label,
    category: row.category,
    subject: row.subject,
    recipient,
    recipientLabel: RECIPIENT_LABELS[recipient],
    status: caseStatusSchema.parse(row.status),
    anonymous: row.anonymous,
    teamName: row.team.name,
    requester: side === 'HANDLER' && !row.anonymous ? (row.author?.email ?? 'Compte supprimé') : null,
    viewer: side,
    unread: isUnread(row, lastSender, side),
    createdAt: row.createdAt.toISOString(),
    lastMessageAt: row.lastMessageAt.toISOString(),
  };
}

export function toMeetingDto(
  meeting: {
    id: number;
    startsAt: Date;
    durationMin: number;
    location: string;
    status: string;
    proposedBy: string;
  },
  side: Side,
  now: Date = new Date(),
): MeetingDto {
  const status = meetingStatusSchema.parse(meeting.status);
  const upcoming = meeting.startsAt > now;
  const proposedBy = meeting.proposedBy as Side;
  return {
    id: meeting.id,
    startsAt: meeting.startsAt.toISOString(),
    durationMin: meeting.durationMin,
    location: meeting.location,
    status,
    proposedBy,
    canRespond: upcoming && status === 'PROPOSED' && proposedBy !== side,
    canCancel: upcoming && ((status === 'PROPOSED' && proposedBy === side) || status === 'ACCEPTED'),
  };
}

function toDetail(row: CaseRow, side: Side, user: AuthUser): CaseDetail {
  const roleLabel = (role: string) => (role === 'HR' ? 'RH' : 'Manager');
  return {
    ...toSummary(row, side, row.messages.at(-1)?.sender),
    messages: row.messages.map((message) => {
      const mine = side === message.sender && (message.sender === 'REQUESTER' || message.handlerId === user.id);
      let authorLabel: string;
      if (mine) authorLabel = 'Vous';
      else if (message.sender === 'REQUESTER')
        authorLabel = row.anonymous ? 'Demandeur anonyme' : (row.author?.email ?? 'Compte supprimé');
      else
        authorLabel = message.handler
          ? `${roleLabel(message.handler.role)} · ${message.handler.email}`
          : 'Compte supprimé';
      return {
        id: message.id,
        sender: message.sender as Side,
        kind: message.kind as MessageKind,
        meeting: message.kind === 'MEETING_PROPOSED' && message.meeting ? toMeetingDto(message.meeting, side) : null,
        authorLabel,
        mine,
        body: message.body,
        createdAt: message.createdAt.toISOString(),
      };
    }),
  };
}

const summaryInclude = {
  team: { select: { name: true } },
  author: { select: { email: true } },
  messages: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 1, select: { sender: true } },
};

// ---------------------------------------------------------------------------
// Cas d'usage
// ---------------------------------------------------------------------------

export function listCaseTypes() {
  return (Object.keys(CASE_TYPES) as CaseType[]).map((type) => ({ type, ...CASE_TYPES[type] }));
}

export async function createCase(
  user: AuthUser,
  input: CreateCaseInput,
): Promise<{ case: CaseDetail; accessToken: string | null }> {
  const config = CASE_TYPES[input.type];
  if (!config.categories.includes(input.category)) throw badRequest('Catégorie inconnue pour ce type de demande');
  if (input.anonymous && !config.anonymousAllowed) throw badRequest('Ce type de demande ne peut pas être anonyme');

  let recipient: Recipient;
  if (config.recipient === 'CHOICE') {
    if (!input.recipient) throw badRequest('Choisissez à qui adresser la demande (MANAGER ou HR)');
    recipient = input.recipient;
  } else {
    recipient = config.recipient;
  }

  const accessToken = input.anonymous ? generateAccessToken() : null;
  const at = input.anonymous ? anonymousTimestamp() : new Date();

  const created = await prisma.case.create({
    data: {
      type: input.type,
      category: input.category,
      subject: input.subject,
      recipient,
      teamId: user.teamId,
      anonymous: input.anonymous,
      authorId: input.anonymous ? null : user.id,
      accessTokenHash: accessToken ? hashAccessToken(accessToken) : null,
      requesterReadAt: at,
      lastMessageAt: at,
      createdAt: at,
      messages: { create: { sender: 'REQUESTER', body: input.message, createdAt: at } },
    },
  });

  const { row } = await loadAccessible(user, created.id, accessToken ?? undefined);
  return { case: toDetail(row, 'REQUESTER', user), accessToken };
}

/** Demandes listées pour un utilisateur : les siennes (nominatives) ou celles qu'il traite */
export function listedCasesWhere(user: AuthUser) {
  if (user.role === 'EMPLOYEE') return { authorId: user.id, anonymous: false };
  if (user.role === 'MANAGER') return { recipient: 'MANAGER', teamId: user.teamId };
  return { recipient: 'HR' };
}

/** Employé : ses demandes nominatives. Manager / RH : les demandes qu'ils traitent. */
export async function listCases(user: AuthUser): Promise<CaseSummary[]> {
  const side: Side = user.role === 'EMPLOYEE' ? 'REQUESTER' : 'HANDLER';
  const rows = await prisma.case.findMany({
    where: listedCasesWhere(user),
    include: summaryInclude,
    orderBy: { lastMessageAt: 'desc' },
  });
  return rows.map((row) => toSummary(row, side, row.messages[0]?.sender));
}

/** Demandes anonymes retrouvées par leur code de suivi (gardé sur l'appareil du demandeur). */
export async function lookupAnonymousCases(tokens: string[]): Promise<Array<CaseSummary & { token: string }>> {
  const byHash = new Map(tokens.map((token) => [hashAccessToken(token), token]));
  const rows = await prisma.case.findMany({
    where: { accessTokenHash: { in: [...byHash.keys()] } },
    include: summaryInclude,
    orderBy: { lastMessageAt: 'desc' },
  });
  return rows.map((row) => ({
    ...toSummary(row, 'REQUESTER', row.messages[0]?.sender),
    token: byHash.get(row.accessTokenHash!)!,
  }));
}

export async function unreadCount(user: AuthUser): Promise<number> {
  return (await listCases(user)).filter((summary) => summary.unread).length;
}

/** Ouvre une demande et la marque comme lue du côté de celui qui la consulte. */
export async function getCase(user: AuthUser, id: number, token?: string): Promise<CaseDetail> {
  const { row, side } = await loadAccessible(user, id, token);
  const now = row.anonymous ? anonymousTimestamp() : new Date();
  await prisma.case.update({
    where: { id },
    data:
      side === 'REQUESTER'
        ? { requesterReadAt: now > row.lastMessageAt ? now : row.lastMessageAt }
        : { handlerReadAt: new Date() },
  });
  return toDetail(row, side, user);
}

export async function addMessage(user: AuthUser, id: number, body: string, token?: string): Promise<CaseDetail> {
  const { row, side } = await loadAccessible(user, id, token);
  // Demandeur anonyme : heure arrondie, mais toujours après le message précédent (ordre du fil)
  const at =
    row.anonymous && side === 'REQUESTER'
      ? new Date(Math.max(anonymousTimestamp().getTime(), row.lastMessageAt.getTime() + 1000))
      : new Date();
  const lastMessageAt = at > row.lastMessageAt ? at : row.lastMessageAt;

  // Une réponse fait avancer la demande : prise en charge côté traitement, réouverture côté demandeur
  let status = row.status;
  if (side === 'HANDLER' && status === 'OPEN') status = 'IN_PROGRESS';
  if (side === 'REQUESTER' && status === 'RESOLVED') status = 'IN_PROGRESS';

  await prisma.case.update({
    where: { id },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' ? row.resolvedAt : null,
      lastMessageAt,
      ...(side === 'REQUESTER' ? { requesterReadAt: lastMessageAt } : { handlerReadAt: lastMessageAt }),
      messages: { create: { sender: side, handlerId: side === 'HANDLER' ? user.id : null, body, createdAt: at } },
    },
  });
  return getCase(user, id, token);
}

export async function setCaseStatus(user: AuthUser, id: number, status: CaseStatus): Promise<CaseDetail> {
  const { side } = await loadAccessible(user, id);
  if (side !== 'HANDLER') throw forbidden('Seul le destinataire peut changer le statut');
  await prisma.case.update({
    where: { id },
    data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null },
  });
  return getCase(user, id);
}
