import '@fontsource-variable/inter'
import { RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { createAppRouter } from '@/app/router'
import { startAuth } from '@/lib/auth'
import { applyTheme, getTheme } from '@/lib/theme'
import './index.css'

applyTheme(getTheme())
void startAuth()

const router = createAppRouter()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

registerSW({ immediate: true })
