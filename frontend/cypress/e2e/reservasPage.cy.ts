// cypress/e2e/reservasPage.cy.ts
/// <reference types="cypress" />

type Reserva = {
  id: number
  fecha: string
  horario: string
  cantidad_personas: string
  id_mesa: number
  id_cliente: number
  baja: boolean
  menu_reserva: null | {
    monto_seña: number
    detalles_menu: { id_producto: number; cantidad: number; precio: number }[]
  }
}

const mockReservaActiva: Reserva = {
  id: 1,
  fecha: "2025-12-24",
  horario: "21:00",
  cantidad_personas: "4",
  id_mesa: 10,
  id_cliente: 5,
  baja: false,
  menu_reserva: null,
}

const mockReservaConMenu: Reserva = {
  id: 2,
  fecha: "2025-12-31",
  horario: "22:00",
  cantidad_personas: "8",
  id_mesa: 11,
  id_cliente: 6,
  baja: false,
  menu_reserva: {
    monto_seña: 2000,
    detalles_menu: [
      { id_producto: 100, cantidad: 2, precio: 500 },
      { id_producto: 101, cantidad: 6, precio: 300 },
    ],
  },
}

const mockClientes = [
  { id: 5, nombre: "Juan Pérez", dni: "12345678", telefono: "111-222" },
  { id: 6, nombre: "Ana Gómez", dni: "87654321", telefono: "333-444" },
]

const mockSectores = [
  { id: 1, numero: "S1", nombre: "Terraza" },
  { id: 2, numero: "S2", nombre: "Salón" },
]

const mockMesas = [
  { id: 10, numero: "M10", cantidad: 4, id_sector: 1, baja: false },
  { id: 11, numero: "M11", cantidad: 8, id_sector: 2, baja: false },
]

const mockProductos = [
  { id: 100, nombre: "Pizza Muzzarella", precio: 500, cm3: null },
  { id: 101, nombre: "Gaseosa 1.5L", precio: 300, cm3: 1500 },
]

