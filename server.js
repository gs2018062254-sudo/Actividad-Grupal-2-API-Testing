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
  for await (const chunk of req) { raw += chunk; if (raw.length > 1000000) throw new Error('El cuerpo excede 1 MB'); }
  try { return raw ? JSON.parse(raw) : {}; } catch { return null; }
}
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;
  if (req.method === 'GET' && pathname === '/') {
    const page = [
      '<!doctype html><html lang="es"><head><meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1"><title>API de tareas | Cypress</title>',
      '<style>body{margin:0;background:#0b1020;color:#e8eefc;font:16px system-ui,sans-serif}main{max-width:760px;margin:60px auto;padding:24px}h1{font-size:48px;margin-bottom:8px}p{color:#aab7d1;line-height:1.7}.card{background:#131b31;border:1px solid #263450;border-radius:16px;padding:22px;margin:28px 0}.row{display:grid;grid-template-columns:80px 1fr;padding:12px 0;border-bottom:1px solid #263450}a{color:#7dd3fc}code{color:#c4b5fd}.method{color:#86efac;font-weight:bold}footer{color:#aab7d1;font-size:14px;margin-top:30px}</style>',
      '</head><body><main><small style="color:#7dd3fc">API DEMO · CYPRESS</small><h1>API de tareas</h1>',
      '<p>Servicio REST educativo para practicar pruebas de API. Consulta los endpoints desde Postman, Newman o Cypress.</p>',
      '<section class="card"><div class="row"><b class="method">GET</b><code><a href="/health">/health</a></code></div>',
      '<div class="row"><b class="method">GET</b><code><a href="/api/tasks">/api/tasks</a></code></div>',
      '<div class="row"><b class="method">POST</b><code>/api/tasks</code></div>',
      '<div class="row"><b class="method">GET</b><code>/api/tasks/:id</code></div>',
      '<div class="row"><b class="method">PATCH</b><code>/api/tasks/:id</code></div>',
      '<div class="row"><b class="method">DELETE</b><code>/api/tasks/:id</code></div></section>',
      '<p>Para crear una tarea, envía JSON como <code>{&quot;title&quot;:&quot;Probar API&quot;}</code>. Los datos son temporales y viven en memoria.</p>',
      '<footer>Código fuente: <a href="https://github.com/gs2018062254-sudo/Actividad-Grupal-2-API-Testing">GitHub</a> · Artículo: <a href="https://medium.com/@gs2018062254/pruebas-de-api-con-cypress-del-endpoint-al-pipeline-autom%C3%A1tico-9807447f8ca9">Medium</a></footer>',
      '</main></body></html>',
    ].join('');
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    return res.end(page);
  }
  if (req.method === 'GET' && pathname === '/health') return sendJson(res, 200, { status: 'ok', service: 'api-testing-demo' });
  if (pathname === '/api/tasks' && req.method === 'GET') {
    const completed = url.searchParams.get('completed');
    const data = [...tasks.values()].filter(task => completed === null || task.completed === (completed === 'true'));
    return sendJson(res, 200, { data, count: data.length });
  }
  if (pathname === '/api/tasks' && req.method === 'POST') {
    let body;
    try { body = await readJson(req); } catch { return sendJson(res, 413, { error: 'El cuerpo excede 1 MB' }); }
    if (!body || typeof body.title !== 'string' || !body.title.trim()) return sendJson(res, 400, { error: 'El campo title es obligatorio' });
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
      if (!body || (body.title === undefined && body.completed === undefined)) return sendJson(res, 400, { error: 'Indica title o completed para actualizar' });
      if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) return sendJson(res, 400, { error: 'title debe ser un texto no vacío' });
      if (body.completed !== undefined && typeof body.completed !== 'boolean') return sendJson(res, 400, { error: 'completed debe ser booleano' });
      const updated = { ...task, ...(body.title === undefined ? {} : { title: body.title.trim() }), ...(body.completed === undefined ? {} : { completed: body.completed }), updatedAt: new Date().toISOString() };
      tasks.set(id, updated);
      return sendJson(res, 200, updated);
    }
    if (req.method === 'DELETE') { tasks.delete(id); res.writeHead(204); return res.end(); }
  }
  return sendJson(res, 404, { error: 'Ruta no encontrada' });
});
server.listen(port, '0.0.0.0', () => console.log('API lista en el puerto ' + port));
function shutdown() { server.close(() => process.exit(0)); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
