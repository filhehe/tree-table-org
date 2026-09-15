import type { OrgNodeDto } from './generate.ts';

export type OrgPatchDto = {
  id: string;
  headcount?: number;
  budget?: number;
  performance?: number;
  updatedAt: string;
};

const METRICS = ['headcount', 'budget', 'performance'] as const;

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pickDistinct<T>(items: T[], count: number) {
  const pool = [...items];
  const picked: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const index = Math.floor(Math.random() * pool.length);
    picked.push(pool.splice(index, 1)[0]!);
  }
  return picked;
}

function nextHeadcount(current: number) {
  const delta = randomInt(1, 4) * (Math.random() < 0.5 ? -1 : 1);
  return Math.max(0, current + delta);
}

function nextBudget(current: number) {
  const delta = randomInt(8_000, 80_000) * (Math.random() < 0.5 ? -1 : 1);
  return Math.max(0, current + delta);
}

function nextPerformance(current: number) {
  const delta = randomInt(3, 12) * (Math.random() < 0.5 ? -1 : 1);
  return Math.max(0, Math.min(100, current + delta));
}

export function mutateNode(node: OrgNodeDto): { node: OrgNodeDto; patch: OrgPatchDto } {
  const fieldCount = randomInt(1, 2);
  const fields = pickDistinct([...METRICS], fieldCount);
  const patch: OrgPatchDto = { id: node.id, updatedAt: new Date().toISOString() };
  const next = { ...node, updatedAt: patch.updatedAt };

  for (const field of fields) {
    if (field === 'headcount') {
      let value = nextHeadcount(node.headcount);
      if (value === node.headcount) value = node.headcount === 0 ? 1 : node.headcount - 1;
      patch.headcount = value;
      next.headcount = value;
    } else if (field === 'budget') {
      let value = nextBudget(node.budget);
      if (value === node.budget) value = node.budget + 10_000;
      patch.budget = value;
      next.budget = value;
    } else {
      let value = nextPerformance(node.performance);
      if (value === node.performance) value = node.performance >= 100 ? 99 : node.performance + 1;
      patch.performance = value;
      next.performance = value;
    }
  }

  return { node: next, patch };
}

export function mutateTree(tree: OrgNodeDto[]): OrgPatchDto[] {
  const count = randomInt(1, 2);
  const patches: OrgPatchDto[] = [];
  for (const node of pickDistinct(tree, count)) {
    const mutated = mutateNode(node);
    const index = tree.findIndex((item) => item.id === node.id);
    if (index === -1) continue;
    tree[index] = mutated.node;
    patches.push(mutated.patch);
  }
  return patches;
}

export function nextMutateDelayMs() {
  const min = Number(process.env.MUTATE_MIN_MS ?? 3_000);
  const max = Number(process.env.MUTATE_MAX_MS ?? 5_000);
  const lo = Number.isFinite(min) ? min : 3_000;
  const hi = Number.isFinite(max) ? max : 5_000;
  return randomInt(Math.min(lo, hi), Math.max(lo, hi));
}
