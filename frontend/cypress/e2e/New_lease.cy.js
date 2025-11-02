import { click } from '@testing-library/user-event/dist/cjs/setup/directApi.js';
import { generateMedallionNumber, loginToPage, selectDate, selectDropDownInList } from '../utilities/genericUtils.js';

const username = 'alkema@bat.com';
const password = 'bat@123';
const baseUrl = Cypress.config('baseUrl');

describe('Lease page check', () => {

     it('do click on  lease button  ', () => {
     loginToPage(username, password, baseUrl);


      // go to new lease page 
      cy.get('[class="menu-link d-flex align-items-center "]').contains('Leases').click()
      cy.get('.bg-transparent > :nth-child(1) > .menu-link').contains('New Lease').click()
      cy.get('[class="p-button-label p-c"]').contains('Proceed').click()



       // search for medalian number 
       cy.get('#medallionNo').type('1A51')

      cy.get('[class="p-button-label p-c"]').contains('Search').click()
   cy.get('[class="p-checkbox-input"]').click()

   cy.get('.position-sticky > .border-radius-0 > .p-button-label').click()

   //enter lease info page
   cy.get('#lease_id').type('2222').click()
   cy.get('.rounded-0 > .p-dropdown-label').click()
   cy.get('#dropdownItem_0 > .p-dropdown-item-label').click()
   cy.get(':nth-child(4) > .position-relative > .p-float-label > .rounded-0 > .p-datepicker-trigger').click()


   cy.get('[aria-label="20"] > span').click()
   cy.get('#pr_id_58_0').click()
   cy.get('.rounded-0 > #cancellation_fee').type('100')
   cy.get('.border-radius-0').click()

   //Enter Financial Info

   cy.get('.border > #management_recommendation').type('1000')
   cy.get(':nth-child(2) > :nth-child(2) > .border').type('994.00')

   cy.get('.border > #veh_lease').type('100')

   cy.get('.border-radius-0 > .p-button-label').click()

   //choose driver 
   cy.get('#TLCLicenseNo').type('TLC90065')
   cy.get('.form-body > .border-radius-0 > .p-button-label').click()
   cy.get(':nth-child(8) > .d-flex').click()

   cy.get('.p-selection-column > .p-checkbox > .p-checkbox-input').click()
   cy.get('.position-sticky > .border-radius-0 > .p-button-label').click()
   cy.get('.border-radius-0').click({multiple: true})

//    cy.get('.border-radius-0').dblclick({force:true});
//    cy.wait(10000)

//    cy.get('.primary-table > .p-datatable-wrapper > .p-datatable-table > .p-datatable-tbody > :nth-child(1) > :nth-child(8)').click()
//    cy.get('.border-radius-0 > .p-button-label').click()
//    cy.wait(10000)
//    cy.get('[class="d-flex align-items-center gap-1"]').contains('BAT e-sign Link').click({force:true})

         
     });

      
    
});