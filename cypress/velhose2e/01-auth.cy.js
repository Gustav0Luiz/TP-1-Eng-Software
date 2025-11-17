describe('Authentication Flow', () => {
  it('should allow a user to register and then log in', () => {
    const uniqueId = Date.now();
    const nickname = `testuser${uniqueId}`;
    const email = `test${uniqueId}@example.com`;
    const password = 'password123';

    // --- Registration ---
    cy.visit('/registrar');
    cy.get('#firstName').type('Test');
    cy.get('#lastName').type('User');
    cy.get('#nickname').type(nickname);
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('#confirmPassword').type(password);
    cy.get('button[type="submit"]').click();

    // Após registro a interface redireciona para o login
    cy.url().should('include', '/login');

    // --- Login ---
    cy.get('#nickname').type(nickname);
    cy.get('#password').type(password);
    cy.get('button[type="submit"]').click();

    // Confirma que o token foi salvo
    cy.window()
      .its('localStorage.auth_token')
      .should('match', /.+/);

    // Volta para a home usando o link da logo (fluxo real do usuário)
    cy.get('a[href="/"]').first().click();
    cy.visit('/');

    // Agora acessa a página privada, que já reconhece o usuário logado
    cy.visit(`/user/${nickname}`);
    cy.contains('Meus Artigos', { timeout: 10000 }).should('be.visible');
  });
});
