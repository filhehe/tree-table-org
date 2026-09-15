import { describe, expect, it } from 'vitest';
import { matchesFilter, parseNl } from '@/domain/nlSearch';
import { parseStructuredFilter } from '@/domain/schema';
import type { StructuredFilter } from '@/domain/types';

describe('parseNl — таблица фраз', () => {
  it.each([
    ['команды с эффективностью ниже 60', { level: 2, performance: { op: 'lt', value: 60 } }],
    ['бюджет больше миллиона', { budget: { op: 'gt', value: 1_000_000 } }],
    [
      'команды сотрудниками больше 5 и меньше 10',
      {
        level: 2,
        headcount: [
          { op: 'gt', value: 5 },
          { op: 'lt', value: 10 },
        ],
      },
    ],
    ['отдел платежей', { level: 1, text: 'платежей' }],
    ['asdf qwerty', { text: 'asdf qwerty' }],
    ['эффективность 200', { text: 'эффективность 200' }],
  ] as [string, StructuredFilter][])('%s', (query, expected) => {
    const { filter, mode } = parseNl(query);
    expect(filter).toEqual(expected);
    const structured = Boolean(
      expected.level !== undefined || expected.performance || expected.budget || expected.headcount,
    );
    expect(mode).toBe(structured ? 'structured' : 'text');
  });

  it('разбирает 1 000 000 как миллион', () => {
    expect(parseNl('бюджет > 1 000 000').filter).toEqual({
      budget: { op: 'gt', value: 1_000_000 },
    });
  });

  it('принимает «с сотрудниками» и диапазон без «и»', () => {
    const expected = {
      level: 2,
      headcount: [
        { op: 'gt', value: 5 },
        { op: 'lt', value: 10 },
      ],
    };
    expect(parseNl('команды с сотрудниками больше 5 и меньше 10').filter).toEqual(expected);
    expect(parseNl('команды сотрудниками больше 5 меньше 10').filter).toEqual(expected);
  });
});

describe('matchesFilter', () => {
  const team = {
    name: 'Research',
    level: 2,
    totalHeadcount: 4,
    totalBudget: 100,
    weightedPerformance: 41,
  };

  it('команда с эффективностью ниже 60 проходит, 69% и отдел — нет', () => {
    const filter: StructuredFilter = {
      level: 2,
      performance: { op: 'lt', value: 60 },
    };
    expect(matchesFilter(team, filter)).toBe(true);
    expect(matchesFilter({ ...team, weightedPerformance: 69 }, filter)).toBe(false);
    expect(matchesFilter({ ...team, level: 1, weightedPerformance: 10 }, filter)).toBe(false);
  });

  it('диапазон сотрудников: больше 5 и меньше 10', () => {
    const filter: StructuredFilter = {
      level: 2,
      headcount: [
        { op: 'gt', value: 5 },
        { op: 'lt', value: 10 },
      ],
    };
    expect(matchesFilter({ ...team, totalHeadcount: 6 }, filter)).toBe(true);
    expect(matchesFilter({ ...team, totalHeadcount: 9 }, filter)).toBe(true);
    expect(matchesFilter({ ...team, totalHeadcount: 5 }, filter)).toBe(false);
    expect(matchesFilter({ ...team, totalHeadcount: 10 }, filter)).toBe(false);
  });
});

describe('parseStructuredFilter — мусор от модели', () => {
  it('не пропускает посторонние поля и неизвестный оператор', () => {
    expect(
      parseStructuredFilter({
        level: 2,
        sql: 'drop table',
      }),
    ).toBeNull();
    expect(
      parseStructuredFilter({
        performance: { op: 'approx', value: 50 },
      }),
    ).toBeNull();
    expect(parseStructuredFilter({ level: 'команда' })).toBeNull();
    expect(
      parseStructuredFilter({
        headcount: [
          { op: 'gt', value: 5 },
          { op: 'gt', value: 10 },
        ],
      }),
    ).toBeNull();
  });
});
