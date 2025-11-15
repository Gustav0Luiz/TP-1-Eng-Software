describe('Bulk Article Import', () => {
  beforeEach(() => {
    // This test requires an authenticated user.
    // Ensure a user exists from the auth test or create one.
    cy.login('testuser' + Cypress.env('uniqueId'), 'password123');
  });

  it('should allow a user to upload a BibTeX file and a ZIP of PDFs', () => {
    // Navigate to the predicted bulk import page.
    // This URL may need to be adjusted if it's different.
    cy.visit('/dashboard/submit/bulk');

    // Attach the BibTeX file
    cy.get('input[name="bibtex"]').selectFile('cypress/fixtures/test.bib', { force: true });

    // Attach the ZIP file with PDFs
    cy.get('input[name="pdfs"]').selectFile('cypress/fixtures/test.zip', { force: true });

    // Submit the form
    cy.get('button[type="submit"]').click();

    // Check for a success message on the page.
    // This assumes the page shows a confirmation after processing.
    cy.contains('Importação concluída').should('be.visible');
    cy.contains('Artigos criados: 1').should('be.visible');
  });
});
