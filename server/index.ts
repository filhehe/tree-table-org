import http from 'node:http'
import { generateOrgTree, getOrgTreeStats } from './generate.ts'

const PORT = Number(process.env.SERVER_PORT ?? process.env.PORT ?? 3001)
const TREE = generateOrgTree()
const stats = getOrgTreeStats(TREE)

console.log(`Org fixture: ${stats.count} nodes, ${stats.levels} levels`)

function sendJson(res: http.ServerResponse, status: number, body: unknown) {
  const payload = JSON.stringify(body)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Content-Length': Buffer.byteLength(payload),
  })
  res.end(payload)
}

function parseDelay(url: URL) {
  const raw = url.searchParams.get('delay')
  if (!raw) return 0
  const delay = Number(raw)
  if (!Number.isFinite(delay) || delay < 0) return 0
  return Math.min(delay, 10_000)
}

const server = http.createServer((req, res) => {
  if (!req.url || !req.method) {
    sendJson(res, 400, { error: 'Bad request' })
    return
  }

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Accept',
    })
    res.end()
    return
  }

  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)

  if (req.method !== 'GET' || url.pathname !== '/api/org-tree') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  const forcedStatus = Number(url.searchParams.get('status') ?? '')
  const scenario = url.searchParams.get('scenario') ?? 'ok'
  const delay = parseDelay(url)

  const respond = () => {
    if (Number.isInteger(forcedStatus) && forcedStatus >= 400 && forcedStatus <= 599) {
      sendJson(res, forcedStatus, { error: 'Forced error' })
      return
    }

    if (scenario === 'empty') {
      sendJson(res, 200, [])
      return
    }

    if (scenario === 'invalid') {
      sendJson(res, 200, [
        {
          id: 'broken',
          name: 'Сломанный узел',
          parentId: null,
          headcount: 'много',
          budget: -1,
          performance: 120,
        },
      ])
      return
    }

    sendJson(res, 200, TREE)
  }

  if (delay > 0) {
    setTimeout(respond, delay)
    return
  }

  respond()
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`API http://127.0.0.1:${PORT}/api/org-tree`)
})
