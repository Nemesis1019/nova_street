module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  // Los e2e viven en otra config (`test:jtest-e2e`) y requieren una BD dedicada.
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
    // @scure/base (usado por otplib) se publica como ESM: se transpila a CJS.
    '^.+\\.js$': '<rootDir>/test/esm-js-transformer.js',
  },
  // Permite transformar @scure/@noble/@otplib también con el layout de pnpm (.pnpm/...).
  transformIgnorePatterns: ['/node_modules/(?!(.pnpm|@scure|@noble|@otplib|otplib)/)'],
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  testTimeout: 15_000,
  maxWorkers: 1,
};
