describe('Login Button Click Triggers API', () => {
  const username = 'aklema@bat.com';
  const password = 'bat@123';
  const baseUrl = Cypress.config('baseUrl'); 

  beforeEach(() => {
    cy.visit(`${baseUrl}`); 
    });

  it('should trigger the login API call when button is clicked', () => {
    cy.intercept('POST', '**/login').as('loginRequest');

    cy.get('#username').type(username); 
    cy.get('#password').type(password); 
   
    cy.get('button[aria-label="Sign In"]').click({ force: true });

    cy.wait('@loginRequest').then((interception) => {  
      expect(interception.response.statusCode).to.eq(200);
      expect(interception.response.body).to.have.property('message', 'Login successful');
    });

    cy.url().should('eq', `${baseUrl}/`);

    cy.get("a[class='active menu-link d-flex align-items-center'] span").should('be.visible').and('contain', 'Home');
  });

  it('should show an error for invalid login', () => {
    cy.intercept('POST', '**/login').as('loginRequest');

    const invalidUsername = 'wronguser@bat.com';
    const invalidPassword = 'wrongpassword';

    cy.get('#username').type(invalidUsername);
    cy.get('#password').type(invalidPassword);

   
    cy.get('button[aria-label="Sign In"]').click({ force: true });

    cy.wait('@loginRequest').then((interception) => {
      expect(interception.response.statusCode).to.eq(200);
      cy.contains('p', 'Invalid email or password')
      .should('be.visible') 
      .and('have.text', 'Invalid email or password');
    });
    
  });
});
