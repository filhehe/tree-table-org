import { z } from "zod";
import type { OrgNode } from "@/domain/types";

const isoDatetime = z.iso.datetime({
  offset: true,
  error: "updatedAt must be an ISO-8601 datetime",
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

export function parseOrgTree(input: unknown): OrgNode[] {
  const result = orgTreeSchema.safeParse(input);

  if (!result.success) {
    const summary = result.error.issues
      .map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Невалидный ответ API: ${summary}`);
  }
  return result.data;
}
