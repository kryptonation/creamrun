// import 'cypress-file-upload';

import { describe, it } from 'mocha';
import { generateMedallionNumber, loginToPage, selectDate, selectDropDownInList } from '../utilities/genericUtils.js';

// import { click } from '@testing-library/user-event/dist/cjs/convenience/click.js';
// import { describe } from 'mocha';



const username = 'alkema@bat.com';

const password = 'bat@123';

const baseUrl = Cypress.config('baseUrl');


describe('Manage driver :  Check Filters ', () => {

    it.skip('BAT-1680 QA -Manage Driver : ', () => {
         // Login to the application
          
              loginToPage(username, password, baseUrl);
          
          
          
              // Wait for the page to load
              cy.wait(2000);
              // Navigate to the Manage driver registration page
              cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
              cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
              cy.get('.badge-icon').click();  // Click filter icon if necessary
             
              cy.get("#Lock").should('exist').invoke('show').check();
              cy.get("#tlc_license_expriy").should('exist').invoke('show').check();
              cy.get("#dmv_license_expriy").should('exist').invoke('show').check();
              cy.get("button[data-testid='refresh_btn'] svg").click()
              //cy.get("#Lock").should('be.visible').check()


    })


    it.skip('Uncheck all filters one by one', () => {
        // Login to the application
        loginToPage(username, password, baseUrl);
    
        // Wait for the page to load
        cy.wait(2000);
    
        // Navigate to Manage Drivers page
        cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link')
            .contains('Drivers').click();
        cy.get('[class=" menu-link d-flex align-items-center "]')
            .contains('Manage Drivers').click();
        cy.get('.badge-icon').click(); // Click filter icon
    
        // List of checkboxes to uncheck
        const checkboxes = [
            "#Lock",
            "#driver_id",
            "#driver_status",
            "#driver_type",
            "#lease_info",
            "#tlc_license_number",
            "#tlc_license_expriy",
            "#dmv_license_number",
            "#dmv_license_expriy",
            "#m_status",
            "#options"
        ];
    
        // Loop through each checkbox, uncheck it, and wait 1 second
        checkboxes.forEach(selector => {
            cy.get(selector).uncheck({ force: true });
            cy.wait(1000); // Wait for 1 second
        });
    
        // Click refresh button
        cy.get("button[data-testid='refresh_btn'] svg").click();
    });
    

    it.skip('BAT-1680 QA -Manage Driver : checked all the Filters', () => {
// Login to the application
          
loginToPage(username, password, baseUrl);
          
          
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
cy.get('.badge-icon').click();  // Click filter icon if necessary

  // List of checkboxes to uncheck
  const checkboxes = [
    "#Lock",
    "#driver_id",
    "#driver_status",
    "#driver_type",
    "#lease_info",
    "#tlc_license_number",
    "#tlc_license_expriy",
    "#dmv_license_number",
    "#dmv_license_expriy",
    "#m_status",
    "#options"
];

// Loop through each checkbox, uncheck it, and wait 1 second
checkboxes.forEach(selector => {
    cy.get(selector).check({ force: true });
    cy.wait(1000); // Wait for 1 second
});

// Click refresh button
cy.get("button[data-testid='refresh_btn'] svg").click();
    })

    it.skip('BAT-1680 QA -Manage Driver : Driver ID ', () => {

        // Login to the application
          
loginToPage(username, password, baseUrl);
          
          
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()

cy.get("th:nth-child(2) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').click()
cy.wait(3000)
cy.get("th:nth-child(2) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').click()
cy.wait(3000)

 // click on driver filter button 
cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(2) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1) > svg:nth-child(1)").should('exist').invoke('show').click()
cy.get("input[placeholder='Search Driver ID']")
  .should("be.visible")
  .should("be.enabled")
  .type("6436")
  .should("have.value", "6436");
  //cy.get("[id^='checkbox-']").first().check({ force: true });
 cy.get("[id^='checkbox-']").eq(1).check({ force: true })





// for apply  filter check its clickable or not 
cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']")
  .should("be.visible")
  .should("have.text", "Apply Filter").click();
  cy.wait(2000)

   cy.get("button[aria-label='Clear'] span[class='p-button-label p-c']").should("have.text","Clear").click()
   cy.wait(2000)
   cy.get("button[aria-label='Clear All'] span[class='p-button-label p-c']").should("have.text","Clear All").click()

   cy.wait(3060)



    })
     

    it.skip('Manage driver : status ', () => {

         // Login to the application
          
loginToPage(username, password, baseUrl);
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()

cy.get("th:nth-child(3) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').click()
cy.wait(3000)
cy.get("th:nth-child(3) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').click()
cy.wait(3000)

 // click on status filter button 
cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(3) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1) > svg:nth-child(1)").should('exist').invoke('show').click()

 cy.get('#Inactive').check().wait(2000)
 cy.get("input[id='In Progress']").check().wait(2000).click()
 cy.get("#Registered").check().wait(2000)
 cy.get("input[id='In Progress']").check().wait(2000).click()
 
 cy.get('#Inactive').check().wait(2000)
 cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should("have.text","Apply Filter").click()

 cy.get("#Registered").check().wait(2000).click()
 cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should("have.text","Apply Filter").click()

    })
    it.skip('Manage driver : Driver Type  ', () => {

        
         // Login to the application
          
loginToPage(username, password, baseUrl);
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
// clcik on driver type error button
cy.get("th:nth-child(4) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()

cy.get("th:nth-child(4) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').click()



 // click on driver type icon 
  cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(4) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1)").should('exist').invoke('show').click()

  cy.get("#WAV").should("exist").check().click()
  cy.get(3000)
  cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should('have.text','Apply Filter').click()
  cy.get("#Regular").should("exist").check().click()
  cy.get(3000)
  cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should('have.text','Apply Filter').wait(2000).click()
cy.get("button[aria-label='Clear All'] span[class='p-button-label p-c']").should("have.text","Clear All").click()

    })

     it.skip('manage driver : lease type ',()=>{

        // Login to the application
          
loginToPage(username, password, baseUrl);
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
// clcik on lease type error button
cy.get("th:nth-child(5) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()
cy.get("th:nth-child(5) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()

cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(5) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1) > svg:nth-child(1)").should("exist").click()


     })

     
     it('manage driver : TLC license Number  ',()=>{
          // Login to the application
          
loginToPage(username, password, baseUrl);
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
// clcik on TLC license Number errow button
cy.get("th:nth-child(6) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()

cy.get("th:nth-child(6) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()

cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(6) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1) > svg:nth-child(1)").should('exist').invoke('show').wait(3069).click()
cy.get("input[placeholder='Search TLC License Number']").type("TLC232425").should("have.value","TLC232425")

     })

     it('manage driver : DMV license Number  ',()=>{
        // Login to the application
          
loginToPage(username, password, baseUrl);
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
// clcik on DMV license Number errow button

cy.get("th:nth-child(7) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()
cy.get("th:nth-child(7) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()

cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(7) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1) > svg:nth-child(1)").should('exist').invoke('show').wait(3069).click()
cy.get("input[placeholder='Search DMV License Number']").type("DMV152030").should("have.value","DMV152030")

        
     })
     it('manage driver : Action ',()=>{
        // Login to the application
          
loginToPage(username, password, baseUrl);
          
// Wait for the page to load
cy.wait(2000);
// Navigate to the Manage driver registration page
cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').should('be.visible').click()
cy.get('[class=" menu-link d-flex align-items-center "]').should('contain.text', 'Manage Drivers').contains('Manage Drivers').click()
// clcik on action  errow button

cy.get("th:nth-child(8) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()
cy.get("th:nth-child(8) div:nth-child(1) span:nth-child(2) svg").should('exist').invoke('show').wait(3069).click()

cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > thead:nth-child(1) > tr:nth-child(1) > th:nth-child(8) > div:nth-child(1) > div:nth-child(3) > button:nth-child(1) > svg:nth-child(1)").should('exist').invoke('show').wait(3069).click()
cy.get("#REGISTERED").click()
cy.get(2000)
cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']")
  .should("have.text", "Apply Filter")  // Check if the button has the correct text
  .should("be.visible")  // Ensure the button is visible
  .parent()  // Move to the button element
  .click();  // Click the button

//cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should("have.text","Apply Filter").check()
cy.get("button[aria-label='Clear'] span[class='p-button-label p-c']").should("exist").click()
cy.get("#ACTIVE").click()
cy.get(2000)

cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']")
  .should("have.text", "Apply Filter")  // Check if the button has the correct text
  .should("be.visible")  // Ensure the button is visible
  .parent()  // Move to the button element
  .click();  // Click the button

//cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should("have.text","Apply Filter").check()
cy.get("button[aria-label='Clear'] span[class='p-button-label p-c']").should("exist").click()
cy.get("#INACTIVE").click()
cy.get(2000)


cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']")
  .should("have.text", "Apply Filter")  // Check if the button has the correct text
  .should("be.visible")  // Ensure the button is visible// Ensure the button is clickable
  .parent()  // Move to the button element
  .click();  // Click the button

//cy.get("button[aria-label='Apply Filter'] span[class='p-button-label p-c']").should("have.text","Apply Filter").check()
cy.get(2000)
cy.get("button[aria-label='Clear'] span[class='p-button-label p-c']").should("exist").click()



     })
      
     
})