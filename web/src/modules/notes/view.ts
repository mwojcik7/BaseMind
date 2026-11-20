import { create } from 'zustand'
import { NO_FILTER, NOTE_ORDERS, type NoteFilter, type NoteOrder } from '@/modules/notes/selectors'

const ORDER_KEY = 'notes_order'

/** The last order chosen on this device. */
function initialOrder(): NoteOrder {
  try {
    const saved = localStorage.getItem(ORDER_KEY)
    if (NOTE_ORDERS.includes(saved as NoteOrder)) return saved as NoteOrder
  } catch {
    // Storage blocked: fall back to the default.
  }
  return 'changed'
}

interface NotesViewState {
  order: NoteOrder
  /** Not remembered after a restart, so no note stays hidden by a forgotten filter. */
  filter: NoteFilter
  /** Notes picked with a long press. */
  selected: ReadonlySet<string>
}

/** Kept outside the page, so opening a note and coming back finds the list as it was. */
export const useNotesView = create<NotesViewState>(() => ({
  order: initialOrder(),
  filter: NO_FILTER,
  selected: new Set(),
}))

export function setNoteOrder(order: NoteOrder) {
  useNotesView.setState({ order })
  try {
    localStorage.setItem(ORDER_KEY, order)
  } catch {
    // Remembered for this session only.
  }
}

export function setNoteFilter(change: Partial<NoteFilter>) {
  useNotesView.setState((state) => ({ filter: { ...state.filter, ...change } }))
}

export function clearNoteFilter() {
  useNotesView.setState({ filter: NO_FILTER })
}

export function toggleSelected(id: string) {
  useNotesView.setState((state) => {
    const selected = new Set(state.selected)
    if (!selected.delete(id)) selected.add(id)
    return { selected }
  })
}

export function clearSelection() {
  useNotesView.setState({ selected: new Set() })
}
