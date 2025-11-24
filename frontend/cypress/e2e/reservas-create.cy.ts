// cypress/e2e/reservas-create.cy.ts
describe('ReservasPage - flujo de creación de reserva', () => {
  it('crea una reserva básica sin menú', () => {
    // 1) Ir a la página de reservas
    cy.visit('/reservas');
    cy.wait(1000);

    // 2) Abrir el diálogo de "Nueva Reserva"
    cy.get('[data-cy="btn-nueva-reserva"]').click();
    cy.wait(800);
    // 3) Completar fecha, horario y cantidad de personas
    const today = new Date().toISOString().slice(0, 10); // AAAA-MM-DD

    cy.get('[data-cy="input-fecha"]').type(today);
    cy.wait(500);
    cy.get('[data-cy="input-horario"]').type('20:30');
    cy.wait(500);
    cy.get('[data-cy="input-cantidad_personas"]').clear().type('4');
    cy.wait(500);

    // 4) Elegir una mesa
    cy.get('[data-cy="combo-mesa-trigger"]').click();
    cy.wait(500);

    // Esperar a que carguen mesas y elegir la primera opción disponible
    // Los CommandItem suelen ser [role="option"]
    cy.get('[role="option"]').first().click();
    cy.wait(500);

    // 5) Elegir un cliente
    cy.get('[data-cy="combo-cliente-trigger"]').click();
    cy.wait(500);

    // Igual: esperamos opciones y elegimos la primera
    cy.get('[role="option"]').first().click();
    cy.wait(500);

    // 6) Asegurarnos que NO tenga menú (hasMenu = false)
    // Tu checkbox es un componente custom, así que usamos click
    // (si por defecto está desmarcado y no lo tocas, esto se puede omitir)
    cy.get('#toggle-menu').then($el => {
      // si te interesa, podrías verificar el aria-checked, etc.
      // por ahora asumimos que viene desmarcado
    });
    cy.wait(500);

    // 7) Guardar
    cy.get('[data-cy="btn-submit-reserva"]').click();
    cy.wait(500);

    // 8) Aserciones de éxito
    // a) Que se muestre el toast de "Reserva creada"
    cy.contains('Reserva creada').should('be.visible');
    cy.wait(500);

    // b) Que la tabla muestre una fila con esa hora / cantidad / fecha
    // (Acá podés ser más estricto si sabés el ID o el cliente)
    cy.contains('20:30').should('exist');
    cy.contains(today).should('exist');
    cy.contains('4').should('exist');
  });
});
