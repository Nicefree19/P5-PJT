/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.js'],
  moduleFileExtensions: ['js', 'json'],
  collectCoverageFrom: [
    'src/dashboard/js/**/*.js',
    '!src/dashboard/js/**/*.min.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  verbose: true,
  testTimeout: 10000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
};
