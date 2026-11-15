import { create } from 'zustand'

/**
 * The list open on the tasks screen, so the [+] sheet adds to it by default.
 * Undefined while no single list is open; null for the inbox.
 */
export const useActiveTaskList = create<{ listId: string | null | undefined }>(() => ({
  listId: undefined,
}))
