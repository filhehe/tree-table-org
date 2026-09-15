import { z } from 'zod';
import type { NumericFilter, OrgNode, OrgPatch, StructuredFilter } from '@/domain/types';

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

const compareOpSchema = z.enum(['lt', 'gt', 'eq']);

const numericFilterSchema = z
  .object({
    op: compareOpSchema,
    value: z.number().finite(),
  })
  .strict();

function isGtLtPair(a: NumericFilter, b: NumericFilter) {
  return (a.op === 'gt' && b.op === 'lt') || (a.op === 'lt' && b.op === 'gt');
}

function numericConstraintSchema(validate: (value: number) => boolean, error: string) {
  const bound = numericFilterSchema.refine((filter) => validate(filter.value), { error });
  return z
    .union([
      bound,
      z
        .array(bound)
        .length(2)
        .refine((pair) => isGtLtPair(pair[0]!, pair[1]!), {
          error: 'range must combine gt and lt',
        }),
    ])
    .optional();
}

export const structuredFilterSchema = z
  .object({
    text: z.string().optional(),
    level: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional(),
    performance: numericConstraintSchema(
      (value) => value >= 0 && value <= 100,
      'performance must be 0…100',
    ),
    budget: numericConstraintSchema(
      (value) => Number.isInteger(value) && value >= 0,
      'budget must be a nonnegative integer',
    ),
    headcount: numericConstraintSchema(
      (value) => Number.isInteger(value) && value >= 0,
      'headcount must be a nonnegative integer',
    ),
  })
  .strict();

export function parseStructuredFilter(input: unknown): StructuredFilter | null {
  const result = structuredFilterSchema.safeParse(input);
  return result.success ? result.data : null;
}
