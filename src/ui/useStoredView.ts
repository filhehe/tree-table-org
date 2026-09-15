import { useState } from 'react';

export const VIEW_STORAGE_KEY = 'orgtree:view';

export type ViewId = 'tree' | 'table' | 'split';

function isViewId(value: string | null): value is ViewId {
  return value === 'tree' || value === 'table' || value === 'split';
}

export function readViewPreference(): ViewId {
  if (typeof window === 'undefined') return 'split';
  try {
    const raw = window.localStorage.getItem(VIEW_STORAGE_KEY);
    return isViewId(raw) ? raw : 'split';
  } catch {
    return 'split';
  }
}

export function writeViewPreference(view: ViewId) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch {
    /* private mode / quota */
  }
}

export function visibleView(preferred: ViewId, wide: boolean): ViewId {
  if (preferred === 'split' && !wide) return 'tree';
  return preferred;
}

export function useStoredView(wide: boolean) {
  const [preferred, setPreferred] = useState<ViewId>(() => readViewPreference());
  const view = visibleView(preferred, wide);

  const setView = (next: ViewId) => {
    setPreferred(next);
    writeViewPreference(next);
  };

  return [view, setView] as const;
}
