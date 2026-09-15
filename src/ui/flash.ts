import { UPDATE_FADE_MS } from '@/data/store';

export function flashAnimation(tick: number) {
  if (!tick) return '';
  return `animation: ${tick % 2 === 0 ? 'org-flash-a' : 'org-flash-b'} ${UPDATE_FADE_MS}ms ease;`;
}

export const flashReduce = `
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
