describe("Driver", () => {
  //pranav
  beforeEach(() => {
    //visit to website
    cy.visit("http://dev-app-lb-302201616.us-east-1.elb.amazonaws.com/login");
    //login to website
    cy.login("aklema@bat.com", "bat@123");
  });
  it("test1", () => {
    cy.wait(2000);
    // go to drivers
    cy.get('[class="sidebar scroll-bar"]').contains("Drivers").click();
    cy.wait(2000);
    cy.get('[class="sidebar scroll-bar"]').contains("New Driver").click();
    cy.url().should("include", "new-driver");
    //click on proceed
    cy.xpath("//span[normalize-space()='Proceed']").click();
    cy.wait(2000);
    //search for TLC License No
    cy.fixture("TLC").then((data) => {
      cy.xpath("//input[@id='tlcLicenseNumber']").type(data.TLCLicenseNo);
      //click on submit
      cy.xpath("//span[normalize-space()='Search']").click();
      //wait for some time to see result
      // cy.wait(4000);
      //check if the search result is displayed
      cy.xpath("//span[normalize-space()='Search']").should(
        "exist",
        "TLC90065"
      );
      //click on proceed
      cy.xpath("//span[normalize-space()='Proceed']").click();
      cy.xpath("(//*[name()='circle'])[1]").click();
      cy.wait(2000);
      cy.contains("Submit Driver Details").click();
      //enter address details
      cy.get("#addressLine1").clear().type("111245");
      cy.get("#addressLine2").clear().type("12125");
      cy.get("#city").type("abcdef");
      cy.get("#state").type("cejfjg");
      cy.get("#zip").type("413515");
      cy.get("#latitude").type("18.520430");
      cy.get("#longitude").type("73.856743");
      cy.contains("Submit Driver Details").click();
    });
  });
  // it("Test2-for invalid tc", () => {
  //   cy.fixture("TLC").then((data) => {
  //     let invalidLicenseNumbers = data.invalidLicenses;
  //     invalidLicenseNumbers.forEach((licenseNumber) => {
  //       cy.xpath("//input[@id='tlcLicenseNumber']").clear().type(licenseNumber);
  //       //click on submit
  //       cy.xpath("//span[normalize-space()='Search']").click();
  //       // cy.reload();
  //       cy.contains("TLC90065").should("not.exist");
  //     });
  //   });
  // });
});
