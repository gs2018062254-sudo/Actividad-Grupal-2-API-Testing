const http = require('node:http');
const { randomUUID } = require('node:crypto');

const tasks = new Map();
const port = Number(process.env.PORT || 3000);

function sendJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('El cuerpo excede 1 MB');
  }
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const pathname = url.pathname;

  if (req.method === 'GET' && pathname === '/') {
    return sendJson(res, 200, {
      name: 'API de tareas',
      description: 'Demo para practicar pruebas de API con Cypress',
      documentation: 'https://github.com/gs2018062254-sudo/Actividad-Grupal-2-API-Testing',
      endpoints: [
        { method: 'GET', path: '/health', description: 'Estado del servicio' },
        { method: 'GET', path: '/api/tasks', description: 'Listar tareas; filtro opcional ?completed=true|false' },
        { method: 'POST', path: '/api/tasks', description: 'Crear tarea con {"title":"..."}' },
        { method: 'GET', path: '/api/tasks/:id', description: 'Consultar tarea' },
        { method: 'PATCH', path: '/api/tasks/:id', description: 'Actualizar título o estado' },
        { method: 'DELETE', path: '/api/tasks/:id', description: 'Eliminar tarea' },
      ],
    });
  }

  if (req.method === 'GET' && pathname === '/health') {
    return sendJson(res, 200, { status: 'ok', service: 'api-testing-demo' });
  }

  if (pathname === '/api/tasks' && req.method === 'GET') {
    const completed = url.searchParams.get('completed');
    const data = [...tasks.values()].filter((task) =>
      completed === null ? true : task.completed === (completed === 'true'),
    );
    return sendJson(res, 200, { data, count: data.length });
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    let body;
    try {
      body = await readJson(req);
    } catch {
      return sendJson(res, 413, { error: 'El cuerpo excede 1 MB' });
    }
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
      try {
        body = await readJson(req);
      } catch {
        return sendJson(res, 413, { error: 'El cuerpo excede 1 MB' });
      }
      if (!body || (body.title === undefined && body.completed === undefined)) {
        return sendJson(res, 400, { error: 'Indica title o completed para actualizar' });
      }
      if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
        return sendJson(res, 400, { error: 'title debe ser un texto no vacío' });
      }
      if (body.completed !== undefined && typeof body.completed !== 'boolean') {
        return sendJson(res, 400, { error: 'completed debe ser booleano' });
      }
      const updated = {
        ...task,
        ...(body.title === undefined ? {} : { title: body.title.trim() }),
        ...(body.completed === undefined ? {} : { completed: body.completed }),
        updatedAt: new Date().toISOString(),
      };
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

server.listen(port, '0.0.0.0', () => {
  console.log('API lista en http://0.0.0.0:' + port);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
