/**
 * Setup de los tests e2e.
 *
 * Seguridad: varias suites escriben/borran catálogo, configuración y usuarios.
 * Por eso solo corren si `DATABASE_URL` apunta a una BD dedicada de test
 * (`*_test` / `*_e2e`) o si se habilita `E2E_ALLOW_DEV_DB=1` de forma explícita.
 */
process.env.NODE_ENV = 'test';

const databaseUrl = process.env.DATABASE_URL ?? '';
const looksLikeTestDb = /(_test|_e2e|test_)/i.test(databaseUrl);

if (!looksLikeTestDb && process.env.E2E_ALLOW_DEV_DB !== '1') {
  throw new Error(
    'Los tests e2e requieren una base de datos dedicada (DATABASE_URL con "_test" o "_e2e"). ' +
      'Si realmente querés correrlos contra la BD de desarrollo, usá E2E_ALLOW_DEV_DB=1.',
  );
}
