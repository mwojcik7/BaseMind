import { format } from 'date-fns'
import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  const interval = setInterval(onChange, 60_000)
  document.addEventListener('visibilitychange', onChange)

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', onChange)
  }
}

const todayKey = () => format(new Date(), 'yyyy-MM-dd')

/** Today as 'yyyy-MM-dd'. An installed app can stay open past midnight, so it keeps up. */
export function useToday() {
  return useSyncExternalStore(subscribe, todayKey)
}
