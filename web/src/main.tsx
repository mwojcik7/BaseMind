import '@fontsource-variable/inter'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { createAppRouter } from '@/app/router'
import { startAuth } from '@/lib/auth'
import { offerUpdate, startInstallTracking, watchForUpdates } from '@/lib/pwa'
import { applyTheme, getTheme } from '@/lib/theme'
import { startSync } from '@/sync/engine'
import './index.css'

applyTheme(getTheme())
startInstallTracking()
startSync()
void startAuth()

const router = createAppRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh: () => offerUpdate(() => void updateServiceWorker(true)),
  onRegisteredSW: (_url, registration) => {
    if (registration) {
      watchForUpdates(registration)
    }
  },
})
