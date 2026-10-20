import { z } from 'zod';
import type { AuthUser } from '../lib/auth';
import { formatMeetingDate } from '../lib/dates';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { getCase, loadAccessible, type CaseDetail, type MessageKind, type Side } from './caseService';

// Rendez-vous dans une demande : l'un propose un créneau, l'autre accepte ou refuse.
// Uniquement pour les demandes nominatives : se rencontrer révélerait l'auteur d'un
// signalement anonyme. Chacun ajoute ensuite le rendez-vous à son agenda depuis l'app
// (fichier .ics généré sur l'appareil, rien n'est envoyé à un service d'agenda).

export const MEETING_DURATIONS = [15, 30, 45, 60, 90] as const;
/** Un rendez-vous se propose au plus tôt dans 5 minutes, au plus tard dans 4 mois */
const MIN_NOTICE_MS = 5 * 60 * 1000;
const MAX_AHEAD_DAYS = 120;

/** Créneau : début, durée, lieu. Partagé avec les rendez-vous d'équipe (actions datées). */
export const slotSchema = z.object({
  startsAt: z.coerce.date(),
  durationMin: z
    .number()
    .int()
    .refine(
      (value) => (MEETING_DURATIONS as readonly number[]).includes(value),
      'Durée : 15, 30, 45, 60 ou 90 minutes',
    ),
  location: z.string().trim().min(2, 'Indiquez un lieu (ou « Visio »)').max(80, '80 caractères maximum'),
});
export type SlotInput = z.infer<typeof slotSchema>;

export const meetingResponseSchema = z.object({ response: z.enum(['ACCEPT', 'DECLINE']) });

/** Refuse un créneau passé ou trop lointain */
export function assertBookable(startsAt: Date, now: Date = new Date()): void {
  if (startsAt.getTime() < now.getTime() + MIN_NOTICE_MS) throw badRequest('Choisissez un créneau à venir');
  if (startsAt.getTime() > now.getTime() + MAX_AHEAD_DAYS * 24 * 3600 * 1000) {
    throw badRequest(`Choisissez un créneau dans les ${MAX_AHEAD_DAYS} prochains jours`);
  }
}

function slotText(meeting: { startsAt: Date; durationMin: number; location: string }): string {
  return `${formatMeetingDate(meeting.startsAt)} (${meeting.durationMin} min) · ${meeting.location}`;
}

const BODIES: Record<Exclude<MessageKind, 'TEXT'>, string> = {
  MEETING_PROPOSED: 'Rendez-vous proposé',
  MEETING_ACCEPTED: 'Rendez-vous accepté',
  MEETING_DECLINED: 'Rendez-vous refusé',
  MEETING_CANCELLED: 'Rendez-vous annulé',
};

/** Trace dans le fil (comme un message : pastille « non lu » chez l'autre, ordre chronologique) */
async function recordEvent(
  caseRow: { id: number; status: string; lastMessageAt: Date },
  user: AuthUser,
  side: Side,
  kind: Exclude<MessageKind, 'TEXT'>,
  meeting: { id: number; startsAt: Date; durationMin: number; location: string },
  now: Date,
) {
  const at = now > caseRow.lastMessageAt ? now : new Date(caseRow.lastMessageAt.getTime() + 1000);
  // Proposer un rendez-vous fait avancer la demande, comme une réponse
  let status = caseRow.status;
  if (side === 'HANDLER' && status === 'OPEN') status = 'IN_PROGRESS';
  await prisma.case.update({
    where: { id: caseRow.id },
    data: {
      status,
      lastMessageAt: at,
      ...(side === 'REQUESTER' ? { requesterReadAt: at } : { handlerReadAt: at }),
      messages: {
        create: {
          sender: side,
          handlerId: side === 'HANDLER' ? user.id : null,
          kind,
          meetingId: meeting.id,
          body: `${BODIES[kind]} : ${slotText(meeting)}`,
          createdAt: at,
        },
      },
    },
  });
}

/** Propose un créneau. Une proposition encore en attente sur la même demande est remplacée. */
export async function proposeMeeting(
  user: AuthUser,
  caseId: number,
  slot: SlotInput,
  now: Date = new Date(),
): Promise<CaseDetail> {
  const { row, side } = await loadAccessible(user, caseId);
  if (row.anonymous) {
    throw badRequest("Pas de rendez-vous pour une demande anonyme : il révélerait l'identité du demandeur");
  }
  assertBookable(slot.startsAt, now);

  await prisma.caseMeeting.updateMany({
    where: { caseId, status: 'PROPOSED' },
    data: { status: 'CANCELLED', respondedAt: now },
  });
  const meeting = await prisma.caseMeeting.create({
    data: { caseId, proposedBy: side, ...slot, createdAt: now },
  });
  await recordEvent(row, user, side, 'MEETING_PROPOSED', meeting, now);
  return getCase(user, caseId);
}

async function loadMeeting(user: AuthUser, meetingId: number) {
  const meeting = await prisma.caseMeeting.findUnique({ where: { id: meetingId } });
  if (!meeting) throw notFound('Rendez-vous introuvable');
  // Même règle d'accès que la demande (404 sinon)
  const { row, side } = await loadAccessible(user, meeting.caseId);
  return { meeting, row, side };
}

/** Accepte ou refuse une proposition de l'autre côté */
export async function respondToMeeting(
  user: AuthUser,
  meetingId: number,
  response: 'ACCEPT' | 'DECLINE',
  now: Date = new Date(),
): Promise<CaseDetail> {
  const { meeting, row, side } = await loadMeeting(user, meetingId);
  if (meeting.proposedBy === side) throw forbidden("C'est à l'autre personne de répondre à votre proposition");
  if (meeting.status !== 'PROPOSED') throw conflict('Cette proposition a déjà reçu une réponse');
  if (meeting.startsAt <= now) throw conflict('Ce créneau est passé : proposez-en un autre');

  const status = response === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
  await prisma.caseMeeting.update({ where: { id: meetingId }, data: { status, respondedAt: now } });
  await recordEvent(row, user, side, response === 'ACCEPT' ? 'MEETING_ACCEPTED' : 'MEETING_DECLINED', meeting, now);
  return getCase(user, row.id);
}

/** Retire sa proposition, ou annule un rendez-vous accepté (des deux côtés) */
export async function cancelMeeting(user: AuthUser, meetingId: number, now: Date = new Date()): Promise<CaseDetail> {
  const { meeting, row, side } = await loadMeeting(user, meetingId);
  const cancellable = (meeting.status === 'PROPOSED' && meeting.proposedBy === side) || meeting.status === 'ACCEPTED';
  if (!cancellable) throw conflict('Ce rendez-vous ne peut plus être annulé');
  if (meeting.startsAt <= now) throw conflict('Ce rendez-vous est passé');

  await prisma.caseMeeting.update({ where: { id: meetingId }, data: { status: 'CANCELLED', respondedAt: now } });
  await recordEvent(row, user, side, 'MEETING_CANCELLED', meeting, now);
  return getCase(user, row.id);
}
