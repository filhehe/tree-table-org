import { afterEach, describe, expect, it, vi } from 'vitest';
import { orgNode } from '@/domain/orgNode.fixture';

vi.mock('@/data/http', () => ({
  fetchOrgTree: vi.fn(),
}));

import { fetchOrgTree } from '@/data/http';
import {
  clearOrgTreeCache,
  fetchOrgTreeSnapshot,
  patchOrgTreeCache,
  peekOrgTreeCache,
} from '@/data/cache';

const tree = [orgNode('a', 'A', { headcount: 1, budget: 10, performance: 50 })];

afterEach(() => {
  clearOrgTreeCache();
  vi.mocked(fetchOrgTree).mockReset();
});

describe('кэш org-tree — ключ по payload', () => {
  it('hit на / и ?delay=2000, miss на ?scenario=empty', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree);

    await fetchOrgTreeSnapshot(new AbortController().signal, '');

    expect(peekOrgTreeCache('')?.snapshot.index.nodesById.size).toBe(1);
    expect(peekOrgTreeCache('?delay=2000')?.snapshot.index.nodesById.size).toBe(1);
    expect(peekOrgTreeCache('?scenario=empty')).toBeNull();
    expect(fetchOrgTree).toHaveBeenCalledTimes(1);
    expect(fetchOrgTree).toHaveBeenCalledWith(expect.any(AbortSignal), '');
  });

  it('empty не подменяет happy-path snapshot', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree);
    await fetchOrgTreeSnapshot(new AbortController().signal, '');

    vi.mocked(fetchOrgTree).mockResolvedValueOnce([]);
    await fetchOrgTreeSnapshot(new AbortController().signal, '?scenario=empty');

    expect(peekOrgTreeCache('')?.snapshot.index.nodesById.size).toBe(1);
    expect(peekOrgTreeCache('?scenario=empty')?.snapshot.index.nodesById.size).toBe(0);
  });

  it('повторный GET с теми же узлами возвращает мемоизированные агрегаты', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree);
    const first = await fetchOrgTreeSnapshot(new AbortController().signal, '');

    vi.mocked(fetchOrgTree).mockResolvedValueOnce([{ ...tree[0] }]);
    const second = await fetchOrgTreeSnapshot(new AbortController().signal, '');

    expect(second).toBe(first);
    expect(second.aggregates).toBe(first.aggregates);
  });

  it('in-flight GET, начатый до патча, не затирает snapshot', async () => {
    vi.mocked(fetchOrgTree).mockResolvedValueOnce(tree);
    const first = await fetchOrgTreeSnapshot(new AbortController().signal, '');

    let resolveGet: (value: unknown) => void = () => {};
    vi.mocked(fetchOrgTree).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );

    const inflight = fetchOrgTreeSnapshot(new AbortController().signal, '');
    const patched = patchOrgTreeCache('', {
      id: 'a',
      headcount: 9,
      updatedAt: '2026-09-15T12:01:00.000Z',
    });

    expect(patched?.snapshot.index.nodesById.get('a')?.headcount).toBe(9);
    expect(patched?.snapshot.index.childrenByParent).toBe(first.index.childrenByParent);

    resolveGet([{ ...tree[0] }]);
    const stale = await inflight;
    expect(stale.index.nodesById.get('a')?.headcount).toBe(9);
    expect(stale).toBe(patched?.snapshot);
  });
});
