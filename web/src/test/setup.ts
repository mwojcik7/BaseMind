import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { MotionGlobalConfig } from 'motion/react'
import { afterEach } from 'vitest'
import { clearLocalData } from '@/db/db'
import { useAuth } from '@/lib/auth'

// Routes are lazy-loaded, and the first import in a test file can take over the default 1 s.
configure({ asyncUtilTimeout: 5000 })

// Exit animations would otherwise keep closed sheets in the document for a while.
MotionGlobalConfig.skipAnimations = true

// jsdom doesn't have it, and toasts call it when pressed.
Element.prototype.setPointerCapture = () => {}

// jsdom has no layout; CodeMirror (the notes editor) measures text ranges and finds nothing.
const noRects = (): DOMRectList => Object.assign([], { item: () => null }) as unknown as DOMRectList
Range.prototype.getClientRects = noRects
Range.prototype.getBoundingClientRect = () => new DOMRect()

afterEach(async () => {
  cleanup()
  localStorage.clear()
  await clearLocalData()
  delete document.documentElement.dataset.theme
  useAuth.setState({ status: 'loading', account: null })
})
