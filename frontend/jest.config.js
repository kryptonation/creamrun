module.exports = {
    testEnvironment: "jsdom",
    transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { sourceType: 'module' }]
    },
    moduleNameMapper: {
      // Mock CSS imports
      "\\.(css|scss)$": "identity-obj-proxy",
      // Mock PrimeReact styles (prevents JSDOM CSS parsing errors)
      "primereact/resources/primereact.css": "<rootDir>/__mocks__/styleMock.js",
      "primereact/resources/themes/lara-light-indigo/theme.css": "<rootDir>/__mocks__/styleMock.js",
    },
    setupFilesAfterEnv: ["@testing-library/jest-dom"],
  };