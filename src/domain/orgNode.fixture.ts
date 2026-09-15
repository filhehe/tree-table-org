import type { OrgNode } from '@/domain/types';

export const UPDATED_AT = '2026-09-15T12:00:00.000Z';

export function orgNode(
  id: string,
  name: string,
  fields: Partial<Omit<OrgNode, 'id' | 'name'>> = {},
): OrgNode {
  return {
    id,
    name,
    parentId: fields.parentId ?? null,
    headcount: fields.headcount ?? 0,
    budget: fields.budget ?? 0,
    performance: fields.performance ?? 0,
    updatedAt: fields.updatedAt ?? UPDATED_AT,
  };
}
