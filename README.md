# Pruebas de API con Cypress y GitHub Actions

Demo educativa de una API REST de tareas. Cypress valida endpoints HTTP y GitHub Actions automatiza la suite en cada push y pull request a main.

## Ejecutar

Requisitos: Node.js 22 o superior.

```bash
npm ci
npm start
```

En otra terminal: `npm run test:api`. La API escucha en http://localhost:3000.

## Rutas

GET /health · GET /api/tasks · POST /api/tasks · GET /api/tasks/:id · PATCH /api/tasks/:id · DELETE /api/tasks/:id

La demo guarda datos en memoria, por lo que se reinician al reiniciar el servidor.

## Automatización y despliegue

`.github/workflows/api-tests.yml` ejecuta Cypress en GitHub Actions. `render.yaml` prepara el despliegue en Render y comprueba `/health`. Conecta el repositorio a Render para asignar una URL pública.

## Referencias

- [Artículo para Medium](docs/articulo-medium.md)
- [Cypress API testing](https://docs.cypress.io/app/guides/api-testing)
- [GitHub Actions para Node.js](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [Desplegar Node en Render](https://render.com/docs/deploy-node-express-app)
