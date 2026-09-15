import { describe, expect, it } from 'vitest'
import { aggregateTree } from '@/domain/aggregate'
import { buildTree } from '@/domain/tree'
import { orgNode } from '@/domain/orgNode.fixture'
import { performanceBand } from '@/domain/performance'

describe('aggregateTree — инварианты агрегации', () => {
  it('у листа агрегаты равны собственным полям', () => {
    const index = buildTree([
      orgNode('leaf', 'Leaf', { headcount: 4, budget: 200, performance: 80 }),
    ])
    const leaf = aggregateTree(index).get('leaf')
    expect(leaf).toMatchObject({
      level: 0,
      totalHeadcount: 4,
      totalBudget: 200,
      weightedSum: 320,
      weightedPerformance: 80,
    })
  })

  it('пример из data-model: A←B, среднее взвешено, свой headcount A входит в вес', () => {
    const index = buildTree([
      orgNode('A', 'A', { headcount: 10, budget: 100, performance: 50 }),
      orgNode('B', 'B', { parentId: 'A', headcount: 6, budget: 40, performance: 100 }),
    ])
    const agg = aggregateTree(index)
    const b = agg.get('B')
    const a = agg.get('A')

    expect(b).toMatchObject({
      totalHeadcount: 6,
      totalBudget: 40,
      weightedSum: 600,
      weightedPerformance: 100,
    })
    expect(a).toMatchObject({
      totalHeadcount: 16,
      totalBudget: 140,
      weightedSum: 1100,
    })
    expect(a?.weightedPerformance).toBeCloseTo(68.75)

    expect(a?.weightedPerformance).not.toBe(75)
    expect(a?.weightedPerformance).not.toBe(100)
  })

  it('сумма = свои + все потомки, не только прямые дети', () => {
    const index = buildTree([
      orgNode('div', 'Div', { headcount: 3, budget: 10, performance: 10 }),
      orgNode('dep', 'Dep', { parentId: 'div', headcount: 2, budget: 20, performance: 20 }),
      orgNode('team', 'Team', { parentId: 'dep', headcount: 5, budget: 30, performance: 30 }),
    ])
    const div = aggregateTree(index).get('div')
    expect(div?.totalHeadcount).toBe(10)
    expect(div?.totalBudget).toBe(60)
    expect((div?.totalHeadcount ?? 0) - 3).toBe(7)
  })

  it('нулевой headcount всего поддерева → weightedPerformance 0, не NaN', () => {
    const index = buildTree([
      orgNode('a', 'A', { headcount: 0, performance: 90 }),
      orgNode('b', 'B', { parentId: 'a', headcount: 0, performance: 10 }),
    ])
    const a = aggregateTree(index).get('a')
    expect(a?.totalHeadcount).toBe(0)
    expect(a?.weightedPerformance).toBe(0)
    expect(Number.isNaN(a?.weightedPerformance)).toBe(false)
  })

  it('узел с нулевым своим headcount не вносит вес, потомки учитываются', () => {
    const index = buildTree([
      orgNode('a', 'A', { headcount: 0, performance: 100 }),
      orgNode('b', 'B', { parentId: 'a', headcount: 4, performance: 50 }),
    ])
    const a = aggregateTree(index).get('a')
    expect(a?.totalHeadcount).toBe(4)
    expect(a?.weightedPerformance).toBe(50)
  })

  it('соседние ветки независимы', () => {
    const index = buildTree([
      orgNode('root', 'Root', { headcount: 1, performance: 10, budget: 1 }),
      orgNode('left', 'Left', { parentId: 'root', headcount: 2, performance: 100, budget: 8 }),
      orgNode('right', 'Right', { parentId: 'root', headcount: 8, performance: 0, budget: 2 }),
    ])
    const agg = aggregateTree(index)
    expect(agg.get('left')?.totalHeadcount).toBe(2)
    expect(agg.get('right')?.totalHeadcount).toBe(8)
    expect(agg.get('left')?.weightedPerformance).toBe(100)
    expect(agg.get('right')?.weightedPerformance).toBe(0)
    expect(agg.get('root')?.totalHeadcount).toBe(11)
    expect(agg.get('root')?.totalBudget).toBe(11)
  })

  it('level в агрегате совпадает с индексом дерева', () => {
    const index = buildTree([
      orgNode('div', 'Div'),
      orgNode('dep', 'Dep', { parentId: 'div' }),
    ])
    const agg = aggregateTree(index)
    expect(agg.get('div')?.level).toBe(0)
    expect(agg.get('dep')?.level).toBe(1)
  })
})

describe('performanceBand', () => {
  it('пороги 0–40 / 41–70 / 71–100', () => {
    expect(performanceBand(0)).toBe('low')
    expect(performanceBand(40)).toBe('low')
    expect(performanceBand(41)).toBe('mid')
    expect(performanceBand(70)).toBe('mid')
    expect(performanceBand(71)).toBe('high')
    expect(performanceBand(100)).toBe('high')
  })
})
