const http = require('node:http');
const { randomUUID } = require('node:crypto');

const tasks = new Map();
const port = Number(process.env.PORT || 3000);

function sendJson(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('Request body too large');
  }
  try { return raw ? JSON.parse(raw) : {}; } catch { return null; }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', service: 'api-testing-demo' });
  }
  if (req.method === 'GET' && pathname === '/api/tasks') {
    const completed = url.searchParams.get('completed');
    const data = [...tasks.values()].filter((task) => completed === null || task.completed === (completed === 'true'));
    return sendJson(res, 200, { data, count: data.length });
  }
  if (req.method === 'POST' && pathname === '/api/tasks') {
    let body;
    try { body = await readJson(req); } catch { return sendJson(res, 413, { error: 'El cuerpo excede 1 MB' }); }
    if (!body || typeof body.title !== 'string' || !body.title.trim()) {
      return sendJson(res, 400, { error: 'El campo title es obligatorio' });
    }
    const now = new Date().toISOString();
    const task = { id: randomUUID(), title: body.title.trim(), completed: false, createdAt: now, updatedAt: now };
    tasks.set(task.id, task);
    return sendJson(res, 201, task);
  }

  const match = pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    const task = tasks.get(id);
    if (!task) return sendJson(res, 404, { error: 'Tarea no encontrada' });
    if (req.method === 'GET') return sendJson(res, 200, task);
    if (req.method === 'PATCH') {
      let body;
      try { body = await readJson(req); } catch { return sendJson(res, 413, { error: 'El cuerpo excede 1 MB' }); }
      if (!body || (body.title === undefined && body.completed === undefined)) {
        return sendJson(res, 400, { error: 'Indica title o completed para actualizar' });
      }
      if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
        return sendJson(res, 400, { error: 'title debe ser un texto no vacío' });
      }
      if (body.completed !== undefined && typeof body.completed !== 'boolean') {
        return sendJson(res, 400, { error: 'completed debe ser booleano' });
      }
      const updated = { ...task };
      if (body.title !== undefined) updated.title = body.title.trim();
      if (body.completed !== undefined) updated.completed = body.completed;
      updated.updatedAt = new Date().toISOString();
      tasks.set(id, updated);
      return sendJson(res, 200, updated);
    }
    if (req.method === 'DELETE') {
      tasks.delete(id);
      res.writeHead(204);
      return res.end();
    }
  }
  return sendJson(res, 404, { error: 'Ruta no encontrada' });
});

server.listen(port, '0.0.0.0', () => console.log('API listening on ' + port));
function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
