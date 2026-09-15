import { afterEach, describe, expect, it, vi } from 'vitest'
import { orgNode } from '@/domain/orgNode.fixture'

vi.mock('@/data/http', () => ({
  fetchOrgTree: vi.fn(),
}))

import { fetchOrgTree } from '@/data/http'
import { clearOrgTreeCache, fetchOrgTreeSnapshot, peekOrgTreeCache } from '@/data/cache'

const tree = [
  orgNode('a', 'A', { headcount: 1, budget: 10, performance: 50 }),
]

afterEach(() => {
  clearOrgTreeCache()
  vi.mocked(fetchOrgTree).mockReset()
})

describe('кэш org-tree — ключ по payload', () => {
  it('hit на / и ?delay=2000, miss на ?scenario=empty', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree)

    await fetchOrgTreeSnapshot(new AbortController().signal, '')

    expect(peekOrgTreeCache('')?.snapshot.index.nodesById.size).toBe(1)
    expect(peekOrgTreeCache('?delay=2000')?.snapshot.index.nodesById.size).toBe(1)
    expect(peekOrgTreeCache('?scenario=empty')).toBeNull()
    expect(fetchOrgTree).toHaveBeenCalledTimes(1)
    expect(fetchOrgTree).toHaveBeenCalledWith(expect.any(AbortSignal), '')
  })

  it('empty не подменяет happy-path snapshot', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree)
    await fetchOrgTreeSnapshot(new AbortController().signal, '')

    vi.mocked(fetchOrgTree).mockResolvedValueOnce([])
    await fetchOrgTreeSnapshot(new AbortController().signal, '?scenario=empty')

    expect(peekOrgTreeCache('')?.snapshot.index.nodesById.size).toBe(1)
    expect(peekOrgTreeCache('?scenario=empty')?.snapshot.index.nodesById.size).toBe(0)
  })

  it('повторный GET с теми же узлами возвращает мемоизированные агрегаты', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree)
    const first = await fetchOrgTreeSnapshot(new AbortController().signal, '')

    vi.mocked(fetchOrgTree).mockResolvedValueOnce([{ ...tree[0] }])
    const second = await fetchOrgTreeSnapshot(new AbortController().signal, '')

    expect(second).toBe(first)
    expect(second.aggregates).toBe(first.aggregates)
  })
})
