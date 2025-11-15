describe('Authentication Flow', () => {
  it('should allow a user to register and then log in', () => {
    const uniqueId = Date.now();
    const nickname = `testuser${uniqueId}`;
    const email = `test${uniqueId}@example.com`;
    const password = 'password123';

    // --- Registration ---
    cy.visit('/register');
    cy.get('input[name="first_name"]').type('Test');
    cy.get('input[name="last_name"]').type('User');
    cy.get('input[name="nickname"]').type(nickname);
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Should be redirected to the login page after registration
    cy.url().should('include', '/login');

    // --- Login ---
    cy.get('input[name="nickname"]').type(nickname);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Should be redirected to the dashboard or a private page
    cy.url().should('not.include', '/login');
    cy.contains('Meus Artigos').should('be.visible');
  });
});
