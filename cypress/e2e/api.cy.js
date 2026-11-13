describe('API REST de tareas', () => {
  it('responde con estado saludable y JSON', () => {
    cy.request('/health').then((response) => {
      expect(response.status).to.eq(200);
      expect(response.headers['content-type']).to.include('application/json');
      expect(response.body).to.deep.equal({ status: 'ok', service: 'api-testing-demo' });
    });
  });

  it('rechaza una tarea sin título', () => {
    cy.request({ method: 'POST', url: '/api/tasks', body: {}, failOnStatusCode: false })
      .then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body.error).to.eq('El campo title es obligatorio');
      });
  });

  it('crea, consulta, actualiza, filtra y elimina una tarea', () => {
    let taskId;
    cy.request('POST', '/api/tasks', { title: 'Validar contrato de API' })
      .then((response) => {
        expect(response.status).to.eq(201);
        expect(response.body.title).to.eq('Validar contrato de API');
        expect(response.body.completed).to.eq(false);
        taskId = response.body.id;
        expect(taskId).to.be.a('string').and.not.be.empty;
      })
      .then(() => cy.request('GET', '/api/tasks/' + taskId))
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.id).to.eq(taskId);
      })
      .then(() => cy.request('PATCH', '/api/tasks/' + taskId, { completed: true }))
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.completed).to.eq(true);
      })
      .then(() => cy.request({ url: '/api/tasks', qs: { completed: true } }))
      .then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body.data.some((task) => task.id === taskId)).to.eq(true);
      })
      .then(() => cy.request('DELETE', '/api/tasks/' + taskId))
      .then((response) => expect(response.status).to.eq(204))
      .then(() => cy.request({ url: '/api/tasks/' + taskId, failOnStatusCode: false }))
      .then((response) => {
        expect(response.status).to.eq(404);
        expect(response.body.error).to.eq('Tarea no encontrada');
      });
  });
});
