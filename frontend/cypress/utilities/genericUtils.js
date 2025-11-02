const loginToPage = (username, password, baseUrl) => {
  cy.visit(`${baseUrl}`);
  // Intercept the login POST request
  cy.intercept("POST", "**/login").as("loginRequest");

  // Type the username and password into the respective fields
  cy.get("#username").type(username);
  cy.get("#password").type(password);

  // Click the Sign In button with force option to ensure click happens
  cy.get('button[aria-label="Sign In"]').click({ force: true });

  // Wait for the intercepted login request and validate the response
  cy.wait("@loginRequest").then((interception) => {
    expect(interception.response.statusCode).to.eq(200);
    expect(interception.response.body).to.have.property(
      "message",
      "Login successful"
    );
  });

  // Verify that the URL after login matches the base URL
 // cy.url().should('eq', `${baseUrl}`);
    cy.get('[class="sidebar scroll-bar"] [aria-current="page"] span')
    .should("be.visible")
    .and("have.text", "Home");
};

//Generates Unique Medallion Number
const generateMedallionNumber = () => {
  const number1 = Math.floor(Math.random() * 10);
  const character = String.fromCharCode(Math.floor(Math.random() * 26) + 65);
  const number2 = Math.floor(Math.random() * 10);
  const number3 = Math.floor(Math.random() * 10);

  return `${number1}${character}${number2}${number3}`;
};

const generateVIN = () => {
  const characters = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789"; // VIN doesn't include I, O, Q
  let vin = "";

  for (let i = 0; i < 17; i++) {
    vin += characters[Math.floor(Math.random() * characters.length)];
  }

  return vin;
};

const generateDMVLicenseNumber = () => {
  const character = String.fromCharCode(Math.floor(Math.random() * 26) + 65); // Random uppercase letter (A-Z)
  const numbers = Array.from({ length: 7 }, () =>
    Math.floor(Math.random() * 10)
  ).join(""); // 7 random digits

  return `${character}${numbers}`;
};

const selectDropDownInList = ({
  locator: locatorVal,
  dropDownText: dropDownValue,
}) => {
  cy.get(locatorVal).click().wait(3000);
  cy.get('[role="listbox"] li').contains(dropDownValue).click();
};

const selectDate = ({
  locator: locatorVal,
  year: yearValue,
  month: monthValue,
  date: dateValue,
}) => {
  cy.get(locatorVal).click().wait(3000);
  cy.get('[aria-label="Choose Year"]').click();
  cy.get('[data-pc-section="yearpicker"]')
    .contains(yearValue)
    .click({ force: true }); 
  cy.get('[data-pc-section="monthpicker"]')
    .contains(monthValue)
    .click({ force: true });
  cy.get('[data-pc-section="container"] [data-pc-section="tablebody"]')
  .contains(dateValue)
  .filter('[data-p-disabled="false"]').eq(0)
  
 .wait(2000)
    //.find(`[aria-label="${dateValue}"]`).first() /////.find(`[aria-label="${dateValue}"]`)  ///// 
    .click({force:true});


  // cy.get('[data-pc-section="container"] [data-pc-section="tablebody"]')
  // .find(`[aria-label="${dateValue}"]`)
  // .filter('[data-p-disabled="true"]')
  // .then(($elements) => {
  //   // Filter elements that are NOT disabled
  //   const enabledElements = $elements.filter((_, el) => Cypress.$(el).attr('data-p-disabled') !== 'true');

  //   if (enabledElements.length > 0) {
  //     // If eq(0) is enabled, click it
  //     if (enabledElements.eq(0).length) {
  //       cy.wrap(enabledElements.eq(0)).click({ force: true });
  //       cy.log('Clicked on eq(0)');
  //     } 
  //     // If eq(0) is disabled but eq(1) is enabled, click eq(1)
  //     else if (enabledElements.eq(1).length) {
  //       cy.wrap(enabledElements.eq(1)).click({ force: true });
  //       cy.log('Clicked on eq(1)');
  //     } 
  //     // If neither eq(0) nor eq(1) is enabled, do nothing
  //     else {
  //       cy.log('No selectable elements found.');
  //     }
  //   }});
    
  




  //   cy.get('[data-pc-section="container"] [data-pc-section="tablebody"]')
  // .find(`[aria-label="${dateValue}"]`)
  // .each(($el) => {
  //   if ($el.is(':visible')) {  // Ensures we click only a visible element
  //     cy.wrap($el).click({ force: true });
  //     return false; // Stops loop after clicking the correct one
  //   }
  // });

};
const selectYear = ({ locator: locatorVal, year: yearValue }) => {
  cy.get(locatorVal).click().wait(3000);
  cy.get('[data-pc-section="yearpicker"]').contains(yearValue).click();
};
const selectTime = ({
  locator: locatorVal,
  hour: hourValue,
  minute: minuteValue,
  second: secondValue,
}) => {
  cy.get(locatorVal).click().wait(3000);
  cy.get('[data-pc-section="timepicker"] [data-pc-section="hourpicker"]')
    .invoke("text")
    .then((currentHour) => {
      const hourDifference = hourValue - currentHour;
      cy.log("current hour:", currentHour);
      cy.log("expected hour:", hourValue);
      cy.log("difference in hour:", hourDifference);
      if (hourDifference > 0) {
        for (let i = 0; i < hourDifference; i++) {
          cy.get(
            '[data-pc-section="timepicker"] [data-pc-section="hourpicker"] [data-pc-section="incrementbutton"]'
          )
            .click({ force: true })
            .wait(100);
        }
      } else if (hourDifference < 0) {
        for (let i = 0; i < Math.abs(hourDifference); i++) {
          cy.get(
            '[data-pc-section="timepicker"] [data-pc-section="hourpicker"] [data-pc-section="decrementbutton"]'
          )
            .click({ force: true })
            .wait(100);
        }
      }
    });
  cy.get('[data-pc-section="timepicker"] [data-pc-section="minutepicker"]')
    .invoke("text")
    .then((currentminute) => {
      const minuteDifference = minuteValue - currentminute;
      cy.log("current minute:", currentminute);
      cy.log("expected minute:", minuteValue);
      cy.log("difference in minute:", minuteDifference);
      if (minuteDifference > 0) {
        for (let i = 0; i < minuteDifference; i++) {
          cy.get(
            '[data-pc-section="timepicker"] [data-pc-section="minutepicker"] [data-pc-section="incrementbutton"]'
          )
            .click({ force: true })
            .wait(100);
        }
      } else if (minuteDifference < 0) {
        for (let i = 0; i < Math.abs(minuteDifference); i++) {
          cy.get(
            '[data-pc-section="timepicker"] [data-pc-section="minutepicker"] [data-pc-section="decrementbutton"]'
          )
            .click({ force: true })
            .wait(100);
        }
      }
    });
  cy.get('[data-pc-section="timepicker"] [data-pc-section="secondpicker"]')
    .invoke("text")
    .then((currentsecond) => {
      const secondDifference = secondValue - currentsecond;
      cy.log("current second:", currentsecond);
      cy.log("expected second:", secondValue);
      cy.log("difference in second:", secondDifference);
      if (secondDifference > 0) {
        for (let i = 0; i < secondDifference; i++) {
          cy.get(
            '[data-pc-section="timepicker"] [data-pc-section="secondpicker"] [data-pc-section="incrementbutton"]'
          )
            .click({ force: true })
            .wait(100);
        }
      } else if (secondDifference < 0) {
        for (let i = 0; i < Math.abs(secondDifference); i++) {
          cy.get(
            '[data-pc-section="timepicker"] [data-pc-section="secondpicker"] [data-pc-section="decrementbutton"]'
          )
            .click({ force: true })
            .wait(100);
        }
      }
    });
};

