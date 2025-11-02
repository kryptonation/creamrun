describe("Leasecreation", () => {
  beforeEach(() => {
    //pranav
    //visit to website
    cy.visit("http://cucumber-app-lb-1191106009.us-east-1.elb.amazonaws.com/");
    //login to website
    cy.login("allen@bat.com", "bat@123");
  });
  it.only("Verify that a Driver Owned Vehicle (DOV) Lease Can Be Created Successfully", () => {
    //click on Leases
    cy.xpath("//span[contains(text(),'Leases')]").click();
    //click on  New Leases
    cy.xpath("//a[normalize-space()='New Lease']").click();
    //click on proceed
    cy.xpath("//span[normalize-space()='Proceed']").click();
    //search VIN no
    cy.get("#vinNo").type("19UYA31581L004576");
    //click on search
    cy.xpath("(//span[normalize-space()='Search'])[1]").click();
    //click on checkox
    cy.get("input[aria-label='Row Selected undefined']").click();
    //click on submit vehcile selection
    cy.get('[aria-label="Submit Vehicle Selection"]').click();
    //search for lease id
    cy.get("#lease_id").type("1234");
    //select lease type
    cy.get("#lease_start_date").click();
    //slect lease start date
    cy.get("td[aria-label='19']").click();
    cy.xpath(
      "//span[@class='p-dropdown-label p-inputtext p-placeholder']"
    ).click();
    cy.xpath("//span[normalize-space()='DOV - Driver Owned Vehicle']").click();
    cy.get("#lease_start_date").click();
    //select per day
    cy.get('li[aria-label="T"]').click({ multiple: true });
    //select payments method
    cy.get("#payments_behind").click();
    //eneter a cancellation fee
    cy.xpath("//input[@id='cancellation_fee']").type("00");
    //clcik on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    //enetr a lease info
    cy.xpath('//span[@id="management_recommendation"]').type(111);
    cy.xpath("(//input[@id='med_lease'])[1]").type("112");
    cy.xpath("//input[@id='veh_lease']").type("1112");
    //click on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    cy.wait(2000);
    //search for SSN
    cy.get("#SSN").type("328-88-8322");
    //search on btn
    cy.get(
      "button[aria-label='Search'] span[class='p-button-label p-c']"
    ).click();
    cy.wait(2050);
    // //check on click on checkbox
    cy.xpath("//input[@aria-label='Row Selected 2']").click();
    //clcik on select driver
    cy.xpath("//span[normalize-space()='Select Driver']")
      .contains("Select Driver")
      .click();
    cy.wait(3000);
    //click on send for signature
    cy.get(
      "button[aria-label='Send for Signature'] span[class='p-button-label p-c']",
      { timeout: 50000 }
    )
      .contains("Send for Signature")
      .click();
    //click on submit lease signature
    cy.get("button[aria-label='Finish creating lease']").click();
  });
  it("test2", () => {
    //click on Leases
    cy.xpath("//span[contains(text(),'Leases')]").click();
    //click on  New Leases
    cy.xpath("//a[normalize-space()='New Lease']").click();
    //click on proceed
    cy.xpath("//span[normalize-space()='Proceed']").click();
    //search medallion no
    cy.get("#medallionNo").type("1A51");
    //click on search
    cy.xpath("(//span[normalize-space()='Search'])[1]").click();
    //click on checkox
    cy.get("input[aria-label='Row Selected undefined']").click();
    //click on submit vehcile selection
    cy.get('[aria-label="Submit Vehicle Selection"]').click();
    //search for lease id
    cy.get("#lease_id").type("1234");
    //select lease type
    cy.get("#lease_start_date").click();
    //slect lease start date
    cy.get("td[aria-label='19']").click();
    cy.xpath(
      "//span[@class='p-dropdown-label p-inputtext p-placeholder']"
    ).click();
    //select lease type
    cy.get("#dropdownItem_1").click();
    cy.get("#lease_start_date").click();
    //select per day
    cy.get('li[aria-label="T"]').click({ multiple: true });
    //select payments method
    cy.get("#payments_behind").click();
    //eneter a cancellation fee
    cy.xpath("//input[@id='cancellation_fee']").type("00");
    //clcik on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    //enetr a lease info
    cy.xpath('//span[@id="management_recommendation"]').type(111);
    cy.xpath("(//input[@id='med_lease'])[1]").type("112");
    cy.xpath("//input[@id='veh_lease']").type("1112");
    //click on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    cy.wait(2000);
    cy.get("#TLCLicenseNo").type("TLC90065");

    //search on btn
    cy.get(
      "button[aria-label='Search'] span[class='p-button-label p-c']"
    ).click();
    cy.wait(2000);
    //check on click on checkbox
    cy.xpath("//input[@aria-label='Row Selected 22']").click();
    //clcik on
    cy.xpath("//span[normalize-space()='Select Driver']").contains(
      "Select Driver"
    );
    cy.wait(2000);
    //click send for signature
    cy.get(
      "button[aria-label='Send for Signature'] span[class='p-button-label p-c']"
    ).click();
  });
  it("test 3", () => {
    //click on Leases
    cy.xpath("//span[contains(text(),'Leases')]").click();
    //click on  New Leases
    cy.xpath("//a[normalize-space()='New Lease']").click();
    //click on proceed
    cy.xpath("//span[normalize-space()='Proceed']").click();
    //search medallion no
    cy.get("#medallionNo").type("1A51");
    //click on search
    cy.xpath("(//span[normalize-space()='Search'])[1]").click();
    //click on checkox
    cy.get("input[aria-label='Row Selected undefined']").click();
    //click on submit vehcile selection
    cy.get('[aria-label="Submit Vehicle Selection"]').click();
    //search for lease id
    cy.get("#lease_id").type("1234");
    //select lease type
    cy.get("#lease_start_date").click();
    //slect lease start date
    cy.get("td[aria-label='19']").click();
    cy.xpath(
      "//span[@class='p-dropdown-label p-inputtext p-placeholder']"
    ).click();
    //select lease type
    cy.get("#dropdownItem_2").click();
    cy.get("#lease_start_date").click();
    //select per day
    cy.get('li[aria-label="T"]').click({ multiple: true });
    //select payments method
    cy.get("#payments_behind").click();
    //eneter a cancellation fee
    cy.xpath("//input[@id='cancellation_fee']").type("00");
    //clcik on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    //enetr a lease info
    cy.xpath('//span[@id="management_recommendation"]').type(111);
    cy.xpath("(//input[@id='med_lease'])[1]").type("112");
    cy.xpath("//input[@id='veh_lease']").type("1112");
    //click on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    cy.wait(2000);
    cy.get("#TLCLicenseNo").type("TLC90065");

    //search on btn
    cy.get(
      "button[aria-label='Search'] span[class='p-button-label p-c']"
    ).click();
    cy.wait(2000);
    //check on click on checkbox
    cy.xpath("//input[@aria-label='Row Selected 22']").click();
    //clcik on
    cy.xpath("//span[normalize-space()='Select Driver']").contains(
      "Select Driver"
    );
    cy.wait(2000);
    //click send for signature
    cy.get(
      "button[aria-label='Send for Signature'] span[class='p-button-label p-c']"
    ).click();
  });
  it("test 3", () => {
    //click on Leases
    cy.xpath("//span[contains(text(),'Leases')]").click();
    //click on  New Leases
    cy.xpath("//a[normalize-space()='New Lease']").click();
    //click on proceed
    cy.xpath("//span[normalize-space()='Proceed']").click();
    //search medallion no
    cy.get("#medallionNo").type("1A51");
    //click on search
    cy.xpath("(//span[normalize-space()='Search'])[1]").click();
    //click on checkox
    cy.get("input[aria-label='Row Selected undefined']").click();
    //click on submit vehcile selection
    cy.get('[aria-label="Submit Vehicle Selection"]').click();
    //search for lease id
    cy.get("#lease_id").type("1234");
    //select lease type
    cy.get("#lease_start_date").click();
    //slect lease start date
    cy.get("td[aria-label='19']").click();
    cy.xpath(
      "//span[@class='p-dropdown-label p-inputtext p-placeholder']"
    ).click();
    //select lease type
    cy.get("#dropdownItem_3").click();
    cy.get("#lease_start_date").click();
    //select per day
    cy.get('li[aria-label="T"]').click({ multiple: true });
    //select payments method
    cy.get("#payments_behind").click();
    //eneter a cancellation fee
    cy.xpath("//input[@id='cancellation_fee']").type("00");
    //clcik on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    //enetr a lease info
    cy.xpath('//span[@id="management_recommendation"]').type(111);
    cy.xpath("(//input[@id='med_lease'])[1]").type("112");
    cy.xpath("//input[@id='veh_lease']").type("1112");
    //click on submit
    cy.xpath("//span[normalize-space()='Submit Vehicle Details']").click();
    cy.wait(2000);
    cy.get("#TLCLicenseNo").type("TLC90065");

    //search on btn
    cy.get(
      "button[aria-label='Search'] span[class='p-button-label p-c']"
    ).click();
    cy.wait(2000);
    //check on click on checkbox
    cy.xpath("//input[@aria-label='Row Selected 22']").click();
    //clcik on
    cy.xpath("//span[normalize-space()='Select Driver']").contains(
      "Select Driver"
    );
    cy.wait(2000);
    //click send for signature
    cy.get(
      "button[aria-label='Send for Signature'] span[class='p-button-label p-c']"
    ).click();
  });
});
