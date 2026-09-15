import http from 'node:http';

export function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

export function parseDelay(url: URL) {
  const raw = url.searchParams.get('delay');
  if (!raw) return 0;
  const delay = Number(raw);
  if (!Number.isFinite(delay) || delay < 0) return 0;
  return Math.min(delay, 10_000);
}