describe("ReservasPage - flujos básicos", () => {
  const interceptListReservas = (items: Reserva[] = [mockReservaActiva, mockReservaConMenu]) => {
    cy.intercept("GET", "**/reservas*", {
      statusCode: 200,
      body: {
        items,
        page: 1,
        size: 50,
        pages: 1,
        total: items.length,
      },
    }).as("getReservas")
  }

  const interceptCombosBasicos = () => {
    cy.intercept("GET", "**/clientes*", {
      statusCode: 200,
      body: {
        items: mockClientes,
        page: 1,
        size: 50,
        pages: 1,
        total: mockClientes.length,
      },
    }).as("getClientes")

    cy.intercept("GET", "**/sectores*", {
      statusCode: 200,
      body: {
        items: mockSectores,
        page: 1,
        size: 50,
        pages: 1,
        total: mockSectores.length,
      },
    }).as("getSectores")

    cy.intercept("GET", "**/mesas*", {
      statusCode: 200,
      body: {
        items: mockMesas,
        page: 1,
        size: 50,
        pages: 1,
        total: mockMesas.length,
      },
    }).as("getMesas")

    cy.intercept("GET", "**/productos*", {
      statusCode: 200,
      body: {
        items: mockProductos,
        page: 1,
        size: 50,
        pages: 1,
        total: mockProductos.length,
      },
    }).as("getProductos")
  }

  beforeEach(() => {
    interceptListReservas()
    interceptCombosBasicos()
    cy.visit("/reservas")
    cy.wait("@getReservas")
  })

  it("muestra listado inicial y paginación básica", () => {
    cy.get('[data-cy="page-reservas"]').should("exist")
    cy.get('[data-cy="title-reservas"]').should("contain", "Gestión de Reservas")

    cy.get('[data-cy="row-reserva"]').should("have.length", 2)

    cy.get('[data-cy="row-reserva"]').first().within(() => {
      cy.get('[data-cy="cell-reserva-id"]').should("contain", "1")
      cy.get('[data-cy="cell-reserva-fecha"]').should("contain", "2025-12-24")
    })

    cy.get('[data-cy="texto-rango-reservas"]').should("contain", "Mostrando 1–2 de 2")

    cy.get('[data-cy="select-page-size"]').click()
    cy.get('[data-cy="page-size-10"]').click()
    // si tu componente vuelve a llamar a list() al cambiar size:
    cy.wait("@getReservas")
  })

  it("abre modal de nueva reserva y muestra errores al dejar campos vacíos", () => {
    cy.get('[data-cy="btn-nueva-reserva"]').click()
    cy.get('[data-cy="dialog-reserva"]').should("exist")
    cy.get('[data-cy="dialog-title-reserva"]').should("contain", "Nueva Reserva")

    // Forzar touched
    cy.get('[data-cy="input-fecha"]').focus().blur()
    cy.get('[data-cy="input-horario"]').focus().blur()
    cy.get('[data-cy="input-cantidad_personas"]').focus().blur()
    cy.get('[data-cy="combo-mesa-trigger"]').focus().blur()
    cy.get('[data-cy="combo-cliente-trigger"]').focus().blur()

    cy.get('[data-cy="error-fecha"]').should("contain", "La fecha es obligatoria")
    cy.get('[data-cy="error-horario"]').should("contain", "El horario es obligatorio")
    cy.get('[data-cy="error-cantidad-personas"]').should("contain", "Obligatorio")
  })

  it("crea una reserva sin menú", () => {
    cy.intercept("POST", "**/reservas*", (req) => {
      expect(req.body.fecha).to.eq("2025-12-20")
      expect(req.body.horario).to.eq("20:30")
      expect(req.body.cantidad_personas).to.eq("2")
      expect(req.body.menu_reserva).to.be.null
      req.reply({
        statusCode: 201,
        body: { id: 3, ...req.body },
      })
    }).as("createReserva")

    cy.get('[data-cy="btn-nueva-reserva"]').click()

    cy.get('[data-cy="input-fecha"]').type("2025-12-20")
    cy.get('[data-cy="input-horario"]').type("20:30")
    cy.get('[data-cy="input-cantidad_personas"]').clear().type("2")

    // Sector (cualquiera)
    cy.get('[data-cy="combo-sector-trigger"]').click()
    cy.get('[data-cy="combo-sector-opcion-1"]').click()

    // Mesa
    cy.get('[data-cy="combo-mesa-trigger"]').click()
    cy.get('[data-cy="combo-mesa-opcion-10"]').click()

    // Cliente
    cy.get('[data-cy="combo-cliente-trigger"]').click()
    cy.get('[data-cy="combo-cliente-opcion-5"]').click()

    // Menú apagado por defecto → no tocamos chk-has-menu

    cy.get('[data-cy="btn-submit-reserva"]').should("not.be.disabled").click()

    cy.wait("@createReserva")
    cy.wait("@getReservas") // recarga listado (si tu código lo hace)

    cy.get('[data-cy="page-reservas"]').should("exist")
  })

  it("crea una reserva con menú, productos y seña", () => {
    cy.intercept("POST", "**/reservas*", (req) => {
      expect(req.body.menu_reserva).to.exist
      expect(req.body.menu_reserva.detalles_menu).to.have.length(1)
      expect(req.body.menu_reserva.detalles_menu[0].id_producto).to.eq(100)
      expect(req.body.menu_reserva.detalles_menu[0].cantidad).to.eq(3)
      expect(req.body.menu_reserva.monto_seña).to.eq(1500)
      req.reply({
        statusCode: 201,
        body: { id: 4, ...req.body },
      })
    }).as("createReservaMenu")

    cy.get('[data-cy="btn-nueva-reserva"]').click()

    cy.get('[data-cy="input-fecha"]').type("2025-12-31")
    cy.get('[data-cy="input-horario"]').type("22:00")
    cy.get('[data-cy="input-cantidad_personas"]').clear().type("6")

    cy.get('[data-cy="combo-sector-trigger"]').click()
    cy.get('[data-cy="combo-sector-opcion-2"]').click()

    cy.get('[data-cy="combo-mesa-trigger"]').click()
    cy.get('[data-cy="combo-mesa-opcion-11"]').click()

    cy.get('[data-cy="combo-cliente-trigger"]').click()
    cy.get('[data-cy="combo-cliente-opcion-6"]').click()

    // Activar menú
    cy.get('[data-cy="chk-has-menu"]').click()

    // Agregar producto al menú
    cy.get('[data-cy="btn-add-producto-menu"]').click()
    cy.get('[data-cy="combo-producto-opcion-100"]').click()

    // Cambiar cantidad
    cy.get('[data-cy="input-menu-cant-100"]').clear().type("3")

    // Seña
    cy.get('[data-cy="input-monto-senia"]').clear().type("1500")

    cy.get('[data-cy="btn-submit-reserva"]').should("not.be.disabled").click()

    cy.wait("@createReservaMenu")
    cy.wait("@getReservas")
  })

  it("edita una reserva existente", () => {
    cy.intercept("PUT", "**/reservas/1*", (req) => {
      expect(req.body.horario).to.eq("22:30")
      req.reply({
        statusCode: 200,
        body: { ...mockReservaActiva, horario: req.body.horario },
      })
    }).as("updateReserva")

    // Buscar la fila con id=1 y click en editar
    cy.get('[data-cy="row-reserva"]')
      .contains("1")
      .closest('[data-cy="row-reserva"]')
      .within(() => {
        cy.get('[data-cy="btn-edit-reserva"]').click()
      })

    cy.get('[data-cy="dialog-reserva"]').should("exist")
    cy.get('[data-cy="input-horario"]').clear().type("22:30")

    cy.get('[data-cy="btn-submit-reserva"]').should("not.be.disabled").click()
    cy.wait("@updateReserva")

    cy.get('[data-cy="dialog-reserva"]').should("not.exist")
  })

  it("elimina una reserva", () => {
    cy.intercept("DELETE", "**/reservas/1*", {
      statusCode: 204,
      body: {},
    }).as("deleteReserva")

    cy.get('[data-cy="row-reserva"]').first().within(() => {
      cy.get('[data-cy="btn-delete-reserva"]').click()
    })

    cy.get('[data-cy="dialog-delete-reserva"]').should("exist")
    cy.get('[data-cy="btn-confirm-delete-reserva"]').click()

    cy.wait("@deleteReserva")
    cy.get('[data-cy="dialog-delete-reserva"]').should("not.exist")
  })

  it("aplica filtros y recarga la tabla", () => {
    cy.intercept("GET", "**/reservas*id=1*", {
      statusCode: 200,
      body: {
        items: [mockReservaActiva],
        page: 1,
        size: 50,
        pages: 1,
        total: 1,
      },
    }).as("getReservasFiltradas")

    cy.get('[data-cy="filter-id-eq"]').type("1")
    cy.get('[data-cy="btn-aplicar-filtros"]').click()
    cy.wait("@getReservasFiltradas")

    cy.get('[data-cy="row-reserva"]').should("have.length", 1)
    cy.get('[data-cy="row-reserva"]').first().within(() => {
      cy.get('[data-cy="cell-reserva-id"]').should("contain", "1")
    })
  })
})
