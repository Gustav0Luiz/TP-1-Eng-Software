// -----------------------------------------------------------------------------
// Roteiro deste teste:
// 1) Cria um usuário, acessa o dashboard e cadastra um artigo manualmente.
// 2) Vai até a home pública e utiliza o formulário de busca para localizar o artigo pelo título.
// 3) Retorna ao dashboard privado, exclui o artigo e confirma a ausência na listagem.
// 4) Reexecuta a busca pública para garantir que o resultado realmente sumiu.
// -----------------------------------------------------------------------------
function createArticle(articleTitle, eventName, editionYear) {
  cy.contains('Adicionar Artigo', { timeout: 10000 }).click();
  cy.contains('Cadastro Manual').click();

  cy.get('#title').type(articleTitle);
  cy.get('#eventName').type(eventName);
  cy.get('#year').clear().type(String(editionYear));
  cy.get('#pdf').selectFile(
    {
      contents: Cypress.Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n%%EOF'),
      fileName: 'busca-artigo.pdf',
      mimeType: 'application/pdf',
    },
    { force: true }
  );
  cy.get('#abstract').type('Artigo criado para testar a busca pública.');
  cy.get('#authors').type('Grace Hopper; Linus Torvalds');
  cy.get('#startPage').type('5');
  cy.get('#endPage').type('12');
  cy.contains('button', 'Cadastrar Artigo').click();
  cy.contains(articleTitle, { timeout: 15000 }).should('be.visible');
}

describe('Busca pública e remoção de artigo', () => {
  it('permite localizar e remover um artigo cadastrado', () => {
    const suffix = Date.now();
    const credentials = {
      nickname: `search${suffix}`,
      email: `search${suffix}@example.com`,
      password: 'Senha!123',
    };
    const articleTitle = `Artigo Público ${suffix}`;
    const eventName = `Busca Evento ${suffix}`;
    const editionYear = 2030 + (suffix % 5);

    // Passo 1: registra o usuário que fará toda a operação.
    cy.visit('/registrar');
    cy.get('#firstName').type('Busca');
    cy.get('#lastName').type('Remocao');
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
    // Passo 2: cria o artigo manualmente usando o helper acima.
    createArticle(articleTitle, eventName, editionYear);

    // Passo 3: navega para a busca pública e filtra pelo título para achar o artigo.
    cy.visit('/');
    cy.get('#search-q').type(articleTitle);
    cy.get('select[name="field"]').select('title');
    cy.contains('button', 'Buscar').click();
    cy.url().should('include', '/buscar');
    cy.contains(articleTitle, { timeout: 10000 }).should('be.visible');

    // Passo 4: retorna ao dashboard autenticado e exclui o artigo localizado.
    cy.visit(`/user/${credentials.nickname}`);
    cy.contains(articleTitle)
      .closest('.group')
      .within(() => {
        cy.contains('button', 'Excluir').click();
      });

    cy.contains('h3', 'Excluir Artigo').parent().within(() => {
      cy.contains('button', 'Excluir').click({ force: true });
    });

    cy.contains(articleTitle, { timeout: 10000 }).should('not.exist');

    // Passo 5: executa a busca novamente e espera um estado sem resultados.
    cy.visit(`/buscar?q=${encodeURIComponent(articleTitle)}&field=title`);
    cy.contains('Nenhum resultado encontrado', { timeout: 10000 }).should('be.visible');
  });
});
