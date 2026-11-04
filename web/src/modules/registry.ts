import {
  Bookmark,
  Calendar,
  CalendarClock,
  Car,
  CheckSquare,
  Clapperboard,
  Clock,
  CreditCard,
  Gift,
  KeyRound,
  MapPin,
  NotebookPen,
  Repeat,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { pl } from '@/i18n/pl'

export type ModuleId = keyof typeof pl.modules

export interface AppModule {
  id: ModuleId
  icon: LucideIcon
  /** Stage in plan.md that delivers this module. */
  stage: number
}

/** Every module, in the order of plan.md. Tasks and calendar have their own tabs. */
export const modules: readonly AppModule[] = [
  { id: 'tasks', icon: CheckSquare, stage: 2 },
  { id: 'calendar', icon: Calendar, stage: 2 },
  { id: 'notes', icon: NotebookPen, stage: 2 },
  { id: 'finance', icon: Wallet, stage: 3 },
  { id: 'subscriptions', icon: CreditCard, stage: 3 },
  { id: 'bookmarks', icon: Bookmark, stage: 4 },
  { id: 'media', icon: Clapperboard, stage: 4 },
  { id: 'codes', icon: KeyRound, stage: 4 },
  { id: 'work', icon: Clock, stage: 5 },
  { id: 'habits', icon: Repeat, stage: 5 },
  { id: 'contacts', icon: Users, stage: 5 },
  { id: 'gifts', icon: Gift, stage: 5 },
  { id: 'vehicles', icon: Car, stage: 6 },
  { id: 'warranties', icon: ShieldCheck, stage: 6 },
  { id: 'expiry', icon: CalendarClock, stage: 6 },
  { id: 'locator', icon: MapPin, stage: 6 },
  { id: 'fileShares', icon: Share2, stage: 6 },
]

const TABBED: readonly ModuleId[] = ['tasks', 'calendar']

/** Modules listed on the "Więcej" screen. */
export const gridModules = modules.filter((module) => !TABBED.includes(module.id))

export function getModule(id: string): AppModule | undefined {
  return modules.find((module) => module.id === id)
}
