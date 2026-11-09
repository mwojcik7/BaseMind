import { Check, Inbox, Plus, Trash2, Undo2, Wallet } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PageHeader } from '@/components/PageHeader'
import { AmountInput } from '@/components/ui/amount-input'
import { Badge } from '@/components/ui/badge'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-picker'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ListItem } from '@/components/ui/list-item'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/toaster'
import { useRecords } from '@/db/hooks'
import { tags } from '@/db/tags'
import { formatMoney } from '@/lib/money'

// Developer preview, so the sample copy stays here instead of in the translation files.

const COLORS = [
  ['Kolor główny', 'bg-primary'],
  ['Wpływy, zrobione', 'bg-success-strong'],
  ['Ostrzeżenia', 'bg-warning'],
  ['Wydatki, zaległe', 'bg-destructive'],
  ['Karta', 'bg-card border'],
  ['Wyciszony', 'bg-muted border'],
]

const SAMPLE_TASKS = [
  { id: 1, title: 'Opłacić ubezpieczenie auta', due: 'Dziś', urgent: true },
  { id: 2, title: 'Kupić prezent dla Ani', due: 'Jutro', urgent: false },
  { id: 3, title: 'Umówić przegląd', due: 'Piątek', urgent: false },
]

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

/** Real data: writes through the repository, so it shows synchronisation working end to end. */
function SyncPreview() {
  const [name, setName] = useState('')
  const records = useRecords(tags)

  async function add() {
    if (name.trim()) {
      await tags.create({ name: name.trim(), color: null })
      setName('')
    }
  }

  return (
    <Section title="Synchronizacja (prawdziwe dane)">
      <div className="flex gap-2">
        <Input
          aria-label="Nowy tag"
          placeholder="Nowy tag"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Button onClick={() => void add()}>Dodaj</Button>
      </div>
      <ul className="mt-3 flex flex-col gap-1">
        {records?.map((tag) => (
          <li key={tag.id} className="flex items-center justify-between text-sm">
            {tag.name}
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Usuń ${tag.name}`}
              onClick={() => void tags.softDelete(tag.id)}
            >
              <Trash2 aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </Section>
  )
}

export function DesignPage() {
  const [amount, setAmount] = useState<number | null>(4599)
  const [date, setDate] = useState<string | null>(null)
  const [tasks, setTasks] = useState(SAMPLE_TASKS)

  function removeTask(id: number, message: string) {
    setTasks((current) => current.filter((task) => task.id !== id))
    toast(message, {
      action: { label: 'Cofnij', onClick: () => setTasks(SAMPLE_TASKS) },
    })
  }

  return (
    <>
      <PageHeader title="Design system" description="Podgląd wszystkich elementów aplikacji" />

      <SyncPreview />

      <Section title="Kolory">
        <div className="grid grid-cols-3 gap-3">
          {COLORS.map(([name, className]) => (
            <div key={name} className="text-xs text-muted-foreground">
              <div className={`mb-1 h-12 rounded-md ${className}`} />
              {name}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typografia">
        <p className="text-2xl font-semibold tracking-tight">Tytuł ekranu</p>
        <p className="mt-2 text-lg font-semibold tracking-tight">Nagłówek sekcji</p>
        <p className="mt-2">Zwykły tekst z polskimi znakami: zażółć gęślą jaźń.</p>
        <p className="mt-2 text-sm text-muted-foreground">Tekst pomocniczy i opisy.</p>
        <div className="mt-3 flex flex-col gap-1 text-right font-medium tabular-nums">
          <span className="text-danger">{formatMoney(-4599)}</span>
          <span className="text-danger">{formatMoney(-121100)}</span>
          <span className="text-success">{formatMoney(650000)}</span>
        </div>
      </Section>

      <Section title="Przyciski">
        <div className="flex flex-wrap gap-2">
          <Button>Zapisz</Button>
          <Button variant="secondary">Anuluj</Button>
          <Button variant="outline">Edytuj</Button>
          <Button variant="ghost">Pomiń</Button>
          <Button variant="destructive">Usuń</Button>
          <Button disabled>Niedostępny</Button>
          <Button variant="secondary" size="icon" aria-label="Dodaj">
            <Plus aria-hidden />
          </Button>
        </div>
      </Section>

      <Section title="Formularz">
        <div className="flex flex-col gap-4">
          <Field id="design-title" label="Nazwa">
            <Input id="design-title" placeholder="Np. paliwo" />
          </Field>
          <Field id="design-invalid" label="Pole z błędem">
            <Input id="design-invalid" aria-invalid defaultValue="Zła wartość" />
            <p className="text-sm text-danger">Popraw tę wartość.</p>
          </Field>
          <Field id="design-amount" label="Kwota (użyj przecinka lub kropki)">
            <AmountInput id="design-amount" value={amount} onValueChange={setAmount} />
            <p className="text-sm text-muted-foreground tabular-nums">
              Zapis w bazie: {amount === null ? 'brak' : `${amount} groszy`}
            </p>
          </Field>
          <Field id="design-date" label="Data">
            <DatePicker id="design-date" value={date} onChange={setDate} />
          </Field>
          <Field id="design-select" label="Portfel">
            <Select defaultValue="cash">
              <SelectTrigger id="design-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Gotówka</SelectItem>
                <SelectItem value="bank">Konto bankowe</SelectItem>
                <SelectItem value="card">Karta kredytowa</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <div className="flex items-center gap-3">
            <Checkbox id="design-checkbox" defaultChecked />
            <Label htmlFor="design-checkbox">Powtarzaj co miesiąc</Label>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="design-switch">Przypomnij dzień wcześniej</Label>
            <Switch id="design-switch" defaultChecked />
          </div>
        </div>
      </Section>

      <Section title="Karty i etykiety">
        <Card>
          <CardHeader>
            <CardTitle>Budżet na listopad</CardTitle>
            <CardDescription>Pozostało 12 dni</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Badge>Nowe</Badge>
            <Badge variant="brand">Subskrypcja</Badge>
            <Badge variant="success">Zapłacone</Badge>
            <Badge variant="warning">Za 3 dni</Badge>
            <Badge variant="danger">Zaległe</Badge>
            <Badge variant="secondary">Dom</Badge>
            <Badge variant="outline">Praca</Badge>
          </CardContent>
        </Card>
      </Section>

      <Section title="Zakładki">
        <Tabs defaultValue="today">
          <TabsList className="w-full">
            <TabsTrigger value="today">Dziś</TabsTrigger>
            <TabsTrigger value="next">Nadchodzące</TabsTrigger>
            <TabsTrigger value="done">Ukończone</TabsTrigger>
          </TabsList>
          <TabsContent value="today" className="pt-2 text-sm text-muted-foreground">
            Zadania na dziś.
          </TabsContent>
          <TabsContent value="next" className="pt-2 text-sm text-muted-foreground">
            Zadania na kolejne dni.
          </TabsContent>
          <TabsContent value="done" className="pt-2 text-sm text-muted-foreground">
            Zadania ukończone.
          </TabsContent>
        </Tabs>
      </Section>

      <Section title="Lista (przesuń wiersz w lewo lub w prawo)">
        {tasks.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {tasks.map((task) => (
              <ListItem
                key={task.id}
                title={task.title}
                description={task.due}
                trailing={task.urgent ? <Badge variant="danger">Pilne</Badge> : undefined}
                onPress={() => toast(`Otwarto: ${task.title}`)}
                startAction={{
                  label: 'Zrobione',
                  icon: Check,
                  color: 'success',
                  onAction: () => removeTask(task.id, 'Oznaczono jako zrobione'),
                }}
                endAction={{
                  label: 'Usuń',
                  icon: Trash2,
                  color: 'danger',
                  onAction: () => removeTask(task.id, 'Usunięto zadanie'),
                }}
              />
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={Inbox}
            title="Lista jest pusta"
            description="Tak wygląda ekran, na którym nie ma jeszcze danych."
            action={
              <Button variant="secondary" onClick={() => setTasks(SAMPLE_TASKS)}>
                <Undo2 aria-hidden />
                Przywróć przykłady
              </Button>
            }
          />
        )}
      </Section>

      <Section title="Panele i powiadomienia">
        <div className="flex flex-wrap gap-2">
          <BottomSheet
            title="Arkusz od dołu"
            description="Na telefonie zastępuje okna. Zamknij go, ściągając uchwyt w dół."
            trigger={<Button variant="secondary">Arkusz</Button>}
          >
            <div className="flex flex-col gap-4">
              <Field id="design-sheet-amount" label="Kwota">
                <Input id="design-sheet-amount" inputMode="decimal" placeholder="0,00" />
              </Field>
              <Button>
                <Wallet aria-hidden />
                Dodaj wydatek
              </Button>
            </div>
          </BottomSheet>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Okno</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Usunąć notatkę?</DialogTitle>
                <DialogDescription>Tego działania nie można cofnąć.</DialogDescription>
              </DialogHeader>
              <DialogFooter showCloseButton>
                <Button variant="destructive">Usuń</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="secondary" onClick={() => toast('Zapisano zmiany')}>
            Powiadomienie
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Zsynchronizowano')}>
            Sukces
          </Button>
          <Button variant="secondary" onClick={() => toast.error('Nie udało się zapisać')}>
            Błąd
          </Button>
        </div>
      </Section>
    </>
  )
}
