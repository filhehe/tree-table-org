const TRANSPORT_PARAMS = new Set(['delay']);

function normalizeSearch(search: string): URLSearchParams {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(raw);
}

function isDefaultScenario(value: string | null) {
  return value === null || value === '' || value === 'ok';
}

function isForcedErrorStatus(value: string | null) {
  if (value === null || value === '') return false;
  const status = Number(value);
  return Number.isInteger(status) && status >= 400 && status <= 599;
}

/**
 * Identity of the org-tree payload, not of the HTTP trip.
 * `delay` only slows the mock; `scenario=ok` and missing scenario are the happy path.
 */
export function orgTreeCacheKey(search: string): string {
  const params = normalizeSearch(search);
  const kept = new URLSearchParams();

  if (!isDefaultScenario(params.get('scenario'))) {
    kept.set('scenario', params.get('scenario') ?? '');
  }

  if (isForcedErrorStatus(params.get('status'))) {
    kept.set('status', params.get('status') ?? '');
  }

  for (const name of [...new Set(params.keys())].sort()) {
    if (name === 'scenario' || name === 'status' || TRANSPORT_PARAMS.has(name)) continue;
    const values = params.getAll(name);
    for (const value of values) kept.append(name, value);
  }

  const qs = kept.toString();
  return qs ? `org-tree?${qs}` : 'org-tree';
}
