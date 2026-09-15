import { describe, expect, it } from 'vitest';
import { orgTreeCacheKey } from '@/data/orgTreeCacheKey';

describe('orgTreeCacheKey — идентичность payload, не поездки', () => {
  it('пустой query и delay — один ключ', () => {
    expect(orgTreeCacheKey('')).toBe('org-tree');
    expect(orgTreeCacheKey('?delay=2000')).toBe('org-tree');
    expect(orgTreeCacheKey('?delay=2000')).toBe(orgTreeCacheKey(''));
  });

  it('scenario=ok совпадает с отсутствующим scenario', () => {
    expect(orgTreeCacheKey('?scenario=ok')).toBe('org-tree');
    expect(orgTreeCacheKey('?scenario=ok&delay=1500')).toBe('org-tree');
  });

  it('empty / invalid — отдельные ключи, delay на них не влияет', () => {
    expect(orgTreeCacheKey('?scenario=empty')).toBe('org-tree?scenario=empty');
    expect(orgTreeCacheKey('?scenario=empty&delay=1500')).toBe(orgTreeCacheKey('?scenario=empty'));
    expect(orgTreeCacheKey('?scenario=invalid')).toBe('org-tree?scenario=invalid');
    expect(orgTreeCacheKey('?scenario=empty')).not.toBe(orgTreeCacheKey(''));
    expect(orgTreeCacheKey('?scenario=invalid')).not.toBe(orgTreeCacheKey('?scenario=empty'));
  });

  it('status 4xx/5xx отделяет ключ; 200 и мусор — нет', () => {
    expect(orgTreeCacheKey('?status=500')).toBe('org-tree?status=500');
    expect(orgTreeCacheKey('?status=500')).not.toBe(orgTreeCacheKey(''));
    expect(orgTreeCacheKey('?status=200')).toBe('org-tree');
    expect(orgTreeCacheKey('?status=abc')).toBe('org-tree');
  });

  it('порядок параметров не важен', () => {
    expect(orgTreeCacheKey('?delay=1500&scenario=empty')).toBe(
      orgTreeCacheKey('?scenario=empty&delay=1500'),
    );
  });
});
