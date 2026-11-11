// https://docs.expo.dev/guides/using-eslint/
const expoConfig = require('eslint-config-expo/flat');
const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    // Testes e mocks usam require() para pegar os ajudantes dos mocks automáticos do Jest.
    files: ['__tests__/**', '__mocks__/**', 'test-utils/**'],
    languageOptions: { globals: { jest: 'readonly' } },
  },
]);
