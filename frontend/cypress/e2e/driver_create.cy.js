// import 'cypress-file-upload';

import { it } from 'mocha';
import { convertDateFormat, generateDMVLicenseNumber, generateMedallionNumber, generateVIN, loginToPage, selectDate, selectDropDownInList, selectTime, selectYear, uploadDocument, uploadDocumentWithDocType } from '../utilities/genericUtils.js';
const driverDetails = {
    tlcLicenseNo: 'TLC46278',
    dmvLicenseNo: 'DMV79678',
    ssn: '817-42-5032',
    maskedSSN: 'XXX-XX-5032',
    driverName: 'Robert',
    driverStatus: 'Active',

    
    driverDetails2:{
        tlcLicenseNo2: 'TLC46278',
    dmvLicenseNo2: 'DMV79678',
    ssn2: '817-42-5032',
    maskedSSN2: 'XXX-XX-5032',
    driverName2: 'Robert',
    driverStatus2: 'Active',

    }
  };



const username = 'alKema@bat.com';

const password = 'bat@123';

const baseUrl = Cypress.config('baseUrl');



describe('new driver ', () => {

  it.skip('BAT-1723 QA - New Driver : Create New Driver', () => {

    // Login to the application

    loginToPage(username, password, baseUrl);



    // Wait for the page to load

    cy.wait(4000);



    // Navigate to the new driver registration page

    cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').click({force: true});

    cy.get('[class=" menu-link d-flex align-items-center "]').contains('New Driver').click();


    cy.get('[aria-label="Proceed"]').contains('Proceed').click()

   cy.get('[id="tlcLicenseNumber"]').type("daddsfs");
   cy.get('[aria-label="Search"]').contains('Search').click()
   cy.get('[data-pc-section="label"]').contains('Add Driver').click()
   cy.get('[class="p-button-label p-c"]').contains('Modify Details').click()




  })
  
  it('BAT-1737 QA - Verify Driver Details Form Submission', () => {

    
    // Login to the application

    loginToPage(username, password, baseUrl);



    // Wait for the page to load

    cy.wait(4000);



    // Navigate to the new driver registration page

    cy.get('#pr_id_6_header_2 > .p-accordion-header-text > .menu-link').contains('Drivers').click({force: true});

    cy.get('[class=" menu-link d-flex align-items-center "]').contains('New Driver').click();


    cy.get('[aria-label="Proceed"]').contains('Proceed').click()

   cy.get('[id="tlcLicenseNumber"]').type("daddsfs");
   cy.get('[aria-label="Search"]').contains('Search').click()
   cy.get('[data-pc-section="label"]').contains('Add Driver').click()
   cy.get('[class="p-button-label p-c"]').contains('Modify Details').click()

// for driver details 
    cy.get('[id="dmvLicenseActive_Yes"]').click()
    cy.get('[id="tlcLicenseActive_Yes"]').click()
    cy.get('[id="dmvLicenseNumber"]').type('DMM0119081')
cy.get('body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4) > form:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(3) > div:nth-child(1) > span:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(2) > svg:nth-child(1)').click()


    

    // Upload document file

   cy.get('.b-upload-click-text').invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Drivers-120325-062430.pdf', { action: 'drag-drop' });

        // Upload document file

        // cy.get('.btn > .close-icon').click({force:true})



   

    // Select document date

    cy.get('#documentDate').click();

    cy.get('[class="p-icon p-datepicker-next-icon"]').click();

    cy.get(':nth-child(1) > [aria-label="3"] > span').click();
    cy.get('[class="p-dropdown-label p-inputtext"]'). contains('DMV License Document').click()

    cy.get('[data-pc-section="itemlabel"]').click()

    cy.get('[class="p-button-label p-c"]').contains('Attach File').click()

    cy.get('#dmvLicenseIssuedState').click()
   cy.get('#dmvLicenseIssuedState').type('mp')
   cy.get('#dmvLicenseExpiryDate').click()
    cy.get('[aria-label="21"]').click()


     cy.get('[id="tlcLicenseNumber"]').type('TLcc0813020')


    cy.get('#root > div > main > section > div > div.common-layout.w-100.h-100.d-flex.flex-column.gap-4 > div:nth-child(4) > form > div > div:nth-child(1) > div > div.form-body.align-items-center.justify-content-between > div > div:nth-child(6) > div > span > div > div > span > svg').click()
    

    cy.get('.b-upload-click-text').invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Drivers-120325-062430.pdf', { action: 'drag-drop' });

    cy.get('#documentDate').click()
    cy.get('.p-datepicker-today > span').click()
    // cy.get('span').click()
    //cy.get('primary-btn p-button p-component').contains('Attach File').click()
    cy.get("button[aria-label='Attach File']").click()
    cy.get('#tlcLicenseExpiryDate').dblclick()
    cy.get('[aria-label="20"] > span').click()



    //Privacy details form 
     cy.get('#firstName').click()
     cy.get('#firstName').type('abss')

     cy.get('#middleName').click()
     cy.get('#middleName').type('bsss')

     cy.get('#lastName').click()
     cy.get('#lastName').type('dss')

      cy.get('#ssn').click()
      cy.get('#ssn').type('000-00-0000')


     //  cy.get('body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4) > form:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4) > div:nth-child(1) > span:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(2) > svg:nth-child(1)').click()

     cy.get('body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4) > form:nth-child(1) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(4) > div:nth-child(1) > span:nth-child(1) > div:nth-child(1) > div:nth-child(1) > span:nth-child(2) > svg:nth-child(1)').click()
     //cy.get('.b-upload-click-text').click()
     
    cy.get('.b-upload-click-text').invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Drivers-120325-062430.pdf', { action: 'drag-drop' });


  //uploadd an ssn document
  

  cy.get('#documentDate').click()
  cy.get('.p-datepicker-today > span').click()
  cy.get('#notes').type('it is my SSN number')
  cy.get('.justify-content-end > .primary-btn > .p-button-label').click().wait(2000)

  //click on driver type
  // cy.get('#root > main > section > div > div.common-layout.w-100.h-100.d-flex.flex-column.gap-4 > div:nth-child(4) > form > div > div:nth-child(2) > div > div.form-body.align-items-center.justify-content-between > div > div:nth-child(5) > div > span > div > div.p-dropdown-trigger > svg').click()
//
cy.get('.rounded-0 > .p-dropdown-label').click({force:true})
//cy.get('#dropdownItem_0').click()
cy.get('#dropdownItem_1').click()
  // clcik on upload document 
 // cy.get('#root > main > section > div > div.common-layout.w-100.h-100.d-flex.flex-column.gap-4 > div:nth-child(4) > form > div > div:nth-child(2) > div > div.form-body.align-items-center.justify-content-between > div > div:nth-child(6) > div > span > div > div > span > svg').click()
 cy.get(':nth-child(2) > [style="padding-top: 10px; padding-bottom: 20px;"] > .form-body > .d-flex > :nth-child(6) > .position-relative > .p-float-label > :nth-child(1) > .p-icon-field > .p-input-icon > svg').click() 
 cy.wait(1000)
 cy.get('.b-upload-click-text').invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Leases-130325-114223.pdf', { action: 'drag-drop' });
cy.get('#documentDate').click()
cy.get('.p-datepicker-today > span').click()
cy.get('#notes').type('i am uploading photo').click()
cy.get('.justify-content-end > .primary-btn > .p-button-label').click()

// select meretical status

cy.get('#maritalStatus').type('single').click()

//select DOB
cy.get('#dob').click()
cy.get('.p-datepicker-year').click()
for (let i = 0; i < 2; i++) {
  cy.get('.p-datepicker-prev') // Adjust selector for previous button
    .click();
}

cy.get('.p-yearpicker > :nth-child(4)').click()
cy.get('.p-monthpicker > :nth-child(4)').click()
cy.get('[aria-label="16"] > span').click()

cy.get('#gender').type('Female')
cy.get('#Phone1').type('123454321')
cy.get('#Phone2').type('12131415116')
cy.get('#emailID').type('batsa@1dsadsa')



       // go for address details form 

       cy.get('#addressLine1').type('chennai')
cy.get('#addressLine2').type('chennai')
cy.get('#city').type('yn')
cy.get('#state').type('USA')
cy.get('#zip').type('606363')
cy.get('#latitude').type('12345')
cy.get('#longitude').type('123456')



// check for payeee details form
cy.get('#payTo_ACH').click()
cy.get('#bankName').type('Baahdsadas')
cy.get('#bankAccountNumber').type('1234321')
cy.get('#payee').type('10000')
cy.get('#addressLine1Payee').type('bhoppppp')
cy.get('#addressLine2Payee').type('chennai')
cy.get('#cityPayee').type('chennai')
cy.get('#statePayee').type('tamil nadu')

cy.get('#effectiveFrom').click()
cy.get('.p-datepicker-today > span').click()




// emergency detail 


  cy.get('#nameOfThePerson').type('ass')
cy.get('#relationship').type('dsasadsadsdas')

cy.get('#contactNumber').type('687098090--0')


cy.get('.border-radius-0 > .p-button-label').click({force:true})



  // FOR Verify Driver Documents
    cy.get("button[aria-label='Upload Documents']").click()
    cy.get(".b-upload-click-text").invoke('show').selectFile('cypress/fixtures/BAT-Epic_ Leases-130325-114223.pdf', { action: 'drag-drop' });


    cy.get("svg[width='21']").click()
    cy.get("td[class='p-datepicker-today'] span[aria-selected='false']").click()

cy.get("div[aria-label='Select a Document Type'] svg").click()
cy.get('#dropdownItem_0').click()
cy.get("button[aria-label='Attach File'] span[class='p-button-label p-c']").click()
cy.wait(2000)
cy.get("button[aria-label='Verify Documents'] span[class='p-button-label p-c']").click()
  cy.get("button[aria-label='Approve Driver']").click()
  cy.get("svg[width='20']").click()

  })

  

})