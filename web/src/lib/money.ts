// Amounts are integers in minor units (grosze), never floats (projekt.md, section 4.1).

/** Parses typed text ("12", "12,5", "1 234.56") into minor units, or returns null if invalid. */
export function parseAmount(text: string): number | null {
  const match = /^(\d+)(?:[.,](\d{0,2}))?$/.exec(text.replace(/\s/g, ''))
  if (!match) {
    return null
  }

  // Built from the digits, because e.g. 19.99 * 100 is 1998.9999999999998 in floats.
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
  return Number.isSafeInteger(minor) ? minor : null
}

/** Text for an amount field: 123456 -> "1234,56". */
export function formatAmount(minor: number): string {
  const fraction = String(minor % 100).padStart(2, '0')
  return `${Math.trunc(minor / 100)},${fraction}`
}

/** Text for display: 123456 -> "1234,56 zł". Assumes a currency with 2 decimal places. */
export function formatMoney(minor: number, currency = 'PLN'): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(minor / 100)
}
