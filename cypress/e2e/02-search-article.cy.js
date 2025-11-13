describe('Article Search', () => {
  it('should allow a user to search for an article by title', () => {
    cy.visit('/');

    // Assume there is an article with 'Test' in the title
    const searchQuery = 'Test';

    // Find the search input, type the query, and submit
    cy.get('input[placeholder*="Buscar artigos"]').type(searchQuery);
    cy.get('button').contains('Buscar').click();

    // The URL should update to reflect the search
    cy.url().should('include', `/buscar?q=${searchQuery}`);

    // The results area should show that results were found
    cy.get('main').should('contain.text', 'Resultados da busca');
  });
});
