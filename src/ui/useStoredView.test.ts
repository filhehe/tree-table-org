import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  VIEW_STORAGE_KEY,
  readViewPreference,
  visibleView,
  writeViewPreference,
} from '@/ui/useStoredView';

const memory = new Map<string, string>();

const localStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
};

beforeEach(() => {
  memory.clear();
  vi.stubGlobal('window', { localStorage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('view preference', () => {
  it('по умолчанию split, чтобы на широкой панели открывалось «Вместе»', () => {
    expect(readViewPreference()).toBe('split');
  });

  it('читает сохранённый вид', () => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, 'table');
    expect(readViewPreference()).toBe('table');
  });

  it('игнорирует мусор в storage', () => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, 'grid');
    expect(readViewPreference()).toBe('split');
  });

  it('узкая панель не затирает предпочтение split', () => {
    writeViewPreference('split');
    expect(visibleView('split', false)).toBe('tree');
    expect(readViewPreference()).toBe('split');
    expect(visibleView('split', true)).toBe('split');
  });
});
