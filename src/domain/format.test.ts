import { describe, expect, it } from 'vitest';
import { formatBudget, formatLevel, formatPerformance } from '@/domain/format';

describe('formatBudget', () => {
  it('ставит неразрывные пробелы и суффикс руб.', () => {
    expect(formatBudget(12345678)).toBe('12\u00A0345\u00A0678\u00A0руб.');
    expect(formatBudget(0)).toBe('0\u00A0руб.');
  });
});

describe('formatLevel', () => {
  it('подписывает 0–2 и оставляет прочие числа', () => {
    expect(formatLevel(0)).toBe('Дивизион');
    expect(formatLevel(1)).toBe('Отдел');
    expect(formatLevel(2)).toBe('Команда');
    expect(formatLevel(3)).toBe('3');
  });
});

describe('formatPerformance', () => {
  it('округляет один раз в форматтере', () => {
    expect(formatPerformance(68.75)).toBe('69%');
    expect(formatPerformance(40)).toBe('40%');
  });
});
