// -----------------------------------------------------------------------------
// Teste de integração simplificado:
// 1) Registra um novo usuário na tela pública.
// 2) Cadastra um artigo manual básico (com PDF gerado em memória).
// 3) Usa a busca pública pelo título para confirmar que o artigo aparece.
// -----------------------------------------------------------------------------
describe('Fluxo rápido de cadastro e busca', () => {
  it('registra, adiciona artigo manual e confirma na busca', () => {
    const suffix = Date.now();
    const credentials = {
      nickname: `mini${suffix}`,
      email: `mini${suffix}@example.com`,
      password: 'Senha!123',
    };
    const articleTitle = `Mini Artigo ${suffix}`;
    const eventName = `Mini Evento ${suffix}`;
    const editionYear = 2028;

    // Passo 1: fluxo de registro via formulário público.
    cy.visit('/registrar');
    cy.get('#firstName').type('Mini');
    cy.get('#lastName').type('Fluxo');
    cy.get('#nickname').type(credentials.nickname);
    cy.get('#email').type(credentials.email);
    cy.get('#password').type(credentials.password);
    cy.get('#confirmPassword').type(credentials.password);
    cy.get('button[type="submit"]').click();
    cy.url().should('include', `/user/${credentials.nickname}`);

    // Passo 2: cadastro manual de um artigo dentro do dashboard.
    cy.contains('Adicionar Artigo', { timeout: 10000 }).click();
    cy.contains('Cadastro Manual').click();
    cy.get('#title').type(articleTitle);
    cy.get('#eventName').type(eventName);
    cy.get('#year').clear().type(String(editionYear));
    cy.get('#pdf').selectFile(
      {
        contents: Cypress.Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF'),
        fileName: 'mini-artigo.pdf',
        mimeType: 'application/pdf',
      },
      { force: true }
    );
    cy.get('#abstract').type('Artigo mínimo para o teste rápido.');
    cy.get('#authors').type('Mini Teste');
    cy.get('#startPage').type('1');
    cy.get('#endPage').type('5');
    cy.contains('button', 'Cadastrar Artigo').click();
    cy.contains('Sucesso!', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();
    cy.contains(articleTitle, { timeout: 10000 }).should('be.visible');

    // Passo 3: acessa a busca pública e procura pelo título recém cadastrado.
    cy.get('a[href="/"]').first().click();
    cy.visit('/');
    cy.get('#search-q').type(articleTitle);
    cy.get('select[name="field"]').select('title');
    cy.contains('button', 'Buscar').click();
    cy.url().should('include', '/buscar');
    cy.contains(articleTitle, { timeout: 10000 }).should('be.visible');
  });
});
