export type PerformanceBand = 'low' | 'mid' | 'high';

export function performanceBand(performance: number): PerformanceBand {
  if (performance <= 40) return 'low';
  if (performance <= 70) return 'mid';
  return 'high';
}
