import { useNavigate } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { History } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { pl } from '@/i18n/pl'
import { search } from '@/search/client'
import type { SearchHit } from '@/search/engine'
import { searchGroups } from '@/search/presentation'
import { clearRecentSearches, getRecentSearches, rememberSearch } from '@/search/recent'
import { searchSources } from '@/search/sources'

const ROW_CLASS = 'flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left text-sm'

function ResultContent({ hit }: { hit: SearchHit }) {
  const Icon = searchGroups[hit.entity]?.icon

  return (
    <>
      {Icon && <Icon aria-hidden className="size-4 shrink-0 text-muted-foreground" />}
      <span className="min-w-0">
        <span className="block truncate">{hit.title}</span>
        {hit.subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{hit.subtitle}</span>
        )}
      </span>
    </>
  )
}

function Results({ hits, onSelect }: { hits: SearchHit[]; onSelect: (href: string) => void }) {
  return searchSources.map(({ entity }) => {
    const group = hits.filter((hit) => hit.entity === entity)
    if (group.length === 0) {
      return null
    }

    return (
      <section key={entity} className="mb-4">
        <h3 className="mb-1 px-2 text-xs font-semibold text-muted-foreground">
          {searchGroups[entity]?.label}
        </h3>
        <ul>
          {group.map((hit) => (
            <li key={hit.id}>
              {hit.href ? (
                <button
                  type="button"
                  className={`${ROW_CLASS} hover:bg-muted`}
                  onClick={() => onSelect(hit.href as string)}
                >
                  <ResultContent hit={hit} />
                </button>
              ) : (
                <div className={ROW_CLASS}>
                  <ResultContent hit={hit} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    )
  })
}

function RecentSearches({ onPick }: { onPick: (query: string) => void }) {
  const recent = useLiveQuery(getRecentSearches)

  if (!recent || recent.length === 0) {
    return <p className="px-2 text-sm text-muted-foreground">{pl.search.hint}</p>
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between px-2">
        <h3 className="text-xs font-semibold text-muted-foreground">{pl.search.recent}</h3>
        <Button variant="ghost" onClick={() => void clearRecentSearches()}>
          {pl.search.clearRecent}
        </Button>
      </div>
      <ul>
        {recent.map((query) => (
          <li key={query}>
            <button
              type="button"
              className={`${ROW_CLASS} hover:bg-muted`}
              onClick={() => onPick(query)}
            >
              <History aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{query}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Mounted only while the dialog is open, so every search starts empty. */
function SearchPanel({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ query: string; hits: SearchHit[] } | null>(null)
  const worthRemembering = useRef<string | null>(null)
  const trimmed = query.trim()

  useEffect(() => {
    if (!trimmed) {
      worthRemembering.current = null
      return
    }

    let latest = true
    void search(trimmed).then((hits) => {
      // A slower answer to an earlier query must not replace the current one.
      if (latest) {
        setResults({ query: trimmed, hits })
        worthRemembering.current = hits.length > 0 ? trimmed : null
      }
    })

    return () => {
      latest = false
    }
  }, [trimmed])

  // Remembered on closing, so half-typed queries don't fill the list.
  useEffect(
    () => () => {
      if (worthRemembering.current) {
        void rememberSearch(worthRemembering.current)
      }
    },
    [],
  )

  function select(href: string) {
    onClose()
    void navigate({ to: href })
  }

  return (
    <>
      <div className="pr-10">
        <Input
          autoFocus
          type="search"
          aria-label={pl.search.placeholder}
          placeholder={pl.search.placeholder}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="min-h-0 overflow-y-auto">
        {!trimmed && <RecentSearches onPick={setQuery} />}
        {trimmed && results && <Results hits={results.hits} onSelect={select} />}
        {results?.query === trimmed && results.hits.length === 0 && (
          <p className="px-2 text-sm text-muted-foreground">{pl.search.noResults(trimmed)}</p>
        )}
      </div>
    </>
  )
}

/** Full screen on a phone, a floating panel on larger screens. */
export function SearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="inset-0 h-dvh max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)] rounded-none border-0 p-4 pt-[calc(env(safe-area-inset-top)+1rem)] sm:inset-auto sm:top-[12%] sm:left-1/2 sm:h-[70dvh] sm:max-w-lg sm:-translate-x-1/2 sm:rounded-lg sm:border">
        <DialogTitle className="sr-only">{pl.search.title}</DialogTitle>
        <DialogDescription className="sr-only">{pl.search.description}</DialogDescription>
        <SearchPanel onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
