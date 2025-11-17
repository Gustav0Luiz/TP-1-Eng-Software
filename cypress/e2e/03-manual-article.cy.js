// -----------------------------------------------------------------------------
// Passo a passo do teste:
// 1) Registra um usuário e acessa seu dashboard privado.
// 2) Usa o formulário de cadastro manual para criar um artigo completo com PDF.
// 3) Abre o modal de detalhes para validar a visualização do artigo.
// 4) Volta ao dashboard, cria uma nova edição para o evento e confirma na interface.
// -----------------------------------------------------------------------------
describe('Dashboard - Cadastro manual de artigo', () => {
  it('adiciona um artigo e exibe o modal de detalhes', () => {
    const suffix = Date.now();
    const credentials = {
      nickname: `artigo${suffix}`,
      email: `artigo${suffix}@example.com`,
      password: 'Senha!123',
    };
    const articleTitle = `Artigo Cypress ${suffix}`;
    const eventName = `Evento Unico ${suffix}`;
    const editionYear = 2026 + (suffix % 10);

    // Passo 1: fluxo de registro para obter um usuário isolado.
    cy.visit('/registrar');
    cy.get('#firstName').type('Artigo');
    cy.get('#lastName').type('Manual');
    cy.get('#nickname').type(credentials.nickname);
    cy.get('#email').type(credentials.email);
    cy.get('#password').type(credentials.password);
    cy.get('#confirmPassword').type(credentials.password);
    cy.get('button[type="submit"]').click();

    cy.url().should('include', `/user/${credentials.nickname}`);
    cy.window().its('localStorage.auth_token', { timeout: 10000 }).should('match', /.+/);
    cy.get('a[href="/"]').first().click();
    cy.visit('/');
    cy.visit(`/user/${credentials.nickname}`);

    // Passo 2: abre o modal de cadastro manual e envia todos os campos obrigatórios.
    cy.contains('Adicionar Artigo', { timeout: 10000 }).click();
    cy.contains('Cadastro Manual').click();

    cy.get('#title').type(articleTitle);
    cy.get('#eventName').type(eventName);
    cy.get('#year').clear().type(String(editionYear));
    cy.get('#pdf').selectFile(
      {
        contents: Cypress.Buffer.from('%PDF-1.5\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF'),
        fileName: 'artigo-cypress.pdf',
        mimeType: 'application/pdf',
      },
      { force: true }
    );
    cy.get('#abstract').type('Resumo criado automaticamente para validar o fluxo.');
    cy.get('#authors').type('Ada Lovelace; Alan Turing');
    cy.get('#startPage').type('1');
    cy.get('#endPage').type('10');
    cy.contains('button', 'Cadastrar Artigo').click();
    cy.contains('Sucesso!', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();

    cy.contains(articleTitle, { timeout: 15000 }).should('be.visible');

    // Passo 3: abre o modal "Ver detalhes" para checar a renderização da ficha.
    cy.contains(articleTitle)
      .closest('.group')
      .within(() => {
        cy.contains('button', 'Ver detalhes').click({ force: true });
      });

    cy.contains('Detalhes do Artigo', { timeout: 5000 }).should('be.visible');
    cy.contains(articleTitle).should('be.visible');
    cy.contains('button', 'Fechar').click();
    cy.contains('Detalhes do Artigo').should('not.exist');

    // Volta ao menu (home), depois retorna para a página do usuário
    cy.get('a[href="/"]').first().click();
    cy.visit('/');
    cy.visit(`/user/${credentials.nickname}`);

    // Cadastra nova edição para o evento existente
    // Passo 4: cria uma nova edição para o mesmo evento, comprovando o CRUD de edições.
    cy.contains('Criar Edição').click();
    cy.contains('h3', 'Cadastrar Nova Edição')
      .parent()
      .within(() => {
        cy.get('#edition_event_name').type(eventName);
        cy.get('#edition_year').clear().type(String(editionYear + 1));
        cy.get('#edition_local').type('Cidade do Cadastro Manual');
        cy.get('#edition_description').type('Edição extra criada após o artigo.');
        cy.contains('button', 'Criar Edição').click();
      });
    cy.contains('Sucesso!', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();

    // Passo 5: confirma visualmente que a nova edição aparece no card de listagem.
    cy.contains(eventName, { timeout: 10000 }).should('exist');
    cy.contains(String(editionYear + 1)).should('exist');

    // Volta ao menu para encerrar o fluxo
    cy.get('a[href="/"]').first().click();
  });
});
