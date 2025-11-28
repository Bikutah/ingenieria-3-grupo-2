// cypress/support/index.d.ts
declare namespace Cypress {
  interface Chainable {
    getBySel(selector: string, ...args: any[]): Chainable<JQuery<HTMLElement>>
  }
}