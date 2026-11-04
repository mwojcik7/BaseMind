import { Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { pl } from '@/i18n/pl'

/** Placeholder for the global search built in step 1.7. Ctrl+K opens it on desktop. */
export function SearchBar() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-2 rounded-md bg-muted px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Search aria-hidden className="size-4" />
        {pl.search.placeholder}
        <kbd className="ml-auto hidden rounded-sm border px-1.5 py-0.5 font-sans text-xs pointer-fine:inline">
          Ctrl K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{pl.search.title}</DialogTitle>
            <DialogDescription>{pl.search.description}</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  )
}
