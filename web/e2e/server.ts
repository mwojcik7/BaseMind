// Started by Playwright (webServer in playwright.config.ts): resets the e2e database,
// then serves the built app and the API with PHP's built-in server.
import { execFileSync, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { E2E_DATABASE, E2E_PORT, serverEnv } from './env.ts'

const apiDir = fileURLToPath(new URL('../../api', import.meta.url))
const env = { ...process.env, ...serverEnv }

function artisan(...args: string[]): string {
  return execFileSync('php', ['artisan', ...args], { cwd: apiDir, env, encoding: 'utf8' })
}

// Ask Laravel itself which database it will use: if the overrides did not take
// effect (e.g. a cached config), stop before wiping anything.
const database = artisan(
  'tinker',
  '--execute=echo "DB=" . DB::connection()->getDatabaseName();',
).match(/DB=(\S+)/)?.[1]

if (database !== E2E_DATABASE) {
  console.error(`Refusing to reset database "${database}": expected "${E2E_DATABASE}".`)
  process.exit(1)
}

artisan('migrate:fresh', '--force')

// Laravel's router script resolves public/index.php from the working directory,
// like `php artisan serve`, which starts it from public/.
const server = spawn(
  'php',
  [
    '-S',
    `127.0.0.1:${E2E_PORT}`,
    '../vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php',
  ],
  { cwd: `${apiDir}/public`, env, stdio: 'inherit' },
)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => server.kill())
}
server.on('exit', (code) => process.exit(code ?? 0))
