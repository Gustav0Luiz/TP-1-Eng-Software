describe('Viewing My Articles', () => {
  beforeEach(() => {
    // This test assumes the user from the previous tests exists and has created an article.
    cy.login('testuser' + Cypress.env('uniqueId'), 'password123');
  });

  it('should display a list of articles submitted by the user', () => {
    cy.visit('/dashboard'); // Or the specific path to 'My Articles'

    // Check that the main heading is there
    cy.contains('h1', 'Meus Artigos').should('be.visible');

    // Check if the table or list of articles contains at least one item.
    // This assumes the article from the 'create-article' test is present.
    cy.get('main').find('a[href*="/artigo/"]').should('have.length.greaterThan', 0);
  });
});
