// import 'cypress-file-upload';

import { describe, it } from 'mocha';
import { generateMedallionNumber, loginToPage, selectDate, selectDropDownInList } from '../utilities/genericUtils.js';

// import { click } from '@testing-library/user-event/dist/cjs/convenience/click.js';
// import { describe } from 'mocha';



const username = 'alkema@bat.com';

const password = 'bat@123';

const baseUrl = Cypress.config('baseUrl');


describe('Manage driver ', () => {

    it('BAT-1680 QA -Manage Driver : Update Address', () => {
  
      // Login to the application
  
      loginToPage(username, password, baseUrl);
  
  
  
      // Wait for the page to load
      cy.wait(4000);
      // Navigate to the Manage driver registration page
      cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').click()
      cy.get('[class=" menu-link d-flex align-items-center "]').contains('Manage Drivers').click()


      //clicl on threedots 
      cy.get(':nth-child(1) > :nth-child(9) > div > [data-testid="three-dot-menu"]').click()

      cy.get("a[aria-label='Update Address']").click()
      cy.get("button[aria-label='Proceed'] span[class='p-button-label p-c']").click()


       cy.get("svg[width='20']").click()
       cy.get(".b-upload-click-text").invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Drivers-120325-062430.pdf', { action: 'drag-drop' });
       cy.get("svg[width='21']").click()
       cy.get(':nth-child(2) > [aria-label="4"] > span').click()

       cy.get("div[aria-label='Select a Document Type']").click()
       cy.get("#dropdownItem_0").click()
       cy.get("button[aria-label='Attach File']").click()


      })

       
    it('BAT-1680 QA -Manage Driver : Update Payee', () => {

      // Login to the application
  
      loginToPage(username, password, baseUrl);
  
  
  
      // Wait for the page to load
      cy.wait(4000);
      // Navigate to the Manage driver registration page
      cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').click()
      cy.get('[class=" menu-link d-flex align-items-center "]').contains('Manage Drivers').click()

      //clicl on three dots 
      cy.get(':nth-child(1) > :nth-child(9) > div > [data-testid="three-dot-menu"]').click()

      cy.get("a[aria-label='Update Payee']").click()
       cy.get("button[aria-label='Proceed'] span[class='p-button-label p-c']").click()
       cy.get("#payTo_ACH").click();
       cy.get("#bankName").clear().type('idfk')
       cy.get('#bankAccountNumber').clear().type('1234567011')
       cy.get("#payee").clear().type("prerna")
       cy.get('#addressLine1').clear().type("chennai")
       cy.get("#city").clear().type('chennai')
       cy.get("#state").clear().type("Tamil nadu")
       cy.get('#zip').clear().type('1234543')
       cy.get('#effectiveFrom').click()
       cy.get("td[aria-label='29'] span[aria-selected='false']").click({force:true})
       cy.get("button[aria-label='Submit Payee Details']").click()


//            // for removing the document 
// cy.get(':nth-child(6) > .p-button').click()
// cy.get('.gap-2 > .primary-btn > .p-button-label').click()
// cy.get('.text-blue > .p-button-label').click()
// cy.get("button[aria-label='Upload Documents'] span[class='p-button-label p-c']").click()
// cy.get(".b-upload-click-text").invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Drivers-120325-062430.pdf', { action: 'drag-drop' });
// cy.get("svg[width='21']").click()
// cy.get("td[aria-label='20'] span[aria-selected='false']").click()
// cy.get("div[aria-label='Select a Document Type'] svg").click()
// cy.get('#dropdownItem_0').click()
// cy.get(".p-dialog-mask.p-dialog-center.p-component-overlay.p-component-overlay-enter.p-dialog-draggable.p-dialog-resizable").click()
// cy.get("button[aria-label='Attach File'] span[class='p-button-label p-c']").click()



           // for removing the document 
//cy.get(':nth-child(6) > .p-button').click()
// 
// cy.get(':nth-child(1) > :nth-child(6) > .p-button').click()
// cy.get('.gap-2 > .primary-btn > .p-button-label').click()
// cy.get('.text-blue > .p-button-label').click()

    })


    it('BAT-1680 QA -Manage Driver : DMV License Update', () => {
      


      // Login to the application
  
      loginToPage(username, password, baseUrl);
  
  
  
      // Wait for the page to load
      cy.wait(4000);
      // Navigate to the Manage driver registration page
      cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').click()
      cy.get('[class=" menu-link d-flex align-items-center "]').contains('Manage Drivers').click()

      //clicl on three dots 
      cy.get(':nth-child(1) > :nth-child(9) > div > [data-testid="three-dot-menu"]').click() 
      // check  Manage Driver : DMV License Update 
      cy.get("a[aria-label='Update DMV License'] span[class='p-menuitem-text']").click()

      //Confirmation on DMV License Update
//This will create a new case to update the DMV License for 188445. Are you sure to proceed?


      cy.get("button[aria-label='Proceed'] span[class='p-button-label p-c']").click()
      cy.get(".p-radiobutton.p-component[data-p-checked='false']").click()

      cy.get("#dmv_license_number").clear().type("Dvm123432")
      cy.get("#dmv_license_issued_state").clear().type("tamil nadu (TM)")
      cy.get("#dmv_class").clear().type('abs')
      cy.get("#dmv_license_status").clear().type("787974")
      cy.get('#dmv_class_change_date').click()
      cy.get('[aria-label="12"] > span').click()

cy.get("#dmv_license_expiry_date").click() 

cy.wait(2000)
//
cy.get('[aria-label="20"] > span').click()
     //  cy.get("td[class='p-datepicker-today'] span[aria-selected='false']").click()
    //  cy.get("#dmv_license_expiry_date").click() 

    //  cy.wait(2000)
    //  cy.get(".p-highlight[aria-selected='true']").click()


    cy.get("#dmv_renewal_fee").clear().type("1020")

     // try to upload one more document without removing 1st one 
    //  cy.get("button[aria-label='Upload Updated DMV License']").click()

     cy.get("button[aria-label='Submit Updated License'] span[class='p-button-label p-c']").click()
     cy.wait(2000)
     cy.get('.border-radius-0 > .p-button-label').click()
     cy.wait(2000)

     //DMV License update process is successful
//DMV License update is successful and approved for Driver abss
     //cy.get('#pr_id_430 > .flex-column > .w-100').click()


    })


    it('BAT-1680 QA -Manage Driver : Update TLC License', () => {


      // Login to the application
  
      loginToPage(username, password, baseUrl);
  
  
  
      // Wait for the page to load
      cy.wait(4000);
      // Navigate to the Manage driver registration page
      cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').click()
      cy.get('[class=" menu-link d-flex align-items-center "]').contains('Manage Drivers').click()

      //clicl on three dots 
      cy.get(':nth-child(1) > :nth-child(9) > div > [data-testid="three-dot-menu"]').click() 

      cy.get("a[aria-label='Update TLC License'] span[class='p-menuitem-text']").click()

//       Confirmation on TLC License Update
// This will create a new case to update the TLC License for 188445. Are you sure to proceed?

cy.get("button[aria-label='Proceed'] span[class='p-button-label p-c']").click()
cy.get("#tlc_license_number").clear().type("TLC232425")
cy.get("#tlc_issued_state").clear().type("UKK")

// cy.get("#tlc_license_expiry_date").click()
// cy.get('[aria-label="28"] > .p-highlight').filter('[data-p-disabled="false"]').eq(0).click()

cy.get(3000)
cy.get("#tlc_ddc_date").click()
cy.get(':nth-child(5) > [aria-label="28"] > span').filter('[data-p-disabled="false"]').eq(0).click()
//cy.get(':nth-child(5) > [aria-label="28"] > span').click()
cy.get("#tlc_drug_test_date").click()
//cy.get("tbody tr:nth-child(1) td:nth-child(1) span:nth-child(1)").filter('[data-p-disabled="false"]').eq(0).click()

cy.get("td[aria-label='31'] span[aria-selected='false']").filter('[data-p-disabled="false"]').eq(0).click()
cy.get("#previous_tlc_license_number").clear().type("TLC00uu3")

cy.get("#tlc_hack_date").click()
cy.get(':nth-child(5) > [aria-label="27"] > span').filter('[data-p-disabled="false"]').eq(0).click()
//cy.get(".p-highlight[aria-selected='true']").click()

cy.get("#tlc_lease_card_date").click()

cy.get('[aria-label="21"] > span').filter('[data-p-disabled="false"]').eq(0).click()
cy.get("#tlc_renewal_fee").clear().type(90).click()
cy.get("button[aria-label='Submit Updated License'] span[class='p-button-label p-c']").click()
cy.get(3000)
cy.get('.border-radius-0').click()
    })
  
  
  });

