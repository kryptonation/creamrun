import {
  convertDateFormat,
  generateDMVLicenseNumber,
  generateMedallionNumber,
  generateVIN,
  loginToPage,
  selectDate,
  selectDropDownInList,
  selectTime,
  selectYear,
  uploadDocument,
  uploadDocumentWithDocType,
} from "../utilities/genericUtils.js";

describe("New Medallion", () => {
  beforeEach(() => {
    //visit to website
    cy.visit(
      "http://carrot-app-lb-988134161.us-east-1.elb.amazonaws.com/login"
    );
    //login to website
    cy.login("alkema@bat.com", "bat@123");
  });
  it("Verify that after creating new medallion show in manage medallion", () => {
    const medallionDetails = {
      medallionOwnerName: "John A Doe",
      medallionNumber: generateMedallionNumber(),
      merchantName: "Pranav Patii",
      merchantBank: "HSBC",
      // medallionType: "Regular",
      medallionType: "WAV",
    };
    //Go to new medallions page
    cy.get('[class="sidebar scroll-bar"]').contains("Medallion").click();
    cy.get('[class="sidebar scroll-bar"]').contains("New Medallion").click();
    cy.get('[aria-label="Proceed"]').click();

    //Search for medallion with the owner name
    cy.get('[id="medallionOwnerName"]').type(
      medallionDetails.medallionOwnerName
    );
    cy.get('[type="submit"]').click();
    cy.wait(2050);
    cy.xpath("//button[@data-testid='medallion-grid-status']").click();
    //click on add medallion
    cy.xpath("//span[normalize-space()='Add Medallion']", {
      timeout: 10000,
    }).click();
    //fill medallion details
    cy.get("#medallionNumber").type(medallionDetails.medallionNumber);
    selectDropDownInList({
      locator: ".p-dropdown-label.p-inputtext.p-placeholder",
      dropDownText: medallionDetails.medallionType,
    });
    // select last renwwal date
    cy.get("#lastRenewalDate").click();
    cy.wait(100);
    for (let i = 0; i < 4; i++) {
      cy.get("button[aria-label='Previous Month']").click();
    }
    cy.xpath("(//span[normalize-space()='8'])[1]").click();
    //select valid from
    cy.get("#validFromDate", { timeout: 100 }).click();
    cy.get(".p-datepicker-today").click();
    //select valid to
    cy.get("#validToDate").click();
    for (let i = 0; i < 4; i++) {
      cy.get("button[aria-label='Next Month']").first().click();
    }
    cy.get("td[aria-label='8'] span[aria-selected='false']").click();
    //upload renewal receipt
    cy.xpath("//div[7]//div[1]//span[1]//div[1]//div[1]//span[1]").click();
    //select the doc type
    cy.get("#documentDate", { timeout: 100 }).click();
    cy.get("td[aria-label='20'] span[aria-selected='false']").click();
    //click on upload
    cy.get(".b-upload-click-text").selectFile(
      "cypress/fixtures/Renewal Liscense Mock.pdf",
      { action: "drag-drop" }
    );
    //click on attach file
    cy.xpath("//button[@aria-label='Attach File']", { timeout: 1000 }).click();
    //click on submit and procced to next page
    cy.get("[aria-label='Submit'] ").click();
    cy.wait(10000);
    cy.get("button[aria-label='Submit']").click();
    //Enter the Lease Details
    //enter a merchant name
    cy.get("#merchant_name").type(medallionDetails.merchantName);
    //enter a merchant bank name
    cy.get("#merchant_bank").type(medallionDetails.merchantBank);
    //select date for contract start date
    cy.get("#contract_start_date", { timeout: 100 }).click();
    cy.xpath("//span[normalize-space()='14']").click();
    //select date for contract end date
    cy.get("#contract_end_date").click();
    for (let i = 0; i < 4; i++) {
      cy.xpath("//button[@aria-label='Next Month']").first().click();
    }
    cy.xpath("//span[normalize-space()='17']").click();
    //select contract between person
    cy.get(".p-dropdown-label.p-inputtext.p-placeholder").click();
    //select in person
    cy.xpath("//span[normalize-space()='In Person']").click();
    //select lease signed date
    cy.get("#lease_signed_date").click();
    cy.get(".p-datepicker-today > span").click();
    cy.get("#accept").click();
    cy.get("button[aria-label='Submit'] ").click();
    //assert message
    cy.xpath(
      "(//span[normalize-space()='Medallion Creation Successful'])[1]"
    ).should("be.visible", "Medallion Creation Successful");
  });
});
