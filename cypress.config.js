const { defineConfig } = require('cypress');

module.exports = defineConfig({
  video: true,
  e2e: {
    baseUrl: process.env.API_BASE_URL || 'http://127.0.0.1:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: false,
  },
});
