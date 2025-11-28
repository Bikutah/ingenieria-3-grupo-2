// cypress/e2e/smoke.cy.ts
describe('Smoke test de la app', () => {
  it('la app carga y muestra el texto esperado', () => {
    // 1) Entrar a la raíz
    cy.visit('/');

    // 2) Verificar que hay algún texto que SIEMPRE debería estar
    //    Cambiá "Mi App" por algo que veas fijo en tu home: un título, un botón, etc.
    cy.contains('Ború, gestiona tus bondiolas').should('be.visible');
  });
});
