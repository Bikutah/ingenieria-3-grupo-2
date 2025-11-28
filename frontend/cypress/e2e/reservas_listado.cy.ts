// cypress/e2e/reservas_listado.cy.ts

describe("Reservas - listado básico", () => {
  const mockReservas = [
    {
      id: 1,
      fecha: "2025-12-24",
      horario: "21:00",
      cantidad_personas: "4",
      id_mesa: 10,
      id_cliente: 5,
      baja: false,
      menu_reserva: null,
    },
    {
      id: 2,
      fecha: "2025-12-31",
      horario: "22:00",
      cantidad_personas: "2",
      id_mesa: 11,
      id_cliente: 7,
      baja: true,
      menu_reserva: null,
    },
  ];

  it("muestra la tabla con reservas cuando la API devuelve datos", () => {
    // Stub del GET /reservas
    cy.intercept("GET", "**/reservas*", {
      statusCode: 200,
      body: {
        items: mockReservas,
        page: 1,
        size: 50,
        pages: 1,
        total: mockReservas.length,
      },
    }).as("getReservas");

    // Visitar la página de reservas (ajustá la URL si hace falta)
    cy.visit("/reservas");

    // Esperar a que cargue la API
    cy.wait("@getReservas");

    // Verificamos que se ve el título
    cy.contains("Gestión de Reservas").should("be.visible");

    // Verificamos que la tabla exista
    cy.get("table").should("exist");

    // Verificamos que haya tantas filas como items
    cy.get("tbody tr").should("have.length", mockReservas.length);

    // Chequear contenido de la primera fila
    cy.get("tbody tr").eq(0).within(() => {
      cy.contains("1");           // ID
      cy.contains("2025-12-24");  // Fecha
      cy.contains("21:00");       // Horario
      cy.contains("4");           // Personas
      cy.contains("5");           // ID cliente
      cy.contains("10");          // Mesa
      cy.contains("Activa");      // Estado (según tu chip)
    });

    // Chequear contenido de la segunda fila (cancelada)
    cy.get("tbody tr").eq(1).within(() => {
      cy.contains("2");
      cy.contains("2025-12-31");
      cy.contains("22:00");
      cy.contains("2");
      cy.contains("7");
      cy.contains("11");
      cy.contains("Cancelada");
    });

    // (Opcional) Verificar el texto de rango si lo tenés
    cy.contains("Mostrando 1–2 de 2").should("exist");
  });

  it("muestra mensaje de vacío cuando la API devuelve lista vacía", () => {
    cy.intercept("GET", "**/reservas*", {
      statusCode: 200,
      body: {
        items: [],
        page: 1,
        size: 50,
        pages: 1,
        total: 0,
      },
    }).as("getReservasVacio");

    cy.visit("/reservas");
    cy.wait("@getReservasVacio");

    // No debería haber filas con datos
    cy.get("tbody tr").should("have.length", 1); // la fila del mensaje vacío

    // Chequear el texto de "no hay reservas"
    cy.contains("No hay reservas cargadas.").should("be.visible");
  });
});
