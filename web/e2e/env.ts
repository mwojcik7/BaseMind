// Settings for the API instance the e2e tests run against. They are passed as
// environment variables, which take precedence over api/.env, so the tests never
// touch the `basemind` database with the real account.

export const E2E_PORT = 8091
export const E2E_URL = `http://localhost:${E2E_PORT}`
export const E2E_DATABASE = 'basemind_e2e'
export const INVITATION_CODE = 'e2e-invitation-code'

export const serverEnv: Record<string, string> = {
  APP_ENV: 'e2e',
  APP_DEBUG: 'false',
  APP_URL: E2E_URL,
  DB_DATABASE: E2E_DATABASE,
  SANCTUM_STATEFUL_DOMAINS: `localhost:${E2E_PORT}`,
  SESSION_DOMAIN: '',
  MAIL_MAILER: 'log',
  QUEUE_CONNECTION: 'sync',
  BASEMIND_OWNER_EMAIL: '',
  BASEMIND_REGISTRATION_CODE: INVITATION_CODE,
  // A test-only key, the same one phpunit.xml uses. Never the real SODIUM_KEY.
  SODIUM_KEY: 'YmFzZW1pbmQtdGVzdC1rZXktbm90LWEtc2VjcmV0ISE=',
  SODIUM_PREVIOUS_KEYS: '',
}
