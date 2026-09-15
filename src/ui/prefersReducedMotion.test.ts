import { afterEach, describe, expect, it, vi } from 'vitest';
import { getPrefersReducedMotion } from '@/ui/prefersReducedMotion';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getPrefersReducedMotion', () => {
  it('false, если matchMedia нет', () => {
    vi.stubGlobal('window', {});
    expect(getPrefersReducedMotion()).toBe(false);
  });

  it('читает prefers-reduced-motion: reduce', () => {
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
    expect(getPrefersReducedMotion()).toBe(true);
  });
});
