import { z } from 'zod';
import type { OrgNode, OrgPatch } from '@/domain/types';

const isoDatetime = z.iso.datetime({
  offset: true,
  error: 'updatedAt must be an ISO-8601 datetime',
});

export const orgNodeSchema: z.ZodType<OrgNode> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  headcount: z.number().int().nonnegative(),
  budget: z.number().int().nonnegative(),
  performance: z.number().min(0).max(100),
  updatedAt: isoDatetime,
});

export const orgTreeSchema = z.array(orgNodeSchema);

export const orgPatchSchema = z
  .object({
    id: z.string().min(1),
    headcount: z.number().int().nonnegative().optional(),
    budget: z.number().int().nonnegative().optional(),
    performance: z.number().min(0).max(100).optional(),
    updatedAt: isoDatetime,
  })
  .strip()
  .refine(
    (patch) =>
      patch.headcount !== undefined ||
      patch.budget !== undefined ||
      patch.performance !== undefined,
    { error: 'patch must include headcount, budget, or performance' },
  );

export function parseOrgTree(input: unknown): OrgNode[] {
  const result = orgTreeSchema.safeParse(input);

  if (!result.success) {
    const summary = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Невалидный ответ API: ${summary}`);
  }
  return result.data;
}

export function parseOrgPatch(input: unknown): OrgPatch | null {
  const result = orgPatchSchema.safeParse(input);
  return result.success ? result.data : null;
}
