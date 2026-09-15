import { describe, expect, it } from 'vitest'
import { OrgGraphError } from '@/domain/types'
import { buildTree, defaultExpandedIds, pruneExpandedIds } from '@/domain/tree'
import { orgNode } from '@/domain/orgNode.fixture'

describe('buildTree — инварианты графа', () => {
  it('пустой массив даёт пустой индекс, без исключения', () => {
    const index = buildTree([])
    expect(index.nodesById.size).toBe(0)
    expect(index.roots).toEqual([])
  })

  it('несколько корней допустимы', () => {
    const index = buildTree([orgNode('a', 'A'), orgNode('b', 'B')])
    expect(index.roots).toEqual(['a', 'b'])
  })

  it('сохраняет порядок детей как в исходном массиве', () => {
    const index = buildTree([
      orgNode('root', 'Root'),
      orgNode('c', 'C', { parentId: 'root' }),
      orgNode('a', 'A', { parentId: 'root' }),
      orgNode('b', 'B', { parentId: 'root' }),
    ])
    expect(index.childrenByParent.get('root')).toEqual(['c', 'a', 'b'])
  })

  it('level — длина пути от корня', () => {
    const index = buildTree([
      orgNode('div', 'Div'),
      orgNode('dep', 'Dep', { parentId: 'div' }),
      orgNode('team', 'Team', { parentId: 'dep' }),
    ])
    expect(index.levels.get('div')).toBe(0)
    expect(index.levels.get('dep')).toBe(1)
    expect(index.levels.get('team')).toBe(2)
  })

  it('отклоняет дублирующийся id', () => {
    expect(() => buildTree([orgNode('a', 'A'), orgNode('a', 'A2')])).toThrow(OrgGraphError)
  })

  it('отклоняет висячий parentId', () => {
    expect(() => buildTree([orgNode('a', 'A', { parentId: 'missing' })])).toThrow(OrgGraphError)
  })

  it('отклоняет цикл parentId', () => {
    expect(() =>
      buildTree([
        orgNode('a', 'A', { parentId: 'b' }),
        orgNode('b', 'B', { parentId: 'a' }),
      ]),
    ).toThrow(OrgGraphError)
  })

  it('отклоняет петлю на себя', () => {
    expect(() => buildTree([orgNode('a', 'A', { parentId: 'a' })])).toThrow(OrgGraphError)
  })
})

describe('defaultExpandedIds', () => {
  it('открывает уровни 0 и 1, если есть дети', () => {
    const index = buildTree([
      orgNode('div', 'Div'),
      orgNode('dep', 'Dep', { parentId: 'div' }),
      orgNode('team', 'Team', { parentId: 'dep' }),
    ])
    const expanded = defaultExpandedIds(index)
    expect(expanded.has('div')).toBe(true)
    expect(expanded.has('dep')).toBe(true)
    expect(expanded.has('team')).toBe(false)
  })

  it('не раскрывает лист', () => {
    const index = buildTree([orgNode('solo', 'Solo')])
    expect(defaultExpandedIds(index).has('solo')).toBe(false)
  })
})

describe('pruneExpandedIds', () => {
  it('выкидывает id, которых больше нет в индексе', () => {
    const index = buildTree([orgNode('a', 'A')])
    const pruned = pruneExpandedIds(new Set(['a', 'gone']), index)
    expect([...pruned]).toEqual(['a'])
  })
})
