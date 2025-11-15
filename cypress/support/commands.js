Cypress.Commands.add('login', (nickname, password) => {
  cy.session([nickname, password], () => {
    cy.visit('/login');
    cy.get('input[name="nickname"]').type(nickname);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });
});
