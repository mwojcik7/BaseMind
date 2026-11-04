// Removes the previous PWA build from Laravel's public/ directory.
//
// Vite cannot empty the output directory itself because public/ also holds
// index.php and .htaccess, so only an explicit list of build outputs is removed.
import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const publicDir = new URL('../../api/public/', import.meta.url)
const outputs = [
  'assets',
  'app-icons',
  'index.html',
  'sw.js',
  'theme-init.js',
  'manifest.webmanifest',
]

await Promise.all(
  outputs.map((name) =>
    rm(fileURLToPath(new URL(name, publicDir)), { recursive: true, force: true }),
  ),
)
