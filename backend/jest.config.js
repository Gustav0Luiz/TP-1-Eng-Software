module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./src/__tests__/setupTests.js'],
  coverageProvider: 'v8',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.js'],
};
