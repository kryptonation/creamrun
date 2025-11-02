const { defineConfig } = require("cypress");

module.exports = defineConfig({
  e2e: {
    viewportWidth: 1920,
    viewportHeight: 1080,
    baseUrl: "http://carrot-app-lb-988134161.us-east-1.elb.amazonaws.com/", // Set the base URL for tests
    video: true, // Enable video recording for test runs
    screenshotOnRunFailure: true, // Take screenshots on test failures
    setupNodeEvents(on, config) {
      // Set up cypress-mochawesome-reporter plugin
      require("cypress-mochawesome-reporter/plugin")(on);
    },
    reporter: "cypress-mochawesome-reporter", // Use mochawesome reporter
    reporterOptions: {
      reportDir: "cypress/reports", // Directory to save reports
      overwrite: false,
      html: true,
      json: true,
    },
  },

  component: {
    devServer: {
      framework: "react",
      bundler: "webpack",
    },
  },
});