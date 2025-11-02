
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
    }
  }
  describe("Manage Vehicle",()=>{

 
    let vehicleDetails = {
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
      invoiceDate:{
        year:"2025",
        month:"Mar",
        date: "10"
      },
      VehicleInDate:{
        year:"2025",
        month:"Mar",
        date: "19"
      },
      VehicleInTime: {
        hour: "15",
        minute: "03",
        second: "31"
      },
      VehicleOutDate:{
        year:"2025",
        month:"Mar",
        date: "30"
      },
      VehicleOutTime: {
        hour: "15",
        minute: "01",
        second: "32"
      },
      NextServiceDueBy: {
        year:"2025",
        month:"Apr",
        date: "10"
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



    
   


    it.skip('BAT-1354 QA - Manage Vehicle: Hack-up - Details - All Fields', () => {
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
        cy.get('[class="sidebar scroll-bar"]').contains('Manage Vehicle').click().wait(3000);
    
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
        cy.get('#paint_yes').check({ force: true });
        cy.get('#camera_yes').check({ force: true });
        cy.get('#partition_yes').check({ force: true });
        cy.get('#meter_yes').check({ force: true });
        cy.get('#rooftop_yes').check({ force: true });
    
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
    
        // //Select Vehicle to check hack up details
        // cy.get('[alt="Car"]').eq(2).click();
        // cy.get('[aria-label="Proceed"]').click();
    
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


      
        it.skip("BAT- 1719 : Repair Vehicle ",()=>{
      
          loginToPage(username, password, baseUrl);
      
          cy.xpath("//span[contains(text(),'Vehicles')]").click().should('contain','Vehicles ');
        cy.get('.bg-transparent > :nth-child(2) > .menu-link').click().should('have.text','Manage Vehicle');
            // clicking the option button
            cy.get(':nth-child(1) > :nth-child(10) > div > [data-testid="three-dot-menu"]').click({force:true});
        cy.get("tr[draggable='false']").contains("td", "5XXGT4L31HG123456").should("be.visible");
        cy.get("a[aria-label='Vehicle Repairs']").should('have.text','Vehicle Repairs').click({force:true}).wait(2000);
        //assert for having the conformation text
        cy.get(".header-text").should('have.text','Confirmation on Vehicle Repairs');
        cy.get("button[aria-label='Proceed']").click({force:true}).wait(3000);
        //verify that the page is present in current page
        cy.get("p[class='topic-txt']").should('have.text','Vehicle Repairs');


        // Enter vehicle Repair details
        uploadDocument({
          locator: "button[aria-label='Upload Documents'] span[class='p-button-label p-c']",
          year: vehicleDetails.documentDate.year,
          month: vehicleDetails.documentDate.month,
          date: vehicleDetails.documentDate.date,
          documentType: vehicleDetails.documentType
        });

        selectDate({
          locator: '#invoice_date',
          year: vehicleDetails.invoiceDate.year,
          month: vehicleDetails.invoiceDate.month,
          date: vehicleDetails.invoiceDate.date
        });
        selectDate({
          locator: '#vehicle_in_date',
          year: vehicleDetails.VehicleInDate.year,
          month: vehicleDetails.VehicleInDate.month,
          date: vehicleDetails.VehicleInDate.date
        });
        selectTime({
          locator: '#vehicle_in_time',
          hour: vehicleDetails.VehicleInTime.hour,
          minute: vehicleDetails.VehicleInTime.minute,
          second: vehicleDetails.VehicleInTime.second
        });
        selectDate({
          locator: '#vehicle_out_date',
          year: vehicleDetails.VehicleOutDate.year,
          month: vehicleDetails.VehicleOutDate.month,
          date: vehicleDetails.VehicleOutDate.date
        });
        selectTime({
          locator: '#vehicle_out_time',
          hour: vehicleDetails.VehicleOutTime.hour,
          minute: vehicleDetails.VehicleOutTime.minute,
          second: vehicleDetails.VehicleOutTime.second
        });

      cy.get("body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(7) > form:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(1) > div:nth-child(7) > div:nth-child(1) > span:nth-child(1) > span:nth-child(1) > input:nth-child(1)").type("250");
        cy.get("label[for='invoice_amount']").should('contain','Invoice Amount');

      
        selectDate({
          locator: '#next_service_due_by',
          year: vehicleDetails.NextServiceDueBy.year,
          month: vehicleDetails.NextServiceDueBy.month,
          date: vehicleDetails.NextServiceDueBy.date
        });
        cy.get("button[aria-label='Submit Vehicle Repair Details']").click().should('have.text','Submit Vehicle Repair Details');

      });

////////////////////////////////////////////////////////////////////////



it.skip(" BAT- 1738 : Terminate Vehicle  ",()=>{
      
  loginToPage(username, password, baseUrl);
  cy.xpath("//span[contains(text(),'Vehicles')]").click().should('contain','Vehicles ').wait(3000);
  cy.get('.bg-transparent > :nth-child(2) > .menu-link').click().should('have.text','Manage Vehicle');
//  clicking the option button
  cy.get(':nth-child(1) > :nth-child(10) > div > [data-testid="three-dot-menu"]').click({force:true});
  cy.get("tr[draggable='false']").contains("td", "5XXGT4L31HG123456").should("be.visible");


  cy.get('.table-component > [data-testid="paginator"] > .p-paginator-last').click().wait(3000)
 cy.xpath("(//*[name()='svg'])[47]/..").click({force:true})
 cy.get("a[aria-label='Terminate Vehicle']").should('be.visible').click();

 //   //assert of Warning pop-up menu
 cy.get('.header-text').should('have.text','Warning on Terminate Vehicle');
 cy.get('.primary-btn').should('have.text','Proceed').click({force:true})


//   cy.get('body > div:nth-child(2) > div:nth-child(1) > main:nth-child(2) > section:nth-child(2) > div:nth-child(2) > div:nth-child(1) > div:nth-child(2) > div:nth-child(1) > div:nth-child(1) > table:nth-child(1) > tbody:nth-child(2) > tr:nth-child(2) > td:nth-child(10) > div:nth-child(1)').click({force:true}).wait(2000);
//   cy.xpath("#pr_id_248_4").should('have.text','Terminate Vehicle').click({force:true});

//   //assert of Warning pop-up menu
//  cy.get(".header-text").should('have.text','Warning on Terminate Vehicle');
//   cy.get("button[aria-label='Proceed']").click({force:true}).wait(2000);
//   cy.get('[style="font-size: 16px; font-weight: 600;"]').should('have.text','Terminate Vehicle Successful'); 
        })            


        it.only(" BAT- 1709 : Hack-Up Vehicle  ",()=>{
      
          loginToPage(username, password, baseUrl);
          cy.xpath("//span[contains(text(),'Vehicles')]").click().should('contain','Vehicles ').wait(3000);
          cy.get('.bg-transparent > :nth-child(2) > .menu-link').click().should('have.text','Manage Vehicle').wait(2000);

          cy.get('.table-component > [data-testid="paginator"] > .p-paginator-last').click();
         // cy.get('.table-component > [data-testid="paginator"] > .p-paginator-pages > :nth-child(4)').click();
          cy.get(".w-15.p-button.p-component.p-button-icon-only[data-testid='add_hack_up_car']").click();
          cy.get(".header-text").should('have.text','Confirmation on Vehicle Hack-Up');
          cy.get("button[aria-label='Proceed']").should('be.visible').click(3000)



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

    //Give hack up details
    uploadDocument({
      locator: '[id="paintInvoice"]',
      year: vehicleDetails.documentsDate.year,
      month: vehicleDetails.documentsDate.month,
      date: vehicleDetails.documentsDate.date
    });
    // uploadDocument({
    //   locator: '[id="partitionInstalledInvoice"]',
    //   year: vehicleDetails.documentsDate.year,
    //   month: vehicleDetails.documentsDate.month,
    //   date: vehicleDetails.documentsDate.date
    // });
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
    cy.get('#paint_yes').check({ force: true });
    cy.get('#camera_yes').check({ force: true });
    cy.get('#partition_yes').check({ force: true });
    cy.get('#meter_yes').check({ force: true });
    cy.get('#rooftop_yes').check({ force: true });

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

    //Assertions
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(0)').should('contain', vehicleDetails.tpepType);
    cy.get('[class="form-body"] [data-pc-name="dropdown"]:eq(1)').should('contain', vehicleDetails.configurationType);
    cy.get('#paint_yes').parent().should('have.attr', 'data-p-highlight', 'true');
    cy.get('#camera_yes').parent().should('have.attr', 'data-p-highlight', 'true');
    cy.get('#partition_yes').parent().should('have.attr', 'data-p-highlight', 'true');
    cy.get('#meter_yes').parent().should('have.attr', 'data-p-highlight', 'true');
    cy.get('#rooftop_yes').parent().should('have.attr', 'data-p-highlight', 'true');
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
    //cy.get('[aria-label="Submit Hack Details"]').click();
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
    selectDate({
      locator: '[id="registrationDate"]',
      year: vehicleDetails.registrationExpiryDate.year,
      month: vehicleDetails.registrationExpiryDate.month,
      date: vehicleDetails.registrationExpiryDate.date
    });
    cy.get('#registrationFee').clear().type(vehicleDetails.registrationFee);
    cy.get('#uploadRegistrationCertificate').clear().type(vehicleDetails.uploadRegistrationCertificate);
    cy.get('#plateNo').clear().type(vehicleDetails.plateNo);
    

    //assertion
    cy.get('[name="registrationExpiryDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.registrationExpiryDate }));
    cy.get('#registrationFee').should('have.value', vehicleDetails.registrationFee);
    cy.get('#plateNo').should('have.value', vehicleDetails.plateNo);
   // cy.get('[aria-label="Submit Vehicle Details"]').click().wait(2000);
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
      year: vehicleDetails.registrationDate.year,
      month: vehicleDetails.registrationDate.month,
      date: vehicleDetails.registrationDate.date
    });
    cy.get(`[id="accept"]`).click();
    cy.get('[aria-label="Submit Vehicle Details"]').click();
    cy.get('[role="dialog"]').should('contain', 'Vehicle Hack-Up Process is successful and approved');


    //assertion
    cy.get(`[id="mileRun_${vehicleDetails.mileRun}"]`).should('be.checked');
    cy.get('[name="inspectionDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.inspectionDate }));
    cy.get('[name="odometerReadingDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.odometerReadingDate }));
    cy.get('[id="odometerReading"]').should('have.value', vehicleDetails.odometerReading);
    cy.get('[name="loggedDate"]').should('have.value', convertDateFormat({ date: vehicleDetails.loggedDate }));
    cy.get(`[id="result_${vehicleDetails.result}"]`).should('be.checked');
    cy.get('[id="inspectionFee"]').should('have.value', vehicleDetails.inspectionFee);
    cy.get('[name="nextInspectionDue"]').should('have.value', convertDateFormat({ date: vehicleDetails.nextInspectionDue }));

    cy.get('[role="dialog"] button').click();

    

    

   

    // //Select Vehicle to check hack up details
    // cy.get('[alt="Car"]').eq(2).click();
    // cy.get('[aria-label="Proceed"]').click();
    //  cy.get('.table-component > [data-testid="paginator"] > .p-paginator-last').click();
    //       cy.get('.table-component > [data-testid="paginator"] > .p-paginator-pages > :nth-child(4)').click();
    //       cy.get(".w-15.p-button.p-component.p-button-icon-only[data-testid='add_hack_up_car']").click();
        
      })
    });