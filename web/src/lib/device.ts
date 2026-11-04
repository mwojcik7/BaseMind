const SYSTEMS: [RegExp, string][] = [
  [/Android/, 'Android'],
  [/iPhone/, 'iPhone'],
  [/iPad/, 'iPad'],
  [/Windows/, 'Windows'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
]

// Order matters: Edge and Samsung Internet also say "Chrome", and Chrome also says "Safari".
const BROWSERS: [RegExp, string][] = [
  [/SamsungBrowser/, 'Samsung Internet'],
  [/Edg\//, 'Edge'],
  [/Firefox|FxiOS/, 'Firefox'],
  [/Chrome|CriOS/, 'Chrome'],
  [/Safari/, 'Safari'],
]

function firstMatch(userAgent: string, patterns: [RegExp, string][]) {
  return patterns.find(([pattern]) => pattern.test(userAgent))?.[1]
}

/** Short readable name, e.g. "Chrome, Android". Null when nothing can be recognized. */
export function describeDevice(userAgent: string | null): string | null {
  if (!userAgent) {
    return null
  }

  const parts = [firstMatch(userAgent, BROWSERS), firstMatch(userAgent, SYSTEMS)].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}
