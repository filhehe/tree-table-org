import http from 'node:http';
import type { OrgPatchDto } from './mutate.ts';

const HEARTBEAT_MS = 15_000;
const clients = new Set<http.ServerResponse>();
let eventId = 0;

export function attachSseClient(req: http.IncomingMessage, res: http.ServerResponse) {
  req.socket.setTimeout(0);
  req.socket.setNoDelay(true);
  req.socket.setKeepAlive(true);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');

  clients.add(res);

  const heartbeat = setInterval(() => {
    if (res.writableEnded) return;
    res.write(': heartbeat\n\n');
  }, HEARTBEAT_MS);

  const detach = () => {
    clearInterval(heartbeat);
    clients.delete(res);
  };

  req.on('close', detach);
  res.on('close', detach);
  res.on('error', detach);
}

export function broadcastPatch(patch: OrgPatchDto) {
  eventId += 1;
  const frame = `id: ${eventId}\nevent: patch\ndata: ${JSON.stringify(patch)}\n\n`;
  for (const client of clients) {
    if (client.writableEnded) continue;
    client.write(frame);
  }
}
