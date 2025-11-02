import { convertDateFormat, generateDMVLicenseNumber, generateMedallionNumber, generateVIN, loginToPage, selectDate, selectDropDownInList, selectTime, selectYear, uploadDocument, uploadDocumentWithDocType } from '../utilities/genericUtils.js';

const username = 'alkema@bat.com';
const password = 'bat@123';
const baseUrl = Cypress.config('baseUrl');
let medallionPayeeDetails = {
  bankName: 'Chase Bank',
  bankAccountNumber: '2147483647',
  payee: 'Adaline',
  addressLine1: '123 Main St',
  addressLine2: 'Suite 10512',
  city: 'Chicago',
  state: 'IL',
  zip: '42345',
  effectiveFrom: {
    year: "2025",
    month: "Jan",
    date: "22"
  },
};
it.only('BAT-1460 QA - New Vehicle-Entity: Vehicle Document as Upload , View and document', () => {
    loginToPage(username, password, baseUrl);

    const vehicleDetails = {
      entityName: 'ventures United',
      EIN: '12-756D123',
      VIN: generateVIN(),
      make: 'Toyota',
      model: 'Camry',
      year: '2023',
      cylinder: '4',
      color: 'Blue',
      vehicleType: 'Regular',
      hybrid: 'true',
      dealerName: 'Sunrise Auto Dealers',
      dealerBankName: 'Chase Bank',
      dealerAccountNumber: '1234567890',
      vehicleOffice: 'New York Vehicle Office',
      vehicleFinancials: {
        basePrice: 280,
        salesTax: 250,
      },
      expectedDeliveryDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      documentDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      documentType: 'Document 1',
      deliveryLocation: 'Los Angeles, CA',
      vehicleDelivered: 'true',
      insuranceProcured: 'true',
      tlcHackupInspectionDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
    };
    //Go to New Vehicle page
    cy.get('[class="sidebar scroll-bar"]').contains('Vehicle').click();
    cy.get('[class="sidebar scroll-bar"]').contains('New Vehicle').click();
    cy.get('[aria-label="Proceed"]').click();

    //Search for vehicle with the entity name and create new vehicle
    cy.get('[id="entityName"]').type(vehicleDetails.entityName);
   // cy.get("#EIN").type(vehicleDetails.EIN);
    cy.get('.border-radius-0 > .p-button-label').click({force:true});
    cy.wait(5000);
    
    cy.get(".p-0.p-button.p-component.p-button-icon-only").each(($row)=>{
      cy.wrap($row).eq(0).click()
    });

    //Enter Vehicle Information
    cy.get('[id="vin"]').type(vehicleDetails.VIN);
    cy.get('[id="make"]').type(vehicleDetails.make);
    cy.get('[id="model"]').type(vehicleDetails.model);
    selectYear({ locator: '[id="year"]', year: vehicleDetails.year });
    cy.get('#cylinders').clear().type(vehicleDetails.cylinder);
    cy.get('[id="color"]').type(vehicleDetails.color);
    selectDropDownInList({ locator: '[aria-label="Select a Vehicle Type"]', dropDownText: vehicleDetails.vehicleType });
    cy.get(`[id="is_hybrid_${vehicleDetails.hybrid}"]`).click();
    cy.get('[id="dealer_name"]').type(vehicleDetails.dealerName);
    cy.get('[id="dealer_bank_name"]').type(vehicleDetails.dealerBankName);
    cy.get('[id="dealer_bank_account_number"]').type(vehicleDetails.dealerAccountNumber);
    cy.get('[id="vehicle_office"]').type(vehicleDetails.vehicleOffice);
    cy.get('[id="base_price"] input').type(vehicleDetails.vehicleFinancials.basePrice);
    cy.get('[id="sales_tax"] input').type(vehicleDetails.vehicleFinancials.salesTax);
    cy.get("button[aria-label='Submit Vehicle Details'] span[class='p-button-label p-c']").click().wait(2000);

    //Enter Delivery Details
    selectDate({
      locator: '[name="expected_delivery_date"]',
      year: vehicleDetails.expectedDeliveryDate.year,
      month: vehicleDetails.expectedDeliveryDate.month,
      date: vehicleDetails.expectedDeliveryDate.date
    });
    cy.get('[id="delivery_location"]').type(vehicleDetails.deliveryLocation);
    cy.get('[aria-label="Submit Vehicle Details"]').click().wait(2000);

    //View and Update Vehicle Documents
    uploadDocumentWithDocType({
      locator: '[aria-label="Upload Documents"]',
      year: vehicleDetails.documentDate.year,
      month: vehicleDetails.documentDate.month,
      date: vehicleDetails.documentDate.date,
      documentType: vehicleDetails.documentType
    });
    cy.get('[aria-label="Submit"]').click().wait(2000);

    //Assertions
    cy.contains('Enter Vehicle Information').click();
    cy.get('[id="vin"]').should('have.value', vehicleDetails.VIN);
    cy.get('[id="make"]').should('have.value', vehicleDetails.make);
    cy.get('[id="model"]').should('have.value', vehicleDetails.model);
    cy.get('[id="year"]').should('have.value', vehicleDetails.year);
    cy.get('#cylinders').should('have.value', vehicleDetails.cylinder);
    cy.get('[id="color"]').should('have.value', vehicleDetails.color);
    cy.get('[id="vehicle_type"]').should('have.value', vehicleDetails.vehicleType);
    cy.get(`[id="is_hybrid_${vehicleDetails.hybrid}"]`).should('be.checked');
    cy.get('[id="dealer_name"]').should('have.value', vehicleDetails.dealerName);
    cy.get('[id="dealer_bank_name"]').should('have.value', vehicleDetails.dealerBankName);
    cy.get('[id="dealer_bank_account_number"]').should('have.value', vehicleDetails.dealerAccountNumber);
    cy.get('[id="vehicle_office"]').should('have.value', vehicleDetails.vehicleOffice);
    cy.get('[id="base_price"] input').should('have.value', vehicleDetails.vehicleFinancials.basePrice);
    cy.get('[id="sales_tax"] input').should('have.value', vehicleDetails.vehicleFinancials.salesTax);

    cy.contains('Enter Vehicle Delivery Details').click();
    cy.get('[name="expected_delivery_date"]').should('have.value', convertDateFormat({ date: vehicleDetails.expectedDeliveryDate }));
    cy.get('[id="delivery_location"]').should('have.value', vehicleDetails.deliveryLocation);
    

    //Vehicle Delivery Complete
    cy.contains('Vehicle Delivery Complete').click();
    cy.get(`[id="is_delivered_${vehicleDetails.vehicleDelivered}"]`).click();
    cy.get(`[id="is_insurance_procured_${vehicleDetails.vehicleDelivered}"]`).click();
    selectDate({
      locator: '[name="tlc_hackup_inspection_date"]',
      year: vehicleDetails.tlcHackupInspectionDate.year,
      month: vehicleDetails.tlcHackupInspectionDate.month,
      date: vehicleDetails.tlcHackupInspectionDate.date
    });
    cy.get('[aria-label="Submit Vehicle Details"]').click().wait(2000);

    cy.get('[role="dialog"]').should('contain', 'Verified and Approved Successfully');
    cy.get('[role="dialog"] button').click();
  });




  it.only("",()=>{

    loginToPage(username, password, baseUrl);

    cy.get('#pr_id_6_header_1 > .p-accordion-header-text > .menu-link').click().should('contain','Vehicles ');
   cy.get('.bg-transparent > :nth-child(2) > .menu-link').click().should('have.text','Manage Vehicle');
   

    
    

   


  })

