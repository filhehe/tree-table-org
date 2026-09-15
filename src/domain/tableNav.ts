export type TableMoveKey = 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';
export type TableNavKey = TableMoveKey | 'Enter';

export function isTableNavKey(key: string): key is TableNavKey {
  return (
    key === 'ArrowUp' || key === 'ArrowDown' || key === 'Home' || key === 'End' || key === 'Enter'
  );
}

export function isTableMoveKey(key: string): key is TableMoveKey {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'Home' || key === 'End';
}

/** Куда сдвинуть курсор. Enter сюда не входит — он выделяет текущую строку. */
export function nextTableRowId(
  ids: string[],
  current: string | null,
  key: TableMoveKey,
): string | null {
  if (ids.length === 0) return null;
  if (key === 'Home') return ids[0]!;
  if (key === 'End') return ids[ids.length - 1]!;

  const index = current ? ids.indexOf(current) : -1;
  if (key === 'ArrowDown') {
    if (index < 0) return ids[0]!;
    return ids[Math.min(ids.length - 1, index + 1)]!;
  }
  if (index < 0) return ids[0]!;
  return ids[Math.max(0, index - 1)]!;
}
