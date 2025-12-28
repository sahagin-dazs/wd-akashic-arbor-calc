describe("Tier Lists", () => {
  beforeEach(() => {
    cy.clearLocalStorage();
  });

  it("loads existing draft assignments from localStorage", () => {
    const draft = {
      id: null,
      title: "New Tier List",
      rows: [
        { id: "row-ss", label: "SS", color: "#f97316" },
        { id: "row-s", label: "S", color: "#fb923c" }
      ],
      assignments: { VW: "row-ss" },
      order: { "row-ss": ["VW"], "row-s": [] }
    };

    cy.visit("/#tier", {
      onBeforeLoad(win) {
        win.localStorage.setItem("wdtools-tier-draft", JSON.stringify(draft));
      }
    });

    cy.get(".tier-card").should("be.visible");
    cy.get(".rows-list .row-item").first().within(() => {
      cy.get(".hero-chip").should("have.length", 1);
    });
  });

  it("adds a hero via the row add popover without crashing", () => {
    cy.visit("/#tier");

    cy.get(".rows-list .row-item").first().within(() => {
      cy.get(".hero-add").click();
      cy.get(".hero-add-popover").should("be.visible");
      cy.get(".hero-add-card").first().click();
    });

    cy.get(".rows-list .row-item").first().within(() => {
      cy.get(".hero-chip").should("have.length.at.least", 1);
    });
    cy.get(".tier-card").should("be.visible");
  });
});
