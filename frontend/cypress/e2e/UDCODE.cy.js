import { convertDateFormat, generateDMVLicenseNumber, generateMedallionNumber, generateVIN, loginToPage, selectDate, selectDropDownInList, selectTime, selectYear, uploadDocument, uploadDocumentWithDocType } from '../utilities/genericUtils.js';
 
const username = 'aklema@bat.com';
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
// console.log(demoData);
 
describe('New Medallion', () => {
  const MedallionDetails = {
    medallionNumber: generateMedallionNumber(),
    medallionType: "WAV",
    renewalDocumentDate: {
      year: "2025",
      month: "Jan",
      date: "2"
    },
    lastRenewalDate: {
      year: "2025",
      month: "Jan",
      date: "2"
    },
    validFromDate: {
      year: "2025",
      month: "Jan",
      date: "2"
    },
    validToDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    fs6UpdateDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    firstSignedDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    agentName: "Adaline",
    agentNumber: "AX123",
    amount: 200,
    merchantName: "Meruem",
    merchantBank: "Meruem Bank",
    contractSignedDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    contractEndDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    contract: "In Mail",
    mailSentDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    mailRecievedDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
    leaseSignedDate: {
      year: "2025",
      month: "Mar",
      date: "22"
    },
  }
  it.skip('BAT-752 QA - New Med: Search Individual', () => {
    loginToPage(username, password, baseUrl);
 
    //Go to new medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click({force:true}).wait(2000);
    cy.get('[class="sidebar scroll-bar"]').contains('New Medallion').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Search for medallion with the owner name
    cy.get('[id="medallionOwnerName"]').type('Dynamics');
    cy.get('[type="submit"]').click({force:true});
    cy.wait(5000)
 
    //Assert if the table has the owner name
   
     cy.get('.loader-svg.img-loader', { timeout: 10000 }).should('not.exist');
    cy.get(':nth-child(7) > div.d-flex > .border-0').click({force:true});
    cy.get('.border-top > .p-button > .p-button-label').click();
 
    cy.get(':nth-child(4) > .topic-txt').should('have.text','Enter Medallion Details');
    cy.get("#medallionNumber").type(MedallionDetails.medallionNumber);
    selectDropDownInList({ locator: ".p-dropdown-label.p-inputtext.p-placeholder", dropDownText: MedallionDetails.medallionType });
 
   
    //asset of checking the Regular text
    cy.get("li[id='dropdownItem_1'] span[class='p-dropdown-item-label']").should('have.text','WAV');
    selectDate({
      locator: "#lastRenewalDate",
      year: MedallionDetails.lastRenewalDate.year,
      month: MedallionDetails.lastRenewalDate.month,
      date: MedallionDetails.lastRenewalDate.date
    });
    selectDate({
      locator: "#validFromDate",
      year: MedallionDetails.validFromDate.year,
      month: MedallionDetails.validFromDate.month,
      date: MedallionDetails.validFromDate.date
    });
    selectDate({
      locator: '#validToDate',
      year: MedallionDetails.validToDate.year,
      month: MedallionDetails.validToDate.month,
      date: MedallionDetails.validToDate.date
    });
    selectDate({
      locator: '#fs6Date',
      year: MedallionDetails.fs6UpdateDate.year,
      month: MedallionDetails.fs6UpdateDate.month,
      date: MedallionDetails.fs6UpdateDate.date
    });
    selectDate({
      locator: '#first_signed',
      year: MedallionDetails.firstSignedDate.year,
      month: MedallionDetails.firstSignedDate.month,
      date: MedallionDetails.firstSignedDate.date
    });
 
 
    //Clear Search
    // cy.get('[type="submit"]').siblings().last().click();
 
    // //Search for medallion with the SSN
    // cy.get('[id="SSN"]').type('1234');
    // cy.get('[type="submit"]').click();
 
    // //Assert if the table has the SSN values are matching
    // cy.wait(2000);
    // cy.get('.loader-svg.img-loader', { timeout: 10000 }).should('not.exist');
    // cy.get('[data-pc-section="bodyrow"]').each(($row) => {
    //   cy.wrap($row)
    //     .find('td').eq(3)
    //     .should('contain.text', '1234');
    // });
 
    // //Clear Search
    // cy.get('[type="submit"]').siblings().last().click();
 
    // //Search for medallion with the EIN
    // cy.get('[id="EIN"]').type('1234');
    // cy.get('[type="submit"]').click();
 
    // //Assert if the table has the EIN values are matching
    // cy.wait(2000);
    // cy.get('.loader-svg.img-loader', { timeout: 10000 }).should('not.exist');
    // cy.get('[data-pc-section="bodyrow"]').each(($row) => {
    //   cy.wrap($row)
    //     .find('td').eq(3)
    //     .should('contain.text', '1234');
    // });
  });
  it.skip('BAT-83 E2E Test Case: New Medallion - Existing Ind Owner - Lease - All Fields', () => {
    loginToPage(username, password, baseUrl);
 
    //Go to new medallions page
    cy.get('#pr_id_5_header_0 > .p-accordion-header-text > .menu-link > span').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('New Medallion').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Search for medallion with the owner name
    cy.get('[id="medallionOwnerName"]').type('John Doe');
    cy.get('[type="submit"]').click();
 
    //Select the medallion of the individual
    cy.get('[data-pc-section="bodyrow"]').find('td').eq(6).find('button').eq(0).click();
 
    //Type the Medallion details as below
    cy.get("#medallionNumber").type(MedallionDetails.medallionNumber);
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]', dropDownText: MedallionDetails.medallionType });
    // cy.wait(2000);
    // cy.get('[class="form-body"] [data-pc-name="iconfield"]').eq(0).find('svg').click();
    // cy.wait(2000);
    // cy.get('[data-pc-name="fileupload"] [data-pc-section="buttonbar"] input').invoke('show').selectFile('cypress/fixtures/Renewal Liscense Mock.pdf', { action: 'drag-drop' })
    // cy.wait(2000);
    // selectDate({
    //   locator: '[role="dialog"] [data-pc-name="calendar"]',
    //   year: MedallionDetails.renewalDocumentDate.year,
    //   month: MedallionDetails.renewalDocumentDate.month,
    //   date: MedallionDetails.renewalDocumentDate.date
    // });
    // cy.get('[id="notes"]').type('renewal document uploaded');
    // cy.get('[role="dialog"] [type="submit"]').click();
    selectDate({
      locator: '[data-pc-name="calendar"] [name="lastRenewalDate"]',
      year: MedallionDetails.lastRenewalDate.year,
      month: MedallionDetails.lastRenewalDate.month,
      date: MedallionDetails.lastRenewalDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="validFromDate"]',
      year: MedallionDetails.validFromDate.year,
      month: MedallionDetails.validFromDate.month,
      date: MedallionDetails.validFromDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="validToDate"]',
      year: MedallionDetails.validToDate.year,
      month: MedallionDetails.validToDate.month,
      date: MedallionDetails.validToDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="fs6Date"]',
      year: MedallionDetails.fs6UpdateDate.year,
      month: MedallionDetails.fs6UpdateDate.month,
      date: MedallionDetails.fs6UpdateDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="first_signed"]',
      year: MedallionDetails.firstSignedDate.year,
      month: MedallionDetails.firstSignedDate.month,
      date: MedallionDetails.firstSignedDate.date
    });
    cy.get('[id="isStorage_true"]').click();
    cy.get('[id="agentName"]').type(MedallionDetails.agentName);
    cy.get('[id="agentNumber"]').type(MedallionDetails.agentNumber);
    cy.get('[id="amount"] input').type(MedallionDetails.amount);
    cy.get('[type="submit"]').click();
 
    //Medallion Documents Page
    cy.wait(5000)
    cy.get('[aria-label="Submit"]').click();
 
    //Medallion Lease Details
    cy.get('[id="merchant_name"]').type(MedallionDetails.merchantName);
    cy.get('[id="merchant_bank"]').type(MedallionDetails.merchantBank);
 
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]', dropDownText: MedallionDetails.contract });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="contract_start_date"]',
      year: MedallionDetails.contractSignedDate.year,
      month: MedallionDetails.contractSignedDate.month,
      date: MedallionDetails.contractSignedDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="contract_end_date"]',
      year: MedallionDetails.contractEndDate.year,
      month: MedallionDetails.contractEndDate.month,
      date: MedallionDetails.contractEndDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="mail_sent_date"]',
      year: MedallionDetails.mailSentDate.year,
      month: MedallionDetails.mailSentDate.month,
      date: MedallionDetails.mailSentDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="mail_received_date"]',
      year: MedallionDetails.mailRecievedDate.year,
      month: MedallionDetails.mailRecievedDate.month,
      date: MedallionDetails.mailRecievedDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="lease_signed_date"]',
      year: MedallionDetails.leaseSignedDate.year,
      month: MedallionDetails.leaseSignedDate.month,
      date: MedallionDetails.leaseSignedDate.date
    });
    cy.get('[name="accept"]').click();
    cy.get('[aria-label="Submit"]').click();
    cy.get('[role="dialog"] button').click();
  });
  it('BAT-83 E2E Test Case: New Medallion - Existing Ind Owner - Lease - Min Fields', () => {
    loginToPage(username, password, baseUrl);
 
    const MedallionDetails = {
      medallionNumber: generateMedallionNumber(),
      medallionType: "WAV",
      agentName: "Adaline",
      agentNumber: "AX123",
      amount: 200,
      merchantName: "Meruem",
      merchantBank: "Meruem Bank",
      contractSignedDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      contractEndDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      contract: "In Person",
      mailSentDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      mailRecievedDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      leaseSignedDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
    }
    //Go to new medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('New Medallion').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Search for medallion with the owner name
    cy.get('[id="medallionOwnerName"]').type('John Doe');
    cy.get('[type="submit"]').click();
 
    //Select the medallion of the individual
    cy.get('[data-pc-section="bodyrow"]').find('td').eq(6).find('button').eq(0).click();
 
    //Type the Medallion details as below
    cy.get('[id="medallionNumber"]').type(MedallionDetails.medallionNumber);
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]', dropDownText: MedallionDetails.medallionType });
    cy.get('[type="submit"]').click();
 
    //Medallion Documents Page
    cy.wait(5000)
    cy.get('[aria-label="Submit"]').click();
 
    //Medallion Lease Details
    cy.get('[id="merchant_name"]').type(MedallionDetails.merchantName);
    cy.get('[id="merchant_bank"]').type(MedallionDetails.merchantBank);
 
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]', dropDownText: MedallionDetails.contract });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="contract_start_date"]',
      year: MedallionDetails.contractSignedDate.year,
      month: MedallionDetails.contractSignedDate.month,
      date: MedallionDetails.contractSignedDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="contract_end_date"]',
      year: MedallionDetails.contractEndDate.year,
      month: MedallionDetails.contractEndDate.month,
      date: MedallionDetails.contractEndDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="lease_signed_date"]',
      year: MedallionDetails.leaseSignedDate.year,
      month: MedallionDetails.leaseSignedDate.month,
      date: MedallionDetails.leaseSignedDate.date
    });
    cy.get('[name="accept"]').click();
    cy.get('[aria-label="Submit"]').click();
    cy.get('[role="dialog"] button').click();
  });
  it('BAT-83 E2E Test Case: New Medallion - Existing Ind Owner - Lease - Negative Required Fields', () => {
    loginToPage(username, password, baseUrl);
 
    const MedallionDetails = {
      medallionNumber: generateMedallionNumber(),
      medallionType: "WAV",
      agentName: "Adaline",
      agentNumber: "AX123",
      amount: 200,
      merchantName: "Meruem",
      merchantBank: "Meruem Bank",
      contractSignedDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      contractEndDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      contract: "In Person",
      mailSentDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      mailRecievedDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
      leaseSignedDate: {
        year: "2025",
        month: "Mar",
        date: "22"
      },
    }
    //Go to new medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('New Medallion').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Search for medallion with the owner name
    cy.get('[id="medallionOwnerName"]').type('John Doe');
    cy.get('[type="submit"]').click();
 
    //Select the medallion of the individual
    cy.get('[data-pc-section="bodyrow"]').find('td').eq(6).find('button').eq(0).click();
 
    //Click On submit without filling the details
    cy.get('[type="submit"]').click();
    cy.get('[id="medallionNumber"]').parent().parent().find('[class="error-msg"]').should('contain', 'Medallion Number is required');
    cy.get('[class="form-body"] [data-pc-name="dropdown"]').parent().parent().find('[class="error-msg"]').should('contain', 'Medallion Type is required');
 
    //Type the Medallion details as below
    cy.get('[id="medallionNumber"]').type(MedallionDetails.medallionNumber);
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]', dropDownText: MedallionDetails.medallionType });
    cy.get('[type="submit"]').click();
 
    //Medallion Documents Page
    cy.wait(5000)
    cy.get('[aria-label="Submit"]').click();
 
    //Click On submit without filling the details
    cy.get('[type="submit"]').click();
    cy.get('[id="merchant_name"]').parent().parent().find('[class="error-msg"]').should('contain', 'Merchant Name is required');
    cy.get('[id="merchant_bank"]').parent().parent().find('[class="error-msg"]').should('contain', 'Merchant Bank is required');
    cy.get('[id="contract_start_date"]').parent().parent().parent().find('[class="error-msg"]').should('contain', 'Contract Start Date is required');
    cy.get('[id="contract_end_date"]').parent().parent().parent().find('[class="error-msg"]').should('contain', 'Contract End Date is required');
    cy.get('[class="form-body"] [data-pc-name="dropdown"]').parent().parent().find('[class="error-msg"]').should('contain', 'Contract is required');
    cy.get('[data-pc-name="calendar"] [name="lease_signed_date"]').parent().parent().parent().find('[class="error-msg"]').should('contain', 'Lease Signed Date is required');
 
    //Medallion Lease Details
    cy.get('[id="merchant_name"]').type(MedallionDetails.merchantName);
    cy.get('[id="merchant_bank"]').type(MedallionDetails.merchantBank);
 
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]', dropDownText: MedallionDetails.contract });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="contract_start_date"]',
      year: MedallionDetails.contractSignedDate.year,
      month: MedallionDetails.contractSignedDate.month,
      date: MedallionDetails.contractSignedDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="contract_end_date"]',
      year: MedallionDetails.contractEndDate.year,
      month: MedallionDetails.contractEndDate.month,
      date: MedallionDetails.contractEndDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="lease_signed_date"]',
      year: MedallionDetails.leaseSignedDate.year,
      month: MedallionDetails.leaseSignedDate.month,
      date: MedallionDetails.leaseSignedDate.date
    });
    cy.get('[name="accept"]').click();
    cy.get('[aria-label="Submit"]').click();
    cy.get('[role="dialog"] button').click();
  });
  it('BAT-758 QA - Manage Med: Renew Medallion - All Fields', () => {
    loginToPage(username, password, baseUrl);
 
    const renewMedallionDetails = {
      renewalFee: '300',
      renewalDate: {
        year: "2025",
        month: "Jan",
        date: "13"
      },
      renewalFromDate: {
        year: "2025",
        month: "Jan",
        date: "13"
      },
      renewalToDate: {
        year: "2025",
        month: "Mar",
        date: "13"
      },
    };
    //Go to Manage medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Medallion').click();
 
    //Select Renew Medallion
    cy.get('[class="three-dot-mennu"]').first().click();
    cy.get('[aria-label="Renew Medallion"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Give Renew Medallion Details
    selectDate({
      locator: '[data-pc-name="calendar"] [name="renewalDate"]',
      year: renewMedallionDetails.renewalDate.year,
      month: renewMedallionDetails.renewalDate.month,
      date: renewMedallionDetails.renewalDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="renewalFrom"]',
      year: renewMedallionDetails.renewalFromDate.year,
      month: renewMedallionDetails.renewalFromDate.month,
      date: renewMedallionDetails.renewalFromDate.date
    });
    selectDate({
      locator: '[data-pc-name="calendar"] [name="renewalTo"]',
      year: renewMedallionDetails.renewalToDate.year,
      month: renewMedallionDetails.renewalToDate.month,
      date: renewMedallionDetails.renewalToDate.date
    });
    cy.get('[id="renewalFee"]').clear().type(renewMedallionDetails.renewalFee);
    cy.get('[aria-label="Save Renewal Details"]').click();
    cy.get('[aria-label="Submit Renewal Details"]').click();
    cy.get('[role="dialog"]').should('contain', 'Medallion Renewal Successful');
    cy.get('[role="dialog"] button').click();
  });
  it('BAT-760 QA - Manage Med: Update MO Address - All Fields', () => {
    loginToPage(username, password, baseUrl);
 
    const medallionOwnerAddressDetails = {
      addressLine1: '123 Main St',
      addressLine2: 'Suite 105',
      city: 'Chicago',
      state: 'IL',
      zip: '42345',
    };
    //Go to Manage medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Medallion').click();
 
    //Select Update MO Address
    cy.get('[class="three-dot-mennu"]').first().click();
    cy.get('[aria-label="Update MO Address"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Give MO Address Details
    cy.get('[id="addressLine1"]').clear().type(medallionOwnerAddressDetails.addressLine1);
    cy.get('[id="addressLine2"]').clear().type(medallionOwnerAddressDetails.addressLine2);
    cy.get('[id="city"]').clear().type(medallionOwnerAddressDetails.city);
    cy.get('[id="state"]').clear().type(medallionOwnerAddressDetails.state);
    cy.get('[id="zip"]').clear().type(medallionOwnerAddressDetails.zip);
    cy.get('[aria-label="Submit Address Details"]').click();
    cy.get('[role="dialog"]').should('contain', 'Updated MO Address');
    cy.get('[role="dialog"] button').click();
  });
  it('BAT-756 QA - Manage Med: Update Medallion Owner Payee Details - All Fields (ACH)', () => {
    loginToPage(username, password, baseUrl);
 
   
    //Go to Manage medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Medallion').click();
 
    //Select Update Payee
    cy.get('[class="three-dot-mennu"]').first().click();
    cy.get('a[aria-label="Update Payee"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Required field is working as intended
    cy.get('[id="payTo_ACH"]').click();
    cy.get('[id="bankName"]').clear();
    cy.get('[id="bankAccountNumber"]').clear();
    cy.get('[id="payee"]').clear();
    cy.get('[aria-label="Submit"]').click();
    cy.get('[id="payee"]').parent().parent().find('[class="error-msg"]').should('contain', 'Payee is required');
    cy.get('[id="bankName"]').parent().parent().find('[class="error-msg"]').should('contain', 'Bank Name is required');
    cy.get('[id="bankAccountNumber"]').parent().parent().find('[class="error-msg"]').should('contain', 'Bank Account Number is required');
 
    //Give Payee Details
    cy.get('[id="bankName"]').type(medallionPayeeDetails.bankName);
    cy.get('[id="bankAccountNumber"]').type(medallionPayeeDetails.bankAccountNumber);
    cy.get('[id="payee"]').type(medallionPayeeDetails.payee);
    cy.get('[id="addressLine1"]').clear().type(medallionPayeeDetails.addressLine1);
    cy.get('[id="addressLine2"]').clear().type(medallionPayeeDetails.addressLine2);
    cy.get('[id="city"]').clear().type(medallionPayeeDetails.city);
    cy.get('[id="state"]').clear().type(medallionPayeeDetails.state);
    cy.get('[id="zip"]').clear().type(medallionPayeeDetails.zip);
    selectDate({
      locator: '[data-pc-name="calendar"] [name="effectiveFrom"]',
      year: medallionPayeeDetails.effectiveFrom.year,
      month: medallionPayeeDetails.effectiveFrom.month,
      date: medallionPayeeDetails.effectiveFrom.date
    });
    cy.get('[aria-label="Submit"]').click();
    cy.wait(2000);
 
    // Submit Document details
    cy.get('[aria-label="Submit"]').click();
    cy.get('[role="dialog"]').should('contain', 'Payee update process is successful');
    cy.get('[role="dialog"] button').click();
  });
  it('BAT-756 QA - Manage Med: Update Medallion Owner Payee Details - All Fields (Check)', () => {
    loginToPage(username, password, baseUrl);
 
    const medallionPayeeDetails = {
      payee: 'Adaline',
    };
    //Go to Manage medallions page
    cy.get('[class="sidebar scroll-bar"]').contains('Medallion').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Medallion').click();
 
    //Select Update Payee
    cy.get('[class="three-dot-mennu"]').first().click();
    cy.get('a[aria-label="Update Payee"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Give Payee Details
    cy.get('[id="payTo_check"]').click();
    cy.get('[id="checkPayee"]').clear().type(medallionPayeeDetails.payee);
    cy.get('[aria-label="Submit"]').click();
    cy.wait(2000);
 
    // Submit Document details
    cy.get('[aria-label="Submit"]').click();
    cy.get('[role="dialog"]').should('contain', 'Payee update process is successful');
    cy.get('[role="dialog"] button').click();
  });
  it.skip('BAT-1347 QA - New Vehicle: Search Vehicle Entity', () => {
    loginToPage(username, password, baseUrl);
 
    const vehicleDetails = {
      entityName: 'Alpha Beta Management',
      EIN: '12-12-245H789',
 
    };
    //Go to New Vehicle page
    cy.get('[class="sidebar scroll-bar"]').contains('Vehicle').click();
    cy.get('[class="sidebar scroll-bar"]').contains('New Vehicle').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Search for vehicle with the entity name
    cy.get('[id="entityName"]').type(vehicleDetails.entityName);
    cy.get('[aria-label="Search"]').click().wait(2000);
 
    //Assert if the table has the entity name
    cy.get('[data-pc-section="bodyrow"]').each(($row) => {
      cy.wrap($row)
        .find('td').eq(1)
        .should('contain.text', vehicleDetails.entityName);
    });
 
    //Clear Search
    cy.get('[aria-label="Searchh"]').siblings().last().click();
 
    //Search for vehicle with the EIN
    cy.get('[id="EIN"]').type(vehicleDetails.EIN);
    cy.get('[aria-label="Search"]').click().wait(2000);
 
    //Assert if the table has the EIN
    cy.get('[data-pc-section="bodyrow"]').each(($row) => {
      cy.wrap($row)
        .find('td').eq(2)
        .should('contain.text', vehicleDetails.EIN);
    });
 
    //Clear Search
    cy.get('[aria-label="Search"]').siblings().last().click();
  });
  it.skip('BAT-1347 QA - New Vehicle: Search Vehicle Entity', () => {
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
      vehicleType: 'WAV',
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
    cy.get("#EIN").type(vehicleDetails.EIN);
    cy.get('.border-radius-0 > .p-button-label').click();
    cy.wait(10000);
   
    cy.get(".p-0.p-button.p-component.p-button-icon-only").each(($row)=>{
      cy.wrap($row).eq(0).click()
    });
 
    //Enter Vehicle Information
    cy.get('[id="vin"]').type(vehicleDetails.VIN);
    cy.get('[id="make"]').type(vehicleDetails.make);
    cy.get('[id="model"]').type(vehicleDetails.model);
    selectYear({ locator: '[id="year"]', year: vehicleDetails.year });
    cy.get('#cylinders').type(vehicleDetails.cylinder);
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
    cy.get('[id="cylinder"]').should('have.value', vehicleDetails.cylinder);
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
  it('BAT-1354 QA - Manage Vehicle: Hack-up - Details - All Fields', () => {
    loginToPage(username, password, baseUrl);
 
    const vehicleDetails = {
      tpepType: 'Hybrid',
      configurationType: 'Partition',
      partitionType: 'Parking Camera',
      meterType: 'Speedometer',
      roofTopType: 'Hardtop',
      paintInvoice: 101,
      partitionInstalledInvoice: 102,
      meterSerialNo: 3242,
      meterInstalledInvoice: 103,
      rooftopInvoice: 104,
      registrationFee: 105,
      uploadRegistrationCertificate: 106,
      inspectionTime: {
        hour: "20",
        minute: "08",
        second: "39"
      },
      odometerReadingTime: {
        hour: "20",
        minute: "08",
        second: "39"
      },
      loggedTime: {
        hour: "20",
        minute: "08",
        second: "39"
      },
      odometerReading: 300,
      inspectionFee: 200,
      plateNo: 'ABC1234',
      mileRun: 'true',
      result: 'Pass',
      paintCompletedDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      partitionInstalledDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      meterInstalledDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      roofTopInstalledDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      registrationDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      registrationExpiryDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      inspectionDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      odometerReadingDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      loggedDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      nextInspectionDue: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      documentsDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
    };
    //Go to Manage Vehicle page
    cy.get('[class="sidebar scroll-bar"]').contains('Vehicle').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Vehicle').click();
 
    //Select Vehicle to hack up
    cy.get('[alt="Car"]').eq(2).click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Give hack up details
    uploadDocument({
      locator: '[id="paintInvoice"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    uploadDocument({
      locator: '[id="partitionInstalledInvoice"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    uploadDocument({
      locator: '[id="meterInstalledInvoice"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    uploadDocument({
      locator: '[id="rooftopInvoice"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]:eq(0)', dropDownText: vehicleDetails.tpepType });
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]:eq(1)', dropDownText: vehicleDetails.configurationType });
    cy.get('#paint_yes').uncheck({ force: true });
    cy.get('#camera_yes').uncheck({ force: true });
    cy.get('#partition_yes').uncheck({ force: true });
    cy.get('#meter_yes').uncheck({ force: true });
    cy.get('#rooftop_yes').uncheck({ force: true });
 
    selectDate({
      locator: '[name="paintCompletedDate"]',
      year: vehicleDetails.paintCompletedDate.year,
      month: vehicleDetails.paintCompletedDate.month,
      date: vehicleDetails.paintCompletedDate.date
    });
    cy.get('#paintInvoice').clear().type(vehicleDetails.paintInvoice);
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]:eq(2)', dropDownText: vehicleDetails.partitionType });
    selectDate({
      locator: '[name="partitionInstalledDate"]',
      year: vehicleDetails.partitionInstalledDate.year,
      month: vehicleDetails.partitionInstalledDate.month,
      date: vehicleDetails.partitionInstalledDate.date
    });
    cy.get('#partitionInstalledInvoice').clear().type(vehicleDetails.partitionInstalledInvoice);
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]:eq(3)', dropDownText: vehicleDetails.meterType });
    selectDate({
      locator: '[name="meterInstalledDate"]',
      year: vehicleDetails.meterInstalledDate.year,
      month: vehicleDetails.meterInstalledDate.month,
      date: vehicleDetails.meterInstalledDate.date
    });
    cy.get('#meterSerialNo').clear().type(vehicleDetails.meterSerialNo);
    cy.get('#meterInstalledInvoice').clear().type(vehicleDetails.meterInstalledInvoice);
    selectDropDownInList({ locator: '[class="form-body"] [data-pc-name="dropdown"]:eq(4)', dropDownText: vehicleDetails.roofTopType });
    selectDate({
      locator: '[name="roofTopInstalledDate"]',
      year: vehicleDetails.roofTopInstalledDate.year,
      month: vehicleDetails.roofTopInstalledDate.month,
      date: vehicleDetails.roofTopInstalledDate.date
    });
    cy.get('#rooftopInvoice').clear().type(vehicleDetails.rooftopInvoice);
    cy.get('[aria-label="Submit Hack Details"]').click();
    cy.wait(2000);
 
    // Registered Vehicle Details    
    uploadDocument({
      locator: '[id="registrationFee"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    uploadDocument({
      locator: '[id="uploadRegistrationCertificate"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    selectDate({
      locator: '[name="registrationExpiryDate"]',
      year: vehicleDetails.registrationExpiryDate.year,
      month: vehicleDetails.registrationExpiryDate.month,
      date: vehicleDetails.registrationExpiryDate.date
    });
    cy.get('#registrationFee').clear().type(vehicleDetails.registrationFee);
    cy.get('#uploadRegistrationCertificate').clear().type(vehicleDetails.uploadRegistrationCertificate);
    cy.get('#plateNo').clear().type(vehicleDetails.plateNo);
    cy.get('[aria-label="Submit Vehicle Details"]').click();
    cy.wait(2000);
 
    // Vehicle Hack Up Inspection
    uploadDocument({
      locator: '[aria-label="Upload Meter Inspection Report "] svg',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    uploadDocument({
      locator: '[aria-label="Upload Rate Card "] svg',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    uploadDocument({
      locator: '[aria-label="Upload Inspection Receipt"] svg',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    cy.get(`[id="mileRun_${vehicleDetails.mileRun}"]`).click();
    selectDate({
      locator: '[name="inspectionDate"]',
      year: vehicleDetails.inspectionDate.year,
      month: vehicleDetails.inspectionDate.month,
      date: vehicleDetails.inspectionDate.date
    });
    selectTime({
      locator: '[name="inspectionTime"]',
      hour: vehicleDetails.inspectionTime.hour,
      minute: vehicleDetails.inspectionTime.minute,
      second: vehicleDetails.inspectionTime.second
    });
    selectDate({
      locator: '[name="odometerReadingDate"]',
      year: vehicleDetails.odometerReadingDate.year,
      month: vehicleDetails.odometerReadingDate.month,
      date: vehicleDetails.odometerReadingDate.date
    });
    selectTime({
      locator: '[name="odometerReadingTime"]',
      hour: vehicleDetails.odometerReadingTime.hour,
      minute: vehicleDetails.odometerReadingTime.minute,
      second: vehicleDetails.odometerReadingTime.second
    });
    cy.get('[id="odometerReading"]').clear().type(vehicleDetails.odometerReading);
    selectDate({
      locator: '[name="loggedDate"]',
      year: vehicleDetails.loggedDate.year,
      month: vehicleDetails.loggedDate.month,
      date: vehicleDetails.loggedDate.date
    });
    selectTime({
      locator: '[name="loggedTime"]',
      hour: vehicleDetails.loggedTime.hour,
      minute: vehicleDetails.loggedTime.minute,
      second: vehicleDetails.loggedTime.second
    });
    cy.get(`[id="result_${vehicleDetails.result}"]`).click();
    cy.get('[id="inspectionFee"]').clear().type(vehicleDetails.inspectionFee);
    selectDate({
      locator: '[name="nextInspectionDue"]',
      year: vehicleDetails.nextInspectionDue.year,
      month: vehicleDetails.nextInspectionDue.month,
      date: vehicleDetails.nextInspectionDue.date
    });
    cy.get(`[id="accept"]`).click();
    cy.get('[aria-label="Submit Vehicle Details"]').click();
 
    cy.get('[role="dialog"]').should('contain', 'Vehicle Hack-Up Process is successful and approved');
    cy.get('[role="dialog"] button').click();
 
    //Select Vehicle to check hack up details
    cy.get('[alt="Car"]').eq(2).click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Assertions
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(0)').should('contain', vehicleDetails.tpepType);
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(1)').should('contain', vehicleDetails.configurationType);
    cy.get('#paint_yes').parent().should('have.attr', 'data-p-highlight', 'false');
    cy.get('#camera_yes').parent().should('have.attr', 'data-p-highlight', 'false');
    cy.get('#partition_yes').parent().should('have.attr', 'data-p-highlight', 'false');
    cy.get('#meter_yes').parent().should('have.attr', 'data-p-highlight', 'false');
    cy.get('#rooftop_yes').parent().should('have.attr', 'data-p-highlight', 'false');
    cy.get('[name="paintCompletedDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.paintCompletedDate }));
    cy.get('#paintInvoice').should('have.value', vehicleDetails.paintInvoice);
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(2)').should('contain', vehicleDetails.partitionType);
    cy.get('[name="partitionInstalledDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.partitionInstalledDate }));
    cy.get('#partitionInstalledInvoice').should('have.value', vehicleDetails.partitionInstalledInvoice);
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(3)').should('contain', vehicleDetails.meterType);
    cy.get('[name="meterInstalledDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.meterInstalledDate }));
    cy.get('#meterSerialNo').should('have.value', vehicleDetails.meterSerialNo);
    cy.get('#meterInstalledInvoice').should('have.value', vehicleDetails.meterInstalledInvoice);
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(4)').should('contain', vehicleDetails.roofTopType);
    cy.get('[name="roofTopInstalledDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.roofTopInstalledDate }));
    cy.get('#rooftopInvoice').should('have.value', vehicleDetails.rooftopInvoice);
    cy.get('[aria-label="Submit Hack Details"]').click().wait(2000);
 
    cy.get('[name="registrationExpiryDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.registrationExpiryDate }));
    cy.get('#registrationFee').should('have.value', vehicleDetails.registrationFee);
    cy.get('#plateNo').should('have.value', vehicleDetails.plateNo);
    cy.get('[aria-label="Submit Vehicle Details"]').click().wait(2000);
 
    cy.get(`[id="mileRun_${vehicleDetails.mileRun}"]`).should('be.checked');
    cy.get('[name="inspectionDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.inspectionDate }));
    cy.get('[name="odometerReadingDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.odometerReadingDate }));
    cy.get('[id="odometerReading"]').should('have.value', vehicleDetails.odometerReading);
    cy.get('[name="loggedDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.loggedDate }));
    cy.get(`[id="result_${vehicleDetails.result}"]`).should('be.checked');
    cy.get('[id="inspectionFee"]').should('have.value', vehicleDetails.inspectionFee);
    cy.get('[name="nextInspectionDue"]').should('have.value', convertDateFormat({ date: vehicleDetails.nextInspectionDue }));
  });
  it('BAT-1352 QA - Manage Vehicle: List Vehicles', () => {
    loginToPage(username, password, baseUrl);
 
    //Go to Manage Vehicles page
    cy.get('[class="sidebar scroll-bar"]').contains('Vehicles').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Vehicle').click();
 
    //Check if no column in the table is empty
    cy.get('[data-testid="paginator"] div[aria-haspopup="listbox"]').click();
    cy.get('[aria-label="20"]').click().wait(2000);
    cy.get('[class="table-component"] [data-pc-section="tbody"] tr').each(($row) => {
      for (let col = 2; col <= 7; col++) {
        cy.wrap($row)
          .find(`td:nth-child(${col})`)
          .invoke('text')
          .then((text) => {
            expect(text.trim()).not.to.be.empty;
          });
      }
    });
  });
  it.only('BAT-1356 QA - New Driver: Search Drivers', () => {
    loginToPage(username, password, baseUrl);
 
    const driverDetails = {...medallionPayeeDetails,...{
      tlcLicenseNo: 'TLC94111',
      dmvLicenseNo: 'DMV79678',
      ssn: '817-42-5032',
      city: 'Chicago',
      state: 'IL',
      zip: '42345',
      maskedSSN: 'XXX-XX-5032',
      driverName: 'Robert',
      driverStatus: 'Active',
     
    }};
   
    //Go to New Driver page
    cy.get('[class="sidebar scroll-bar"]').contains('Drivers').click();
    cy.get('[class="sidebar scroll-bar"]').contains('New Driver').click({force:true});
    cy.get('[aria-label="Proceed"]').click().wait(2000);
 
    //Search driver on tlcLicenseNo
    cy.get('[id="tlcLicenseNumber"]').clear().type(driverDetails.tlcLicenseNo);
    cy.get('[aria-label="Search"]').click();
    cy.get('[aria-label="Proceed"]').click();
    cy.get('.p-dialog-mask').click({force:true});
    //assert clicking the Driver icon
    cy.get("svg[width='29'][height='33']").each(($el) => {
      cy.wrap($el).click({ force: true });
    });
   
 
    cy.get('.border-radius-0').click();
    cy.get('#city').type(driverDetails.city);
    cy.get('#state').type(driverDetails.state);
    cy.get("#zip").type(driverDetails.zip)
 
 
 
    cy.get('[class="table-component"]').should('contain', driverDetails.driverName);
    cy.get('[class="table-component"]').should('contain', driverDetails.driverStatus);
    cy.get('[class="table-component"]').should('contain', driverDetails.tlcLicenseNo);
    cy.get('[class="table-component"]').should('contain', driverDetails.dmvLicenseNo);
    cy.get('[class="table-component"]').should('contain', driverDetails.maskedSSN);
 
    //Clear the table
    cy.get('[class="form-section"] [type="button"]').click();
 
    //Search driver on dmvLicenseNo
    cy.get('[id="dmvLicenseNumber"]').clear().type(driverDetails.dmvLicenseNo);
    cy.get('[aria-label="Search"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    cy.get('[class="table-component"]').should('contain', driverDetails.driverName);
    cy.get('[class="table-component"]').should('contain', driverDetails.driverStatus);
    cy.get('[class="table-component"]').should('contain', driverDetails.tlcLicenseNo);
    cy.get('[class="table-component"]').should('contain', driverDetails.dmvLicenseNo);
    cy.get('[class="table-component"]').should('contain', driverDetails.maskedSSN);
 
    //Clear the table
    cy.get('[class="form-section"] [type="button"]').click();
 
    //Search driver on ssn
    cy.get('[id="ssn"]').clear().type(driverDetails.ssn);
    cy.get('[aria-label="Search"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    cy.get('[class="table-component"]').should('contain', driverDetails.driverName);
    cy.get('[class="table-component"]').should('contain', driverDetails.driverStatus);
    cy.get('[class="table-component"]').should('contain', driverDetails.tlcLicenseNo);
    cy.get('[class="table-component"]').should('contain', driverDetails.dmvLicenseNo);
    cy.get('[class="table-component"]').should('contain', driverDetails.maskedSSN);
 
    //Clear the table
    cy.get('[class="form-section"] [type="button"]').click();
  });
  it('BAT-1342 QA - Manage Driver: List All the Active Drivers', () => {
    loginToPage(username, password, baseUrl);
 
    //Go to Manage Driver page
    cy.get('[class="sidebar scroll-bar"]').contains('Drivers').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Driver').click();
    cy.get('[data-testid="paginator"] div[aria-haspopup="listbox"]').click();
    cy.get('[aria-label="20"]').click().wait(2000);
 
    cy.get('[class="table-component"] [data-pc-section="tbody"] tr').each(($row) => {
      cy.wrap($row)
        .find('td:nth-child(2) [class="mx-2"]')
        .should('exist')
        .should('have.css', 'background-color', 'rgb(29, 193, 59)');
    });
 
  });
  it('BAT-1346 QA - Manage Driver: DMV License Update', () => {
    loginToPage(username, password, baseUrl);
 
    const driverDMVDetails = {
      licenseNo: generateDMVLicenseNumber(),
      licenseIssuedState: 'NY',
      dmvClass: "SClass",
      dmvLicenseStatus: "Active",
      dmvRenewalFee: "300",
      active: true,
      classChangeDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
      documentsDate: {
        year: "2025",
        month: "Jan",
        date: "22"
      },
    };
    //Go to Manage Driver page
    cy.get('[class="sidebar scroll-bar"]').contains('Driver').click();
    cy.get('[class="sidebar scroll-bar"]').contains('Manage Driver').click();
 
    //Select driver for DMV Update
    cy.get('[data-testid="three-dot-menu"]').first().click();
    cy.get('a[aria-label="Update DMV License"]').click();
    cy.get('[aria-label="Proceed"]').click();
 
    //Update DMV License
    uploadDocument({
      locator: '[aria-label="Upload Updated DMV License"] svg',
      year: driverDMVDetails.documentsDate.year,
      month: driverDMVDetails.documentsDate.month,
      date: driverDMVDetails.documentsDate.date
    });
    cy.get(`[id="is_dmv_license_active_${driverDMVDetails.active}"]`).click();
    cy.get('[id="dmv_license_number"]').clear().type(driverDMVDetails.licenseNo);
    cy.get('[id="dmv_license_issued_state"]').clear().type(driverDMVDetails.licenseIssuedState);
    cy.get('[id="dmv_class"]').clear().type(driverDMVDetails.dmvClass);
    cy.get('[id="dmv_license_status"]').clear().type(driverDMVDetails.dmvLicenseStatus);
    selectDate({
      locator: '[name="dmv_class_change_date"]',
      year: driverDMVDetails.classChangeDate.year,
      month: driverDMVDetails.classChangeDate.month,
      date: driverDMVDetails.classChangeDate.date
    });
    selectDate({
      locator: '[name="dmv_license_expiry_date"]',
      year: driverDMVDetails.classChangeDate.year,
      month: driverDMVDetails.classChangeDate.month,
      date: driverDMVDetails.classChangeDate.date
    });
    cy.get('#dmv_renewal_fee').clear().type(driverDMVDetails.dmvRenewalFee);
 
    cy.get('[aria-label="Submit Updated License"]').click().wait(2000);
    //Assertions
    cy.get('[class="form-section"]').should('contain', driverDMVDetails.licenseNo)
    cy.get('[class="form-section"]').should('contain', driverDMVDetails.licenseIssuedState)
    cy.get('[class="form-section"]').should('contain', driverDMVDetails.dmvClass)
    cy.get('[class="form-section"]').should('contain', driverDMVDetails.dmvLicenseStatus)
    cy.get('[class="form-section"]').should('contain', driverDMVDetails.dmvRenewalFee)
 
    cy.get('[aria-label="Submit Updated License"]').click();
    cy.get('[role="dialog"]').should('contain', 'DMV License update process is successful');
    cy.get('[role="dialog"] button').click();
 
  });
});