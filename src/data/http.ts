export function readOrgTreeSearch(): string {
  return typeof window === 'undefined' ? '' : window.location.search;
}

export function buildOrgTreeUrl(search: string): string {
  return search ? `/api/org-tree${search}` : '/api/org-tree';
}

export async function fetchOrgTree(signal: AbortSignal, search: string): Promise<unknown> {
  const response = await fetch(buildOrgTreeUrl(search), {
    method: 'GET',
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Ошибка HTTP ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}
