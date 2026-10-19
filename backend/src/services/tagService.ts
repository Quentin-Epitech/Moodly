import { prisma } from '../lib/prisma';

export type TagDto = { id: number; label: string };

export function listTags(): Promise<TagDto[]> {
  return prisma.tag.findMany({ select: { id: true, label: true }, orderBy: { id: 'asc' } });
}
