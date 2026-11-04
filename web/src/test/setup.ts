import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach } from 'vitest'
import { useAuth } from '@/lib/auth'

// Routes are lazy-loaded, and the first import in a test file can take over the default 1 s.
configure({ asyncUtilTimeout: 5000 })

// Exit animations would otherwise keep closed sheets in the document for a while.
MotionGlobalConfig.skipAnimations = true

afterEach(() => {
  cleanup()
  localStorage.clear()
  delete document.documentElement.dataset.theme
  useAuth.setState({ status: 'loading', account: null })
})
