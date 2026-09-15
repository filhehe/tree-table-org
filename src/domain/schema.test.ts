import { describe, expect, it } from 'vitest'
import { parseOrgTree } from '@/domain/schema'
import { orgNode } from '@/domain/orgNode.fixture'

const valid = orgNode('a', 'Alpha', {
  headcount: 3,
  budget: 100,
  performance: 50,
})

describe('parseOrgTree — контракт API', () => {
  it('принимает пустой массив', () => {
    expect(parseOrgTree([])).toEqual([])
  })

  it('принимает валидный узел', () => {
    expect(parseOrgTree([valid])).toEqual([valid])
  })

  it('принимает parentId: null как корень', () => {
    expect(parseOrgTree([{ ...valid, parentId: null }])[0]?.parentId).toBeNull()
  })

  it('отклоняет не-массив', () => {
    expect(() => parseOrgTree({ id: 'a' })).toThrow(/Невалидный ответ API/)
  })

  it('отклоняет пустой id и имя', () => {
    expect(() => parseOrgTree([{ ...valid, id: '' }])).toThrow(/Невалидный ответ API/)
    expect(() => parseOrgTree([{ ...valid, name: '' }])).toThrow(/Невалидный ответ API/)
  })

  it('отклоняет дробный и отрицательный headcount', () => {
    expect(() => parseOrgTree([{ ...valid, headcount: 1.5 }])).toThrow(/Невалидный ответ API/)
    expect(() => parseOrgTree([{ ...valid, headcount: -1 }])).toThrow(/Невалидный ответ API/)
  })

  it('отклоняет отрицательный budget', () => {
    expect(() => parseOrgTree([{ ...valid, budget: -10 }])).toThrow(/Невалидный ответ API/)
  })

  it('отклоняет performance вне 0…100', () => {
    expect(() => parseOrgTree([{ ...valid, performance: -0.1 }])).toThrow(/Невалидный ответ API/)
    expect(() => parseOrgTree([{ ...valid, performance: 100.1 }])).toThrow(/Невалидный ответ API/)
  })

  it('принимает границы performance 0 и 100', () => {
    expect(parseOrgTree([{ ...valid, performance: 0 }])[0]?.performance).toBe(0)
    expect(parseOrgTree([{ ...valid, performance: 100 }])[0]?.performance).toBe(100)
  })

  it('принимает ISO-8601 с Z и с числовым смещением', () => {
    expect(parseOrgTree([{ ...valid, updatedAt: '2026-09-15T12:00:00Z' }])[0]?.updatedAt).toBe(
      '2026-09-15T12:00:00Z',
    )
    expect(
      parseOrgTree([{ ...valid, updatedAt: '2026-09-15T16:00:00+04:00' }])[0]?.updatedAt,
    ).toBe('2026-09-15T16:00:00+04:00')
  })

  it('отклоняет не-ISO updatedAt', () => {
    expect(() => parseOrgTree([{ ...valid, updatedAt: 'вчера' }])).toThrow(/Невалидный ответ API/)
    expect(() => parseOrgTree([{ ...valid, updatedAt: 'January 1, 2026' }])).toThrow(
      /Невалидный ответ API/,
    )
    expect(() => parseOrgTree([{ ...valid, updatedAt: '2026-09-15' }])).toThrow(
      /Невалидный ответ API/,
    )
    expect(() =>
      parseOrgTree([{ ...valid, updatedAt: '2026-09-15 12:00:00.000Z' }]),
    ).toThrow(/Невалидный ответ API/)
  })

  it('отклоняет отсутствующие поля', () => {
    const rest: Record<string, unknown> = { ...valid }
    delete rest.budget
    expect(() => parseOrgTree([rest])).toThrow(/Невалидный ответ API/)
  })

  it('строка-число в headcount — ошибка схемы, не coerce', () => {
    expect(() =>
      parseOrgTree([{ ...valid, headcount: '3' as unknown as number }]),
    ).toThrow(/Невалидный ответ API/)
  })
})
