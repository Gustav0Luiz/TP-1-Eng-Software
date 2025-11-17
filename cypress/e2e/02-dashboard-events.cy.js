// -----------------------------------------------------------------------------
// Visão geral do teste:
// 1) Registra um usuário novo e acessa o dashboard privado.
// 2) Cria um evento completo e, em seguida, cadastra uma edição vinculada a ele.
// 3) Remove a edição e o evento para garantir que o CRUD esteja íntegro.
// 4) Finaliza ativando um alerta público para validar o fluxo fora do dashboard.
// -----------------------------------------------------------------------------
describe('Dashboard - Eventos e Edições', () => {
  it('permite criar um evento e uma nova edição', () => {
    const suffix = Date.now();
    const nickname = `novo-event${suffix}`;
    const email = `novo-event${suffix}@example.com`;
    const password = 'Senha!123';

    // Cadastro do usuário que executará o fluxo de eventos.
    cy.visit('/registrar');
    cy.get('#firstName').type('Evento');
    cy.get('#lastName').type('Tester');
    cy.get('#nickname').type(nickname);
    cy.get('#email').type(email);
    cy.get('#password').type(password);
    cy.get('#confirmPassword').type(password);
    cy.get('button[type="submit"]').click();

    cy.url().should('include', `/user/${nickname}`);
    cy.window().its('localStorage.auth_token', { timeout: 10000 }).should('match', /.+/);
    cy.get('a[href="/"]').first().click();
    cy.visit('/');
    cy.visit(`/user/${nickname}`);

    const eventName = `Evento Cypress ${Date.now()}`;
    const editionYear = 2030;

    // Passo 1: Acessa o formulário de novo evento.
    cy.contains('Criar Evento', { timeout: 15000 }).should('be.visible').click();

    cy.contains('h3', 'Cadastrar Novo Evento')
      .parent()
      .within(() => {
        cy.get('#event_name').type(eventName);
        cy.get('#event_description').type('Evento criado automaticamente via Cypress.');
        cy.contains('button', 'Criar Evento').click();
      });
    cy.contains('Sucesso!', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();

    // Passo 2: Cadastra uma edição vinculada ao evento recém criado.
    cy.contains('Criar Edição').click();
    cy.contains('h3', 'Cadastrar Nova Edição')
      .parent()
      .within(() => {
        cy.get('#edition_event_name').type(eventName);
        cy.get('#edition_year').clear().type(editionYear.toString());
        cy.get('#edition_local').type('Cypress City');
        cy.get('#edition_description').type('Edição validada pela suíte E2E.');
        cy.contains('button', 'Criar Edição').click();
      });
    cy.contains('Sucesso!', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();

    cy.contains(eventName, { timeout: 10000 }).should('exist');
    cy.contains(editionYear.toString(), { timeout: 10000 }).should('exist');

    // Passo 3a: Remove a edição criada para validar a exclusão.
    cy.contains('h2', 'Edições Criadas')
      .parent()
      .parent()
      .within(() => {
        cy.contains('.group', eventName)
          .within(() => {
            cy.contains('button', 'Excluir').click();
          });
      });
    cy.contains('h3', 'Excluir Edição').parent().within(() => {
      cy.contains('button', 'Excluir').click({ force: true });
    });
    cy.contains('Excluído', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();
    cy.contains('h2', 'Edições Criadas')
      .parent()
      .parent()
      .within(() => {
        cy.contains(eventName).should('not.exist');
      });

    // Passo 3b: Remove o evento principal logo depois.
    cy.contains('h2', 'Eventos Criados')
      .parent()
      .parent()
      .within(() => {
        cy.contains('.group', eventName)
          .within(() => {
            cy.contains('button', 'Excluir').click();
          });
      });
    cy.contains('h3', 'Excluir Evento').parent().within(() => {
      cy.contains('button', 'Excluir').click({ force: true });
    });
    cy.contains('Excluído', { timeout: 10000 }).should('be.visible');
    cy.contains('button', 'Fechar').click();
    cy.contains('h2', 'Eventos Criados')
      .parent()
      .parent()
      .within(() => {
        cy.contains(eventName).should('not.exist');
      });

    // Passo 4: Acessa a tela pública de alertas e cadastra um novo alerta.
    cy.get('a[href="/"]').first().click();
    cy.visit('/');
    cy.contains('Ativar alertas por autor').click();
    cy.url().should('include', '/alertas');
    cy.get('input[placeholder="Ex.: Maria Silva"]').type(`Autor ${suffix}`);
    cy.get('input[placeholder="voce@exemplo.com"]').type(`autor${suffix}@example.com`);
    cy.contains('button', 'Cadastrar alerta').click();
    cy.contains('Cadastro realizado', { timeout: 10000 }).should('exist');
  });
});
