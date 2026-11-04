// Applies the saved theme before the first paint, so the wrong theme never flashes.
// A separate file because the CSP forbids inline scripts. See src/lib/theme.ts.
try {
  const theme = localStorage.getItem('basemind.theme')
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme
  }
} catch {
  // Storage can be blocked; CSS then follows the system.
}
