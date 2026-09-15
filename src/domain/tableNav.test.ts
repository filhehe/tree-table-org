import { describe, expect, it } from 'vitest';
import { isTableMoveKey, isTableNavKey, nextTableRowId } from '@/domain/tableNav';

const ids = ['a', 'b', 'c'];

describe('nextTableRowId', () => {
  it('Home / End — первая и последняя', () => {
    expect(nextTableRowId(ids, 'b', 'Home')).toBe('a');
    expect(nextTableRowId(ids, 'b', 'End')).toBe('c');
  });

  it('стрелки не выходят за края', () => {
    expect(nextTableRowId(ids, 'a', 'ArrowUp')).toBe('a');
    expect(nextTableRowId(ids, 'c', 'ArrowDown')).toBe('c');
    expect(nextTableRowId(ids, 'a', 'ArrowDown')).toBe('b');
    expect(nextTableRowId(ids, 'c', 'ArrowUp')).toBe('b');
  });

  it('без курсора стрелка берёт первую строку', () => {
    expect(nextTableRowId(ids, null, 'ArrowDown')).toBe('a');
    expect(nextTableRowId(ids, null, 'Home')).toBe('a');
  });

  it('пустой список', () => {
    expect(nextTableRowId([], 'a', 'Home')).toBeNull();
  });
});

describe('isTableNavKey', () => {
  it('стрелки двигают курсор, Enter — не сдвиг', () => {
    expect(isTableNavKey('ArrowUp')).toBe(true);
    expect(isTableNavKey('Enter')).toBe(true);
    expect(isTableMoveKey('Enter')).toBe(false);
    expect(isTableMoveKey('ArrowDown')).toBe(true);
    expect(isTableNavKey('Tab')).toBe(false);
  });
});
