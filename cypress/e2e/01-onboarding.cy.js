// ----------------------------------------------------------------------------- 
// Cenário geral:
// 1) Cria um usuário novo via /registrar e garante que o login automático funciona.
// 2) Navega até a área autenticada e realiza uma importação em massa via BibTeX.
// 3) Confirma os artigos importados e resolve o modal que aparece ao final.
// 4) Retorna ao dashboard e remove um dos artigos para limpar o ambiente.
// -----------------------------------------------------------------------------
// Teste 01: garante o fluxo completo de registro + login usando somente a interface
// Objetivo: validar se um usuário consegue criar conta, autenticar e acessar o dashboard privado.
describe('Fluxo de Registro e Login', () => {
  it('registra, faz login e acessa a área privada', () => {
    const uniqueId = Date.now();
    const nickname = `novo${uniqueId}`;
    const email = `novo${uniqueId}@example.com`;
    const password = 'Senha!123';
    const bulkEventName = `Cypress Automation Expo ${uniqueId}`;
    const dynamicBibPath = 'cypress/fixtures/bulk-dynamic.bib';

    // Passo 1: Cadastro do usuário usando o formulário público.
    cy.visit('/registrar');
    cy.get('#firstName').type('Teste');
    cy.get('#lastName').type('Cypress');
    cy.get('#nickname').type(nickname);
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('#confirmPassword').type(password);
    cy.get('button[type="submit"]').click();

    // Passo 2: Confirma redirecionamento imediato para a área privada.
    cy.url().should('include', `/user/${nickname}`);

    // Passo 3: Garante que o token JWT foi salvo e visita a home.
    cy.window().its('localStorage.auth_token', { timeout: 10000 }).should('match', /.+/);
    cy.get('a[href="/"]').first().click();
    cy.visit('/');

    // Passo 4: Retorna ao dashboard autenticado para iniciar a importação em massa.
    cy.visit(`/user/${nickname}`);
    cy.contains('Meus Artigos', { timeout: 15000 }).should('be.visible');

    // Passo 5: Executa a importação de dois artigos usando BibTeX + ZIP e valida o sucesso.
    cy.contains('Adicionar Artigo').click();
    cy.contains('Importar BibTeX').click();
    cy.fixture('bulk-two.bib', 'utf8').then((template) => {
      const dynamicContent = template.replace(/Cypress Automation Expo/g, bulkEventName);
      cy.writeFile(dynamicBibPath, dynamicContent);
    });
    cy.get('input[id="file-upload-Arquivo-BibTeX-(.bib)"]').selectFile(dynamicBibPath, { force: true });
    cy.get('input[id="file-upload-Arquivo-ZIP-com-PDFs"]').selectFile('cypress/fixtures/bulk-two.zip', { force: true });
    cy.contains('button', 'Importar Artigos').click();
    cy.contains('Importação Concluída', { timeout: 15000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();
    cy.contains('Bulk Test Article A', { timeout: 15000 }).should('be.visible');
    cy.contains('Bulk Test Article B', { timeout: 15000 }).should('be.visible');
    cy.contains('button', 'Continuar').click();
    cy.contains('button', 'Cancelar').click();

    // Passo 6: Volta ao dashboard e remove um dos artigos importados para finalizar.
    cy.get('a[href="/"]').first().click();
    cy.visit('/');
    cy.visit(`/user/${nickname}`);
    cy.contains('Bulk Test Article A')
      .closest('.group')
      .within(() => {
        cy.contains('button', 'Excluir').click();
      });
    cy.contains('h3', 'Excluir Artigo').parent().within(() => {
      cy.contains('button', 'Excluir').click({ force: true });
    });
    cy.contains('Bulk Test Article A', { timeout: 10000 }).should('not.exist');
  });
});
