import type { CompareOp, NumericConstraint, NumericFilter, StructuredFilter } from '@/domain/types';
import { parseStructuredFilter } from '@/domain/schema';

export type NlParseResult = {
  filter: StructuredFilter;
  mode: 'structured' | 'text';
};

export type Filterable = {
  name: string;
  level: number;
  totalHeadcount: number;
  totalBudget: number;
  weightedPerformance: number;
};

const FILLERS = new Set([
  'с',
  'со',
  'и',
  'по',
  'чем',
  'для',
  'на',
  'в',
  'от',
  'до',
  'это',
  'уровень',
  'уровня',
  'уровне',
]);

function normalize(raw: string) {
  return raw.trim().toLocaleLowerCase('ru-RU').replaceAll('ё', 'е');
}

function tokenize(raw: string) {
  return normalize(raw)
    .replace(/([<>])/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean);
}

function isMillionWord(token: string) {
  return token === 'млн' || token.startsWith('миллион');
}

function gluedMillion(token: string) {
  const match = /^(\d+)(млн|миллион.*)$/u.exec(token);
  if (!match) return null;
  return Number(match[1]) * 1_000_000;
}

function readNumber(tokens: string[], index: number): { value: number; next: number } | null {
  const token = tokens[index];
  if (!token) return null;
  if (isMillionWord(token)) return { value: 1_000_000, next: index + 1 };

  const glued = gluedMillion(token);
  if (glued !== null) return { value: glued, next: index + 1 };

  if (!/^\d+$/.test(token)) return null;
  let digits = token;
  let next = index + 1;
  while (next < tokens.length && /^\d+$/.test(tokens[next] ?? '')) {
    digits += tokens[next];
    next += 1;
  }
  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  if (tokens[next] && isMillionWord(tokens[next])) {
    return { value: value * 1_000_000, next: next + 1 };
  }
  return { value, next };
}

function readLevel(token: string) {
  if (token.startsWith('дивизион')) return 0;
  if (token.startsWith('отдел')) return 1;
  if (token.startsWith('команд')) return 2;
  return null;
}

type NumericField = keyof Pick<StructuredFilter, 'performance' | 'budget' | 'headcount'>;

function readField(token: string): NumericField | null {
  if (token.startsWith('эффективн')) return 'performance';
  if (token.startsWith('бюджет')) return 'budget';
  if (token.startsWith('сотрудник') || token.startsWith('численност')) return 'headcount';
  return null;
}

function readOp(token: string): CompareOp | null {
  if (token === '<' || token === 'ниже' || token === 'меньше') return 'lt';
  if (token === '>' || token === 'выше' || token === 'больше') return 'gt';
  if (token.startsWith('равн')) return 'eq';
  return null;
}

function validateValue(field: NumericField, value: number) {
  if (!Number.isFinite(value) || value < 0) return false;
  if (field === 'performance') return value >= 0 && value <= 100;
  if (field === 'budget' || field === 'headcount') return Number.isInteger(value);
  return true;
}

function isGtLtPair(a: NumericFilter, b: NumericFilter) {
  return (a.op === 'gt' && b.op === 'lt') || (a.op === 'lt' && b.op === 'gt');
}

function tryParse(raw: string): StructuredFilter | null {
  const tokens = tokenize(raw);
  const filter: StructuredFilter = {};
  const leftover: string[] = [];
  let field: NumericField | null = null;
  let op: CompareOp | null = null;
  let index = 0;

  const commitNumber = (value: number) => {
    if (!field) return false;
    const comparison: NumericFilter = { op: op ?? 'eq', value };
    if (!validateValue(field, value)) return false;
    const existing = filter[field];
    if (!existing) {
      filter[field] = comparison;
    } else if (Array.isArray(existing) || !isGtLtPair(existing, comparison)) {
      return false;
    } else {
      filter[field] = [existing, comparison];
    }
    op = null;
    return true;
  };

  while (index < tokens.length) {
    const number = readNumber(tokens, index);
    if (number) {
      if (!commitNumber(number.value)) return null;
      index = number.next;
      continue;
    }

    const token = tokens[index]!;
    const level = readLevel(token);
    if (level !== null) {
      if (filter.level !== undefined) return null;
      filter.level = level;
      index += 1;
      continue;
    }

    const nextField = readField(token);
    if (nextField) {
      if (op) return null;
      if (field && field !== nextField && !filter[field]) return null;
      field = nextField;
      index += 1;
      continue;
    }

    const nextOp = readOp(token);
    if (nextOp) {
      if (op) return null;
      op = nextOp;
      index += 1;
      continue;
    }

    if (FILLERS.has(token)) {
      index += 1;
      continue;
    }

    leftover.push(token);
    index += 1;
  }

  if (op) return null;
  if (field && !filter[field]) return null;
  if (leftover.length > 0) filter.text = leftover.join(' ');
  if (filter.level === undefined && !filter.performance && !filter.budget && !filter.headcount) {
    return null;
  }
  return filter;
}

export function parseNl(query: string): NlParseResult {
  const raw = query.trim();
  if (!raw) return { filter: {}, mode: 'text' };

  const parsed = tryParse(raw);
  const checked = parsed ? parseStructuredFilter(parsed) : null;
  if (!checked) return { filter: { text: raw }, mode: 'text' };
  return { filter: checked, mode: 'structured' };
}

function compareNumber(actual: number, filter: NumericFilter) {
  if (filter.op === 'lt') return actual < filter.value;
  if (filter.op === 'gt') return actual > filter.value;
  return Math.round(actual) === filter.value;
}

function matchesNumeric(actual: number, constraint: NumericConstraint | undefined) {
  if (!constraint) return true;
  const clauses = Array.isArray(constraint) ? constraint : [constraint];
  return clauses.every((clause) => compareNumber(actual, clause));
}

export function matchesFilter(item: Filterable, filter: StructuredFilter) {
  if (filter.level !== undefined && item.level !== filter.level) return false;
  if (filter.text) {
    const needle = filter.text.toLocaleLowerCase('ru-RU');
    if (!item.name.toLocaleLowerCase('ru-RU').includes(needle)) return false;
  }
  if (!matchesNumeric(item.weightedPerformance, filter.performance)) return false;
  if (!matchesNumeric(item.totalBudget, filter.budget)) return false;
  if (!matchesNumeric(item.totalHeadcount, filter.headcount)) return false;
  return true;
}

export function isFilterActive(filter: StructuredFilter) {
  return Boolean(
    filter.text ||
    filter.level !== undefined ||
    filter.performance ||
    filter.budget ||
    filter.headcount,
  );
}
