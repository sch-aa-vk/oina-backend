module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/test/tsconfig.json' }]
  },
  moduleNameMapper: {
    '^uuid$': '<rootDir>/__mocks__/uuid.js',
  },
  setupFilesAfterEnv: ['aws-cdk-lib/testhelpers/jest-autoclean'],
};
