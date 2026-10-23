import { env } from '../config/env';
import { shiftDateKey, todayKey, weekStartKey } from '../lib/dates';
import { prisma } from '../lib/prisma';

export type PurgeResult = {
  submissions: number;
  moodEntries: number;
  actions: number;
  weeklySubmissions: number;
  weeklyCheckins: number;
  cases: number;
};

/**
 * Minimisation des données (RGPD) :
 *  - Submission (qui a répondu quel jour) ne sert qu'à bloquer une deuxième
 *    saisie le jour même : les lignes des jours passés sont supprimées. Il ne
 *    reste donc aucun historique de participation par personne.
 *  - Les réponses anonymes et les actions d'équipe sont conservées
 *    DATA_RETENTION_DAYS jours (13 mois par défaut), puis supprimées.
 *  - Même chose pour les bilans hebdomadaires (WeeklySubmission purgées dès la
 *    semaine passée).
 *  - Les demandes résolues sont supprimées CASE_RETENTION_DAYS jours (1 an) après
 *    leur résolution, avec leurs messages.
 */
export async function purgeExpiredData(today = todayKey(), now = new Date()): Promise<PurgeResult> {
  const oldestKept = shiftDateKey(today, -env.DATA_RETENTION_DAYS);

  const submissions = await prisma.submission.deleteMany({ where: { date: { lt: today } } });
  // Les tags et réponses détaillées suivent (onDelete: Cascade)
  const moodEntries = await prisma.moodEntry.deleteMany({ where: { date: { lt: oldestKept } } });
  const actions = await prisma.teamAction.deleteMany({
    where: { createdAt: { lt: new Date(`${oldestKept}T00:00:00.000Z`) } },
  });

  const weeklySubmissions = await prisma.weeklySubmission.deleteMany({ where: { week: { lt: weekStartKey(today) } } });
  const weeklyCheckins = await prisma.weeklyCheckin.deleteMany({ where: { week: { lt: oldestKept } } });
  const cases = await prisma.case.deleteMany({
    where: {
      status: 'RESOLVED',
      resolvedAt: { lt: new Date(now.getTime() - env.CASE_RETENTION_DAYS * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    submissions: submissions.count,
    moodEntries: moodEntries.count,
    actions: actions.count,
    weeklySubmissions: weeklySubmissions.count,
    weeklyCheckins: weeklyCheckins.count,
    cases: cases.count,
  };
}
