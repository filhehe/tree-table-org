import { describe, expect, it } from 'vitest';
import { upperThirdScrollTop } from '@/ui/scrollIntoUpperThird';

describe('upperThirdScrollTop', () => {
  it('ставит верх элемента на треть видимой области', () => {
    expect(upperThirdScrollTop({ clientHeight: 300, scrollHeight: 3000, scrollTop: 0 }, 900)).toBe(
      800,
    );
  });

  it('учитывает sticky-шапку и не уходит за пределы', () => {
    expect(
      upperThirdScrollTop({ clientHeight: 300, scrollHeight: 400, scrollTop: 0 }, 20, 48),
    ).toBe(0);

    expect(upperThirdScrollTop({ clientHeight: 300, scrollHeight: 400, scrollTop: 0 }, 2000)).toBe(
      100,
    );
  });
});
