import { notFound } from '../lib/errors';
import { prisma } from '../lib/prisma';
import { assertBookable, type SlotInput } from './meetingService';

export type TeamEventDto = {
  /** ISO 8601 (UTC) */
  startsAt: string;
  durationMin: number;
  location: string;
};

export type TeamActionDto = {
  id: number;
  message: string;
  /** ISO 8601 */
  createdAt: string;
  /** Rendez-vous d'équipe associé (« point jeudi 14 h »), que chacun peut ajouter à son agenda */
  event: TeamEventDto | null;
};

const LIST_LIMIT = 20;

type ActionRow = {
  id: number;
  message: string;
  createdAt: Date;
  eventAt: Date | null;
  durationMin: number | null;
  location: string | null;
};

export function toActionDto(action: ActionRow): TeamActionDto {
  return {
    id: action.id,
    message: action.message,
    createdAt: action.createdAt.toISOString(),
    event:
      action.eventAt && action.durationMin && action.location
        ? { startsAt: action.eventAt.toISOString(), durationMin: action.durationMin, location: action.location }
        : null,
  };
}

/** Les actions d'une équipe, de la plus récente à la plus ancienne */
export async function listActions(teamId: number): Promise<TeamActionDto[]> {
  const actions = await prisma.teamAction.findMany({
    where: { teamId },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
  });
  return actions.map(toActionDto);
}

export async function createAction(
  teamId: number,
  message: string,
  options: { createdAt?: Date; event?: SlotInput } = {},
): Promise<TeamActionDto> {
  const { createdAt, event } = options;
  if (event) assertBookable(event.startsAt, createdAt ?? new Date());
  const action = await prisma.teamAction.create({
    data: {
      teamId,
      message,
      createdAt,
      eventAt: event?.startsAt,
      durationMin: event?.durationMin,
      location: event?.location,
    },
  });
  return toActionDto(action);
}

/** Supprime une action, uniquement si elle appartient à l'équipe donnée */
export async function deleteAction(teamId: number, id: number): Promise<void> {
  const deleted = await prisma.teamAction.deleteMany({ where: { id, teamId } });
  if (deleted.count === 0) throw notFound('Action introuvable');
}
