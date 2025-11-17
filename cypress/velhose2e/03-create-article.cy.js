describe('Article Creation', () => {
  beforeEach(() => {
    // For this test to pass, a user must exist.
    // We will use the user created in the auth test or create one if needed.
    cy.login('testuser' + Cypress.env('uniqueId'), 'password123');
  });

  it('should allow an authenticated user to create a new article', () => {
    cy.visit('/dashboard/articles/new'); // Assuming this is the path

    const articleTitle = `My Test Article ${Date.now()}`;

    cy.get('input[name="title"]').type(articleTitle);
    cy.get('input[name="eventName"]').type('My Test Event');
    cy.get('input[name="year"]').type('2024');
    cy.get('textarea[name="abstract"]').type('This is a test abstract.');
    cy.get('input[name="authors"]').type('John Doe, Jane Smith');
    
    // Attach a dummy PDF file
    cy.get('input[type="file"]').selectFile({ 
      contents: Cypress.Buffer.from('dummy file content'),
      fileName: 'test.pdf', 
      mimeType: 'application/pdf' 
    }, { force: true });

    cy.get('button[type="submit"]').click();

    // Should be redirected to a success page or the article list
    cy.url().should('include', '/dashboard');
    cy.contains(articleTitle).should('be.visible');
  });
});
