import type { AuthUser } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { listedCasesWhere, toMeetingDto, type MeetingDto } from './caseService';

// « Prochains rendez-vous » : les rendez-vous des demandes de l'utilisateur et les
// rendez-vous de son équipe. Rien de personnel n'est déduit des humeurs.

export type AgendaMeeting = MeetingDto & {
  kind: 'MEETING';
  caseId: number;
  subject: string;
  /** Avec qui : « Ressources humaines », « Manager de l'équipe » ou l'email du demandeur */
  withLabel: string;
  recipient: 'MANAGER' | 'HR';
  viewer: 'REQUESTER' | 'HANDLER';
};

export type AgendaTeamEvent = {
  kind: 'TEAM_EVENT';
  id: number;
  title: string;
  teamName: string;
  startsAt: string;
  durationMin: number;
  location: string;
};

export type AgendaItem = AgendaMeeting | AgendaTeamEvent;

const LIMIT = 20;
/** Un rendez-vous reste affiché jusqu'à sa fin (les plus longs durent 90 min) */
const LOOKBACK_MS = 90 * 60 * 1000;

const endsAfter = (startsAt: Date, durationMin: number, now: Date) =>
  startsAt.getTime() + durationMin * 60_000 > now.getTime();

export async function getAgenda(user: AuthUser, now: Date = new Date()): Promise<AgendaItem[]> {
  const since = new Date(now.getTime() - LOOKBACK_MS);
  const side = user.role === 'EMPLOYEE' ? 'REQUESTER' : 'HANDLER';

  const meetings = await prisma.caseMeeting.findMany({
    where: { status: { in: ['PROPOSED', 'ACCEPTED'] }, startsAt: { gte: since }, case: listedCasesWhere(user) },
    include: { case: { select: { id: true, subject: true, recipient: true, author: { select: { email: true } } } } },
  });

  const events =
    user.role === 'HR'
      ? []
      : await prisma.teamAction.findMany({
          where: { teamId: user.teamId, eventAt: { gte: since } },
          include: { team: { select: { name: true } } },
        });

  const items: AgendaItem[] = [
    ...meetings
      .filter((meeting) => endsAfter(meeting.startsAt, meeting.durationMin, now))
      .map((meeting): AgendaMeeting => ({
        ...toMeetingDto(meeting, side, now),
        kind: 'MEETING',
        caseId: meeting.case.id,
        subject: meeting.case.subject,
        recipient: meeting.case.recipient === 'HR' ? 'HR' : 'MANAGER',
        viewer: side,
        withLabel:
          side === 'REQUESTER'
            ? meeting.case.recipient === 'HR'
              ? 'Ressources humaines'
              : "Manager de l'équipe"
            : (meeting.case.author?.email ?? 'Compte supprimé'),
      })),
    ...events
      .filter((event) => event.eventAt && event.durationMin && event.location)
      .filter((event) => endsAfter(event.eventAt!, event.durationMin!, now))
      .map((event): AgendaTeamEvent => ({
        kind: 'TEAM_EVENT',
        id: event.id,
        title: event.message,
        teamName: event.team.name,
        startsAt: event.eventAt!.toISOString(),
        durationMin: event.durationMin!,
        location: event.location!,
      })),
  ];

  return items.sort((a, b) => a.startsAt.localeCompare(b.startsAt)).slice(0, LIMIT);
}
