/* global cy, describe, expect, it */
describe("Gamemaster can create a new Agent", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.disableIntercepts();
    // Wait for page to load
    // cy.log(Cypress.env("ADMIN_PASSWORD")):
    cy.get("body").should("exist");
    cy.get('select[name="userid"] option').should("be.visible")
    cy.loginAsGM()

    cy.url().then((url) => {
      if (url.includes("/auth")) {
        cy.log("need to login");
        cy.get(".password").should("be.visible");
        cy.get(".password").type(Cypress.env("ADMIN_PASSWORD"));

        cy.get("body")
          .contains("Log In")
          .should("be.visible")
          .click({ force: true });
        cy.wait(300);
        cy.visit("/setup");
      }
    });

    cy.url().then((url) => {
      if (url.includes("/setup")) {
        cy.log("need to open a world");
        cy.get("body")
          .contains("simple_requests")
          .should("be.visible")
          .rightclick({ force: true });
        cy.get("body")
          .contains("Launch")
          .should("be.visible")
          .click({ force: true });
        cy.visit("/game");
      }
    });
    cy.get(".join").should("be.visible");
  });

  it("passes", () => {
    cy.loginViaUi({ name: "Gamemaster" });
    cy.turnOffWarningsIfTheyExist();

    cy.get("#sidebar-tabs").within(() => {
      cy.get("a[data-tab=actors]").click();
    });

    cy.window().then((win) => {
      const actorName = "Abdul";

      const existingActors = win.game.actors
        .filter((a) => a.name === actorName)
        .map((a) => a.id);
      cy.get("button").contains("Create Actor").click();
      cy.get("select[name=type]").select("agent");
      cy.get("select[name=type]").should("have.value", "agent");
      cy.get("input[name=name]")
        .type(actorName)
        .then(() => {
          cy.get("button").contains("Create New Actor").click();

          cy.get(".deltagreen.sheet.agent-sheet")
            .should("be.visible")
            .then(() => {
              cy.get(".deltagreen.sheet.agent-sheet input[name=name]")
                .first()
                .should("have.value", actorName);
              const newActors = win.game.actors
                .filter((a) => a.name === actorName)
                .map((a) => a.id)
                .filter((x) => !existingActors.includes(x));
              expect(newActors.length).to.equal(1);
              const actor = win.game.actors.get(newActors[0]);
              actor.sheet.close();
              actor.delete();
            });
        });
    });
  });
});