const uploadDocument = ({
  locator: locatorVal,
  year: yearValue,
  month: monthValue,
  date: dateValue,
}) => {
  cy.get(locatorVal).parent().find("svg").click();
  cy.wait(5000);
  cy.get('[role="dialog"]').then(($body) => {
    if ($body.find('[type="button"] button').length) {
      // delete document if it exists
      cy.get('[role="dialog"] [type="button"] button').click({ force: true });
      cy.get(locatorVal).parent().find("svg").click().wait(2000);
    }
  });
  cy.get('[data-pc-name="fileupload"] [data-pc-section="buttonbar"] input')
    .invoke("show").wait(3000)
    .selectFile("cypress/fixtures/Renewal Liscense Mock.pdf", {
      action: "drag-drop",
    });
  cy.wait(2000);
  selectDate({
    locator: '[role="dialog"] [data-pc-name="calendar"]',
    year: yearValue,
    month: monthValue,
    date: dateValue,
  });
  cy.get('[id="notes"]').type("document uploaded");
  cy.get('[role="dialog"] [type="submit"]').click().wait(2000);
};

const uploadDocumentWithDocType = ({
  locator: locatorVal,
  year: yearValue,
  month: monthValue,
  date: dateValue,
  documentType: docType,
}) => {
  cy.get(locatorVal).find("svg").click();
  cy.wait(2000);
  cy.get('[role="dialog"]').then(($body) => {
    if ($body.find('[type="button"] button').length) {
      // delete document if it exists
      cy.get('[role="dialog"] [type="button"] button').click({ force: true });
      cy.get(locatorVal).parent().find("svg").click();
    }
  });
  cy.get('[data-pc-name="fileupload"] [data-pc-section="buttonbar"] input')
    .invoke("show")
    .selectFile("cypress\\fixtures\\Invoice 1.pdf", {
      action: "drag-drop",
    });
  cy.wait(2000);
  selectDate({
    locator: '[role="dialog"] [data-pc-name="calendar"]',
    year: yearValue,
    month: monthValue,
    date: dateValue,
  });
  selectDropDownInList({
    locator: '[aria-label="Select a Document Type"]',
    dropDownText: docType,
  });
  cy.get('[id="notes"]').type("document uploaded");
  cy.get('[role="dialog"] [type="submit"]').click().wait(2000);
};

const convertDateFormat = ({ date }) => {
  const monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  const month = monthMap[date.month]; // Convert month name to number
  const day = date.date.padStart(2, "0"); // Ensure 2-digit day
  const year = date.year; // Extract year

  return `${month}/${day}/${year}`;
};

export {
  loginToPage,
  generateMedallionNumber,
  generateDMVLicenseNumber,
  generateVIN,
  selectDropDownInList,
  selectDate,
  selectTime,
  selectYear,
  uploadDocument,
  uploadDocumentWithDocType,
  convertDateFormat,
};
