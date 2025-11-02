describe("Repairdriver", () => {
  beforeEach(() => {
    //visit to website
    cy.visit("http://dev-app-lb-302201616.us-east-1.elb.amazonaws.com/login");
    //login to website
    cy.login("alkema@bat.com", "bat@123");
  });
  it("Test", () => {
    //Go to new Vehicles page
    cy.get('[class="sidebar scroll-bar"]').contains("Vehicles").click();
    cy.get('[class="sidebar scroll-bar"]').contains("Manage Vehicle").click();
    //click on three dot
    cy.xpath("(//button[@class='three-dot-mennu btn border-0'])[3]").click();
    // //click on
    cy.xpath("//span[normalize-space()='Vehicle Repairs']").click();
    //assert the heading
    cy.xpath("//div[@class='header-text']").should(
      "be.visible",
      "Confirmation on Vehicle Repairs"
    );
    //click on proceed
    cy.xpath("//span[normalize-space()='Proceed']").click();

    //select date
    cy.xpath("(//input[@id='invoice_date'])[1]").click();
    for (let i = 0; i < 5; i++) {
      cy.get(".p-datepicker-prev").click();
    }
    //select date
    cy.xpath("//span[normalize-space()='13']").click();
    //select vehicle in date
    cy.xpath("(//input[@id='vehicle_in_date'])[1]").click();
    cy.get("button[aria-label='Next Month']").click();
    cy.get(".p-highlight[aria-selected='true']").click();

    // //time picker
    cy.xpath("//input[@id='vehicle_in_time']").click();
    for (let i = 0; i < 5; i++) {
      cy.xpath("//button[@aria-label='Next Hour']//*[name()='svg']").click();
    }
    cy.get("//input[@id='vehicle_out_date']").click();
    cy.xpath("//button[@aria-label='Next Month']//*[name()='svg']").click();
    cy.get("//span[@aria-disabled='false'][normalize-space()='5']").click();
    //select vehicle out time
    cy.xpath(
      "//span[normalize-space()='Submit Vehicle Repair Details']"
    ).click();
  });
});
