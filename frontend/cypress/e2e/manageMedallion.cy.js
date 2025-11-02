describe("Manage Medallion Page", () => {
  const baseUrl = Cypress.config("baseUrl");
  const username = "alkema@bat.com";
  const password = "bat@123";

  beforeEach(() => {
    cy.visit(
      "http://carrot-app-lb-988134161.us-east-1.elb.amazonaws.com/login"
    );
    cy.intercept("POST", "**/login").as("loginRequest");
    cy.get("#username").type(username);
    cy.get("#password").type(password);
    cy.get('button[aria-label="Sign In"]').click({ force: true });
    cy.wait("@loginRequest").then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body).to.have.property(
        "message",
        "Login successful"
      );
    });
  });

  it("Medallaion renewale", () => {
    cy.get('[class="sidebar scroll-bar"]').contains("Medallion").click();
    cy.get('[class="sidebar scroll-bar"]').contains("Manage Medallion").click();
    //click on three dot
    cy.xpath("(//div[@class='three-dot-mennu'])[1]").click();
    //click on renew
    cy.xpath("(//div[@class='p-menuitem p-focus'])[1]").click();
    //click on proceed
    cy.get("button[aria-label='Proceed']").click();
    //select renewal date
    cy.get("#renewalDate").click();
    cy.get(".p-highlight[aria-selected='true']").click();
    //enter a renewale fee
    cy.get("#renewalFee").type("1000");
    //select renwale from date
    cy.get("#renewalFrom").click();
    cy.xpath("//span[@class='p-highlight']").click();
    //select renewale to
    cy.get("#renewalTo").click();
    cy.xpath("//span[normalize-space()='18']").click();
    //click on upload optn
    cy.get(
      "button[aria-label='Upload Renewal Receipt'] span[class='p-button-label p-c']"
    ).click();
    //select document date
    cy.get("#documentDate").click();
  });
  it(" Medallion MO Update Owner Adress", () => {
    const medallionAdressDetails = {
      medallionName: "4B55",
    };
    cy.get('[class="sidebar scroll-bar"]').contains("Medallion").click();
    cy.get('[class="sidebar scroll-bar"]').contains("Manage Medallion").click();
    //click on filter then search
    cy.xpath("(//button[contains(@aria-label,'Show Filter Menu')])[1]", {
      timeout: 1000,
    }).click();
    //search for medallion
    cy.get("[placeholder='Search Medallion Number']").type(
      medallionAdressDetails.medallionName
    );
    cy.get("#checkbox-0").first().click();
    cy.get(
      "button[aria-label='Apply Filter'] span[class='p-button-label p-c']"
    ).click();
    cy.get("body").click(0, 0, { force: true });
    //cick on three dot
    cy.get(
      ':nth-child(1) > :nth-child(8) > .d-flex > [data-testid="three-dot-menu"] > svg'
    ).click();
    //click on update mo address
    cy.xpath("//span[normalize-space()='Update MO Address']")
      .contains("Update MO Address")
      .click();
    //assert it
    cy.get(".header-text")
      .should("be.visible")
      .and("have.text", "Confirmation on Medallion Owner Address Update");
    cy.get("button[aria-label='Proceed']").click();
    //upload documents
    cy.get("button[aria-label='Upload Documents'][type='button']").click();
    cy.get("#documentDate").click();
    cy.get(".p-datepicker-today > span").click();
    //select doc type
    cy.get(".p-dropdown-label.p-inputtext.p-placeholder", {
      timeout: 100,
    }).click();
    cy.xpath("//span[@class='p-dropdown-item-label']").click();
    //click on upload doc
    cy.get(".b-upload-click-text").selectFile(
      "cypress/support/driving_license2.jpg",
      { action: "drag-drop" }
    );
    //click on attach doc
    cy.get("button[aria-label='Attach File']").click();
    cy.wait(1000);
    //click  on upload documents
    cy.get(
      "button[class='border-radius-0 primary-btn mt-5 p-button p-component p-button-warning'] span[class='p-button-label p-c']"
    ).click({ force: true }, { timeout: 1000 });
  });
  it("validte that by entering special character", () => {
    cy.get('[class="sidebar scroll-bar"]').contains("Medallion").click();
    cy.get('[class="sidebar scroll-bar"]').contains("Manage Medallion").click();
    //click on three dot
    cy.xpath("(//div[@class='three-dot-mennu'])[1]").click();
    //click on update mo address
    cy.xpath("//span[normalize-space()='Update MO Address']")
      .contains("Update MO Address")
      .click();
    //assert it
    cy.get(".header-text")
      .should("be.visible")
      .and("have.text", "Confirmation on Medallion Owner Address Update");
    cy.get("button[aria-label='Proceed']").click();
    //add adress 1
    cy.get("#addressLine1").type("#$%^&");
    cy.get("#addressLine2").type("$%^&");
    //add city
    cy.get("#city").type("$%^");
    //add state
    cy.get("#state").type("$$%");
    cy.get("#zip").type("%^");
    //clcik on submit
    cy.get(
      "button[aria-label='Submit Address Details'] span[class='p-button-label p-c']"
    )
      .click()
      .wait(1800);
    //click on upload documents
    cy.get(".border-radius-0 > .p-button-label").click();
    cy.xpath(
      "//span[normalize-space()='MO Owner Address update process is successful']"
    ).should("not.have.text", "MO Owner Address update process is successful");
  });
  it("Verify that a medallion can be sent to storage only when in the Available or Archived state", () => {
    const medallionAdressDetails = {
      medallionName: "4B55",
    };
    //click on medallion
    cy.xpath(
      "//span[contains(@class,'menu-link d-flex align-items-center')]//span[contains(text(),'Medallion')]"
    ).click();
    cy.wait(2050);
    //click on medallion manage
    cy.get('[href="/manage-medallion"]').click();
    //click on filter then search
    cy.xpath("(//button[contains(@aria-label,'Show Filter Menu')])[1]", {
      timeout: 1000,
    }).click();
    //search for medallion
    cy.get("[placeholder='Search Medallion Number']").type(
      medallionAdressDetails.medallionName
    );
    cy.get("#checkbox-0").first().click();
    cy.get(
      "button[aria-label='Apply Filter'] span[class='p-button-label p-c']"
    ).click();
    cy.get("body").click(0, 0, { force: true });
    cy.get(
      "tbody tr:nth-child(1) td:nth-child(7) div:nth-child(1) button:nth-child(3)"
    ).click();
    //click on proceed
    cy.get("button[aria-label='Proceed']").click();
    //select date in placed  storage
    cy.get("#datePlacedInStorage").click();
    //select date
    cy.get(".p-datepicker-today > span").click();
    //select date for rate card
    cy.get("#rateCard").click();
    cy.wait(1050);
    //select date
    cy.get(".p-datepicker-today").click({ force: true });
    //click on upload rate card
    cy.get(
      "div[class='p-icon-field p-icon-field-right'] span[class='p-input-icon']"
    ).click();
    cy.get("#documentDate").click();
    cy.get(".p-datepicker-today").click();
    // //select documents date
    cy.xpath("//span[normalize-space()='Select a Document Type']", {
      timeout: 1000,
    }).click();
    cy.xpath("//span[@class='p-dropdown-item-label']").click();
    //upload file
    cy.get(".b-upload-click-text").selectFile(
      "cypress/support/driving_license2.jpg",
      { action: "drag-drop" }
    );
    //click on submit
    cy.get("button[aria-label='Attach File']").click();
    //select print name
    cy.xpath("//span[normalize-space()='Select a Print Name']").click();
    cy.get("#dropdownItem_0").click();
    //select reason for in storage
    cy.xpath(
      "//span[normalize-space()='Select a Reason for Placing in Storage']"
    ).click();
    cy.get(
      "li[id='dropdownItem_0'] span[class='p-dropdown-item-label']"
    ).click();
    //click on generate letter and move to next page
    cy.get(
      "button[aria-label='Generate Letter'] span[class='p-button-label p-c']"
    ).click();
  });
  it.only("allocate medallion to vehcile ", () => {
    const medallionAdressDetails = {
      medallionName: "7L64",
      vinNumber: "O9JPMMRFNZT42ELPDJ",
    };
    //click on medallion
    cy.xpath(
      "//span[contains(@class,'menu-link d-flex align-items-center')]//span[contains(text(),'Medallion')]"
    ).click();
    cy.wait(2050);
    //click on medallion manage
    cy.get('[href="/manage-medallion"]').click();
    //click on filter then search
    cy.xpath("(//button[contains(@aria-label,'Show Filter Menu')])[1]", {
      timeout: 1000,
    }).click();
    //search for medallion
    cy.get("[placeholder='Search Medallion Number']").type(
      medallionAdressDetails.medallionName
    );
    cy.get("#checkbox-0").first().click();
    //click on apply filter
    cy.xpath("//span[normalize-space()='Apply Filter']").click();
    cy.wait(1050);
    cy.get("body").click(0, 0, { force: true });
    // //click on allocate medallion to vehicle
    cy.get("div[class='d-flex flex-row gap-2'] button:nth-child(1)")
      .first()
      .click();
    //enter vin number
    cy.get("#vimNumber").type(medallionAdressDetails.vinNumber);
    //click on search
    cy.get("button[aria-label='Search']").click();
    //click on check box
    cy.get("input[aria-label='All items unselected']").click();
    //click on allocate vehicle
    cy.get(
      "button[aria-label='Allocate Vehicle'] span[class='p-button-label p-c']"
    ).click();
    //click on proceed
    cy.get("button[aria-label='Proceed']").click();
  });
});
