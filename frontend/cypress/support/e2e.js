// Example of custom command
Cypress.Commands.add("login", (username, password) => {
  cy.get("#username").type(username);
  cy.get("[placeholder='Enter password']").type(password);
  cy.get("#SignIn").click();
});
// Import commands.js using ES2015 syntax:
import "./commands";
// Alternatively you can use CommonJS syntax:
// require('./commands')
require("cypress-xpath");
