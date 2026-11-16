# BaseMind — plan prac

> **Jak korzystać z tego pliku (także po wyczyszczeniu kontekstu):**
> 1. Przeczytaj `projekt.md` (wizja, ustalenia, architektura, model danych, bezpieczeństwo, zasady współpracy).
> 2. Zacznij od sekcji **„Pytania na start”**, a potem sprawdź **„Stan bieżący”** — na czym skończyliśmy i co jest następne.
> 3. Przejrzyj **„Dziennik zmian”** na końcu pliku.
> 4. **Nic nie rób bez akceptacji użytkownika** — zaproponuj kolejny krok i zapytaj.
> 5. Po każdej sesji: odhacz zrobione punkty (`[x]`), zaktualizuj „Stan bieżący” i dopisz wpis do „Dziennika zmian”.
>
> Legenda: `[ ]` do zrobienia · `[~]` w trakcie · `[x]` zrobione · `[-]` porzucone (z uzasadnieniem) · 🔒 wymaga decyzji użytkownika

---

## ❓ Pytania na start (zadać użytkownikowi na samym początku następnej sesji)

> Po rozstrzygnięciu: usunąć pytanie stąd, a decyzję wpisać do rejestru w `projekt.md`, pkt 13.

> 2026-11-14 (druga sesja) rozstrzygnięte: kolejność dalej (część 2 zadań, potem kosz, sortowanie przeciąganiem odłożone), stan telefonu, `+liczba` = wpływ, PHPUnit zamiast Pest, Larastan i Playwright dodane. Decyzje w `projekt.md`, pkt 13.

> Wszystkie decyzje techniczne Claude „do oceny użytkownika” potwierdzone 2026-11-14 (także `react-day-picker`, choć jako jedyny nie jest konieczny: można go zastąpić systemowym wyborem daty).

> 2026-11-15 rozstrzygnięte: test cykliczności na telefonie zaliczony, dwie decyzje Claude potwierdzone, zakres kanałów dla typu ustalony i zrobiony.

> 2026-11-15 (druga sesja) rozstrzygnięte: zakres kalendarza (2.2) — opis w kroku 2.2, decyzje w `projekt.md`, pkt 13.

> 2026-11-15/16 (sesja kalendarza) rozstrzygnięte: kolejność pracy w części 1 kalendarza (kroki 1–7 niżej), zasada 7:00, model `events`, ekran wydarzenia, kilka przypomnień, opcje dla całodniowych, nowa paleta. Decyzje w `projekt.md`, pkt 13.

> 2026-11-16 rozstrzygnięte: test kroków 1–4 kalendarza na telefonie zaliczony, „miesiąc wcześniej” = 30 dni, dwie decyzje Claude potwierdzone, przypomnienie „Własne…” zrobione i sprawdzone na telefonie. Decyzje w `projekt.md`, pkt 13.

**Na start następnej sesji**
1. Następny krok: **krok 6 części 1 kalendarza** — widżet „Wydarzenia” na „Dziś” (dziś i jutro, identyfikator `events` zostaje), sekcja „Wydarzenia dziś” w porannym podsumowaniu, zakładka „Wydarzenie” w arkuszu [+] z parserem. Przed kodem pokazać propozycję.
2. Przy okazji przypomnieć o sprawach z „Otwartych spraw” (np. test porannego podsumowania na żywo).

---

## Stan bieżący (ostatnia sesja i praca nad kodem: 2026-11-16)

- **Faza:** Etap 0 zamknięty. **Etap 1 w toku: kroki 1.1 (konta, logowanie, przestrzenie), 1.2 (szyfrowanie), 1.3 (warstwa danych offline), 1.4 (synchronizacja), 1.5 (PWA), 1.6 (tagi i powiązania: dane i synchronizacja), 1.7 (wyszukiwanie), 1.8 (przypomnienia i powiadomienia), 1.9 (dashboard „Dziś”), 1.10 (szybkie dodawanie [+]) i poprawki 1.11 zrobione. Etap 2 w toku: część 1 zadań (2.1) zrobiona; część 2 zrobiona (podzadania, notatka w Markdown, cykliczność, reszta parsera, kanały powiadomień dla typu; wszystko potwierdzone na telefonie); tagi i powiązania zadań przeniesione do 2.3; sortowanie przeciąganiem odłożone. Kosz (1.12) zrobiony 2026-11-15. Kalendarz (2.2) w toku: zakres ustalony; w części 1 zrobione kroki 1–5 z 7 (5: widoki Agenda i Miesiąc z warstwami, 2026-11-16) (1: przypomnienia o 7:00 i otwieranie zadania z powiadomienia; 2: encja `events`; 3: wystąpienia serii i przypomnienia o wydarzeniach; 4: ekran wydarzenia z kilkoma przypomnieniami i tymczasową listą; 2026-11-16 potwierdzone na telefonie, dodane przypomnienie „Własne…” z własną godziną). Następny: krok 6 (widżet, poranne podsumowanie, arkusz [+] z parserem), 7 (testy e2e i test na telefonie).** 2026-11-14 dodane narzędzia jakości: Larastan (API) i testy e2e w Playwright (web). 2026-11-14 do Etapu 5 dopisany nowy moduł **5.2 „Trener: godziny i wynagrodzenie”** (robiony zaraz po grafiku pracy 5.1; szczegóły ustalone z użytkownikiem są w opisie kroku, model danych w `projekt.md`, pkt 4.4, decyzje w pkt 13, otwarte pytanie o zwrot paliwa w pkt 12.11).
- **Repozytorium:** lokalnie `C:\Users\Praca\Documents\Kodowanie\BaseMind`, gałąź `main`, zdalne `origin` = https://github.com/mwojcik7/BaseMind.git. Autor commitów: Marcin Wójcik <mgrnewsl@gmail.com>. Ostatnie commity kodu (kalendarz): reguła 7:00 i otwieranie zadania z powiadomienia (`2a30782`), encja `events` (`ad485eb`), wystąpienia i przypomnienia (`2f4759e`), ekran wydarzenia (`050d472`); potem commit z dokumentacją końca sesji. Sprawdzić `git status` i `git log origin/main..`, czy wszystko jest wypchnięte. `git status` pokaże, czy coś czeka na commit.
- **Backend (`api/`):** Laravel 13.40, Sanctum + Fortify (`/api/auth`), utwardzenie PHP/Apache, kontrola luk PHP, nagłówki z CSP, powłoka PWA serwowana przez Laravela, przestrzenie i uprawnienia, ekran sesji, szyfrowanie libsodium (serwis `Crypto`, casty, komendy klucza), synchronizacja (`SyncService`, `config/sync.php`, trait `Syncable`, makro `$table->syncable()`), tagi i powiązania, przypomnienia i powiadomienia (`ReminderDispatcher`, `WebPushService`, zadania `SendReminder` i `SendDigest`, komendy `basemind:send-reminders`, `basemind:send-digests`, `basemind:vapid`), układ dashboardu w `user_settings`, zadania i listy (`Task`, `TaskList`, sekcje podsumowania w `app/Digest/`), operacja `restore` w synchronizacji, interfejsy `SpaceScoped` i `SyncableModel` (`app/Models/Contracts/`), klasa tabeli pośredniej `SpaceMember`, podzadania (`tasks.parent_id`, reguła `ParentTask`, odpowiedź 409 przycisku „Zrobione” przy otwartych podzadaniach, poza zadaniami cyklicznymi), cykliczność zadań (kolumny `rrule`, `repeat_from`, `repeat_anchor`, `repeat_remaining`, `recurring_task_id`; reguła `TaskRecurrence`, serwis `TaskSeries`, `SyncService::recordServerCreate`); kanały powiadomień dla typu (`config/notifications.php`, `UserSettings::allowsChannel`); kosz (`Trash`, `basemind:empty-trash`, `config/trash.php`, tabela `sync_purges`, operacja `purge`), limity logowania w `config/basemind.php` (`throttle`, podnoszone tylko w e2e); reguła godziny przypomnień `App\Support\ReminderMoment` (7:00, wspólne przypadki `web/src/lib/reminder-moment.cases.json`); adres otwierany z powiadomienia `Reminder::appPath()` (`config/notifications.php`, sekcja `paths`), w powiadomieniu push także `entity_type`; kalendarz: model `Event` (`events`, migracja `2026_11_15_220000_create_events_table`, wykonana na `basemind`), reguła `EventSpan`, `TaskRecurrence(allowCount: true)` dla wydarzeń, serwis `EventSeries` (wystąpienia, następne przypomnienie; wspólne przypadki `web/src/modules/calendar/series.cases.json`), `ReminderDispatcher` przesuwa przypomnienie wydarzenia na następne wystąpienie, typ `events` w kanałach powiadomień (domyślnie tylko telefon); kolumna `reminders.remind_time` (migracja `2026_11_16_200000_add_remind_time_to_reminders_table`, wykonana na `basemind`) i parametr `$at` w `ReminderMoment::for` / `EventSeries::nextReminderAt`; odrzucone zmiany synchronizacji w logu (`Sync operation rejected`, `RejectedSyncOperation::$fields`). 379 testów OK (PHPUnit), Larastan poziom 5 bez uwag (`composer analyse`), Pint OK.
- **Frontend (`web/`):** React 19, Vite 8, TS 6, Tailwind v4, shadcn/ui, TanStack Router, PWA działająca offline, design system (podgląd: `/design`), wybór motywu, logowanie i rejestracja, sesje i urządzenia, lokalna baza Dexie z repozytorium encji (`web/src/db/`), silnik synchronizacji ze wskaźnikiem stanu (`web/src/sync/`), instalacja i aktualizacje PWA (`web/src/lib/pwa.ts`, `PwaBanner`), repozytoria tagów i powiązań (`web/src/db/tags.ts`), globalne wyszukiwanie (`web/src/search/`, `SearchDialog`), powiadomienia push i ich ustawienia (`web/src/lib/push.ts`, `NotificationsPage`), licznik na ikonie, dashboard z rejestrem widżetów (`web/src/modules/today/widgets.ts`, `web/src/lib/dashboard.ts`, `DashboardSettingsPage`), moduł zadań (`web/src/modules/tasks/`), arkusz [+] z rejestrem (`web/src/modules/quickAddRegistry.ts`) i parser (`web/src/lib/quick-parser.ts`), podzadania z pytaniem przy odhaczaniu (`modules/tasks/completion.ts`, `CompleteTaskPrompt` w `AppShell`), podgląd Markdown (`components/MarkdownPreview.tsx`, ładowany na żądanie), cykliczność (`modules/tasks/recurrence.ts` z paczką `rrule`, wspólne przypadki `recurrence.cases.json` czytane też przez PHPUnit, edytor `RepeatField.tsx`, `finishOccurrence`/`undoOccurrence` w `repo.ts`, `finishWithUndo` w `completion.ts`), parser w `modules/tasks/parse.ts` (`taskRules(lists)`); rejestr typów powiadomień (`modules/notificationTypes.ts`) z sekcją „Według typu” w `NotificationsPage`; kosz (`modules/trash/TrashPage.tsx`, rejestr `modules/trashRegistry.ts`, `purge`/`listDeleted` w repozytorium, obsługa `purged` i `reset` w silniku synchronizacji), pole „Lista” w arkuszu [+] (`ListSelect` w `TaskFields.tsx`, otwarta lista w `modules/tasks/activeList.ts`); wspólne pole notatki `components/MarkdownField.tsx` (teksty w `pl.markdown`), `RepeatField` z opcją `fromCompletion={false}`, `DatePicker` z `label` i `clearable`; reguła 7:00 w `lib/reminder-moment.ts`; kalendarz (`web/src/modules/calendar/`): `repo.ts` (typ `CalendarEvent`, `EVENT_COLORS`, `createEvent`/`updateEvent` z listą przypomnień, `skipOccurrence`/`unskipOccurrence`, `removableEvents`), `reminder.ts` (kilka przypomnień na wydarzenie, opcje dla całodniowych i z godziną), `series.ts` (wystąpienia, następne przypomnienie), `form.ts` (domyślny czas, przesuwanie końca, `COUNT` ↔ edytor), `colors.ts` + tokeny `--event-*` w `index.css`, `EventDetail.tsx` (trasy `/calendar/new` i `/calendar/events/$eventId?date=`), `CalendarPage.tsx` (**tymczasowa** lista 60 dni, do zastąpienia w kroku 5); wydarzenia w wyszukiwarce, koszu i typach powiadomień; przycisk „OK” zamiast „Zrobione” na powiadomieniu o wydarzeniu (`sw.ts`); przypomnienia „Własne…” (`components/CustomReminderForm.tsx`, etykiety `lib/reminder-label.ts`, `ReminderTiming`/`timingKey` w `lib/reminder-moment.ts`; w formularzach wydarzenia klucze typu `7200@09:00`); jednorazowe poprawki danych lokalnych (`SCHEMA_UPGRADES` w `db/db.ts`, `db/upgrades.ts`; wersja 7: stare kolory wydarzeń). 492 testy Vitest OK. Testy e2e Playwright (`web/e2e/`, `pnpm e2e`): 19 scenariuszy OK (w tym 3 kalendarza w `calendar.spec.ts`, jeden z przypomnieniem „Własne…”), na osobnym serwerze (port 8091) i bazie `basemind_e2e`.
- **Dane lokalne:** w bazie `basemind` jest **prawdziwe konto użytkownika**, założone przez niego na telefonie. Nie usuwać go i nie czyścić tej bazy. Są tam też dane z testów: tagi, „Testowe przypomnienia”, zadania, subskrypcja push telefonu i (od 2026-11-15) co najmniej 2 wydarzenia dodane przez użytkownika (kolory: domyślny i `yellow`).
- **Telefon:** BaseMind jest zainstalowany jako aplikacja, powiadomienia są włączone.
- **Klucz szyfrowania:** lokalny `SODIUM_KEY` (identyfikator `2ca17bb1`) jest w `api/.env`, a użytkownik ma jego kopię w menedżerze haseł. Są nim już zaszyfrowane tytuły przypomnień, tytuły i notatki zadań oraz tytuły, miejsca i notatki wydarzeń, więc utrata klucza oznacza ich utratę. Produkcja dostanie własny klucz.
- **Klucze VAPID** są w `api/.env` (tylko lokalne). Nowe klucze odłączają wszystkie urządzenia od powiadomień; `basemind:vapid` nie nadpisuje istniejących.
- **Czeka na użytkownika:** nic (2026-11-16: wariant B przypomnień i widoki Agenda/Miesiąc zaakceptowane).
- **Uwaga:** ta sama instalacja MariaDB trzyma bazy innego projektu użytkownika (np. `syslead_test`). Nie używać `migrate:fresh` na bazie `basemind` ani poleceń obejmujących cały serwer; testy PHPUnit działają na `basemind_test`, testy e2e na `basemind_e2e` (czyszczona przy każdym uruchomieniu, ze sprawdzeniem nazwy bazy).
- **Uwaga:** MariaDB/Apache uruchamia użytkownik (panel XAMPP). Claude uruchamia je tylko na czas pracy (testy, migracje) i zatrzymuje. Przed uruchomieniem sprawdzić, czy już nie działają. Harmonogram jest zatrzymany; MariaDB i Apache uruchomione przez Claude 2026-11-16 (sprawdzić przy wznowieniu, czy nadal działają). Polecenia (każde jako proces w tle): `C:\xampp\mysql\bin\mysqld.exe --defaults-file=C:\xampp\mysql\bin\my.ini --standalone`, `C:\xampp\apache\bin\httpd.exe`, harmonogram z katalogu `api/` z ustawionym `OPENSSL_CONF` (`projekt.md`, pkt 14, 7c). Zatrzymanie MariaDB: `mysqladmin --protocol=tcp -h 127.0.0.1 -u root shutdown`, Apache: zakończyć procesy `httpd`.

### ▶ Wznowienie pracy — od czego zacząć następną sesję
1. Przeczytać `projekt.md` (szczególnie pkt 0, 3, 8, 13 „Rejestr decyzji”, 14 „Konfiguracja poza repozytorium”, 15 „Pułapki”) i ten plik.
2. Sprawdzić stan: `git status`, `git log --oneline -5`, `composer audit` w `api/` (nowe poprawki bezpieczeństwa pojawiają się często; Symfony miało je już 2026-11-04) i `pnpm audit --prod` w `web/`.
3. Uruchomić Apache i MariaDB (panel XAMPP lub poleceniami; Apache startuje do ok. 30 s; ma zostać `ThreadsPerChild 1`, `projekt.md`, pkt 14, 4a). Sprawdzić `http://localhost:8080/api/health`, testy `cd api && php artisan test` i `composer analyse` (Larastan) oraz `cd web && pnpm test` i `pnpm e2e` (Playwright: buduje aplikację i uruchamia własny serwer na porcie 8091; Apache niepotrzebny, MariaDB tak). Do testów powiadomień na żywo uruchomić też harmonogram z ustawionym `OPENSSL_CONF` (`projekt.md`, pkt 14).
4. Powiedzieć użytkownikowi, na czym skończyliśmy, i **zadać „Pytania na start”** (na górze pliku). Przy okazji przypomnieć o sprawach z listy „Otwarte sprawy” poniżej.
5. **Kalendarz (2.2):** zakres ustalony, kroki 1–4 części 1 zrobione (checklisty w 2.2). Kolejność pozostałych kroków: **5** widoki Agenda (domyślny na telefonie) i Miesiąc z warstwami (wydarzenia, zadania z terminem — zaległe także dziś w sekcji „Zaległe”, zrobione ukryte z przełącznikiem w ustawieniach kalendarza — oraz polskie święta), wybór warstw w `user_settings`; **6** widżet „Wydarzenia” na „Dziś” (zastąpić zaślepkę, identyfikator `events` zostaje), sekcja „Wydarzenia dziś” w porannym podsumowaniu (`config/digest.php`, serwer może użyć `EventSeries::occurrenceStarts`), zakładka „Wydarzenie” w arkuszu [+] z parserem; **7** testy e2e i test na telefonie. Do testów powiadomień na żywo uruchomić harmonogram (bez niego przypomnienia nie wychodzą). Na stronie `/design` są prawdziwe tagi i przycisk „Przypomnij za minutę” do testów na żywo.
6. **Test na telefonie przez USB** (instrukcja w `README.md`): do sprawdzania PWA używać builda, czyli port `8080 → localhost:8080` i na telefonie `http://localhost:8080`. Telefon użytkownika: Samsung S25 Ultra, debugowanie USB już włączone. Jeśli logowanie zgłasza brak połączenia, najpierw sprawdzić `http://localhost:8080/api/health` na telefonie (`projekt.md`, pkt 15). Do testu offline odłączyć kabel: tryb samolotowy nie przerywa przekierowania portu przez USB.
7. Po sesji: zaktualizować ten plik („Stan bieżący”, checklisty, „Dziennik zmian”) i rejestr decyzji w `projekt.md`, a po zgodzie zrobić commit i `git push`.

### Otwarte sprawy (nic z tego nie blokuje kalendarza)
**Do wiadomości lub decyzji użytkownika**
- Kod rejestracji jest w `api/.env`. Przed wdrożeniem ustawić długi kod na produkcji, a po założeniu kont zostawić go pustym.

**Dług techniczny**
- Playwright: zostały scenariusze do dopisania: błędny i poprawny kod zaproszenia; reset hasła z linku w mailu (serwer e2e ma `MAIL_MAILER=log`, więc mail trafia do wspólnego `api/storage/logs/laravel.log`; rozważyć osobny plik logu dla e2e); motyw przed pierwszym renderem; ściąganie arkusza i przesuwanie wiersza. Kolejne dokładać przy modułach.
- Niestabilny test e2e `trash.spec.ts` › „a list can be removed for good and the trash emptied”: raz nie przeszedł 2026-11-15, potem 4 razy z rzędu OK; obserwować.
- Larastan na poziomie 5: podnieść poziom, gdy będzie okazja (np. przy Etapie 7).
- Reguły `.htaccess` w trybie awaryjnym (docroot = cały `api/`) po dodaniu PWA nie zostały sprawdzone (punkt w 0.3).
- `pnpm audit` zgłasza 3 luki tylko w narzędziach deweloperskich (`glob`, `minimatch`, `deepmerge`): 2 umiarkowane, 1 niską; w paczkach produkcyjnych brak. Sprawdzać przy aktualizacjach.
- Paczka startowa ma ok. 180 kB (gzip): sprawdzić przy audycie wydajności w Etapie 7.
- Tabela `sync_ops` rośnie i nic jej nie czyści: dodać do harmonogramu usuwanie wpisów starszych niż np. 90 dni.
- Zmiany odrzucone przez serwer zostają w `outbox` i są tylko liczone we wskaźniku: brak ekranu do ich przeglądania i usuwania. Od 2026-11-16 serwer zapisuje odrzucenia w logu; podgląd na telefonie: `chrome://inspect` → konsola, odczyt magazynu `outbox` z IndexedDB `basemind` (przypadek z 2026-11-16: kolor `pink` po zmianie palety).
- Testy PHPUnit piszą do wspólnego `api/storage/logs/laravel.log` (wpisy `testing.*`, np. odrzucenia synchronizacji): rozważyć osobny kanał logu dla testów.
- Synchronizacja przy dołączeniu do przestrzeni wspólnej: starsze rekordy mają `rev` poniżej kursora, więc nowy członek ich nie pobierze. Rozwiązać razem ze współdzieleniem (Etap 7).

**Czekają na swoje kroki**
- Background Sync: nadal niesprawdzony na żywo (przesyłanie rekordów między urządzeniami już tak).
- Poranne podsumowanie: sekcje zadań już są, ale nadal sprawdzone tylko testami. Sprawdzić na żywo (godzina w ustawieniach kilka minut do przodu, harmonogram uruchomiony, zadanie na dziś).
- Część 1 zadań: użytkownik potwierdził gesty, powiadomienia i przycisk „Zrobione”; w Chrome sprawdzono wyszukiwanie, listy, skrót Q, „Cofnij”. Na telefonie nie potwierdzono: pracy offline, panelu nad klawiaturą, dotknięcia samej treści powiadomienia (nie powinno odhaczać zadania; test obejmuje tylko serwer) i przycisku „Odłóż 1 h”.
- Przyczyna zniknięcia rejestracji push telefonu 2026-11-09 nie jest pewna. Hipoteza: fałszywy 401 (`projekt.md`, pkt 15) wylogował telefon, co wyrejestrowuje powiadomienia. Telefon zgłasza się teraz przy każdym uruchomieniu, a serwer zapisuje powód usunięcia w logu: sprawdzić, jeśli się powtórzy.
- Przy każdym module (lista kontrolna): sekcja w `config/digest.php` (jeśli dotyczy); typ w kanałach powiadomień (`api/config/notifications.php` + `web/src/modules/notificationTypes.ts`); wpis w koszu (`web/src/modules/trashRegistry.ts`, a na serwerze zależności w `App\Services\Trash::purge`, jeśli moduł ma rekordy podrzędne); wpis w arkuszu [+] (`quickAddRegistry.ts`); wyszukiwanie; widżet dashboardu.
- Przyciski na powiadomieniu bez internetu nie działają: odpowiedź przepada, przypomnienie zostaje bez odpowiedzi.
- Ekran z listą przypomnień nie istnieje: tworzy się je przy zadaniach (arkusz [+], edycja) i testowo z `/design`.
- Dotknięcie powiadomienia o zadaniu otwiera już samo zadanie (2026-11-15): sprawdzić na telefonie.
- Cykliczność: nowa seria z arkusza [+] ma przypomnienie w chwili terminu tylko, gdy wpisano „przypomnij”; termin „do dnia” (`UNTIL`) w parserze nie jest rozpoznawany (tylko w edytorze). Ręczna zmiana terminu w edytorze zmienia też wzorzec (`repeat_anchor`), a „na jutro” nie.
- Treść powiadomienia (wariant B, odłożony przez użytkownika 2026-11-15): dziś push ma sam tytuł (stały dopisek „Przypomnienie z BaseMind” usunięty). Później: w treści coś przydatnego, np. termin i lista („Dziś 18:00 · Sport”), dla „X dni przed” „Termin: pt 18:00” (serwer musi odczytać encję i sformatować datę w strefie użytkownika; każdy moduł podaje własny opis).
- Poranne podsumowanie pokazuje podzadania samym tytułem, bez nazwy rodzica (w aplikacji jest „podzadanie · rodzic”). Do rozważenia.
- Pola wyboru w podglądzie Markdown (`- [ ]`) są tylko do odczytu; odhaczanie ich w podglądzie — ewentualnie przy notatkach (2.3).
- Podzadania nie dziedziczą listy po zmianie listy rodzica (`list_id` kopiowane przy tworzeniu); nie ma to dziś znaczenia, bo podzadania nie są pokazywane na listach, ale trzeba pamiętać przy funkcjach zależnych od listy.
- Skrót „Nowe zadanie” w manifeście PWA prowadzi na `/tasks`, nie do arkusza [+] (punkt z 1.5). Pozostałe skróty czekają na swoje moduły.
- Prawdziwa wysyłka e-mail do sprawdzenia przy wdrożeniu (lokalnie trafia do logu).
- Kosz: tagi trafią do kosza razem z ekranem tagów (2.3); dziś tagi usuwa się tylko na `/design`. Codzienne czyszczenie (`basemind:empty-trash`, 3:30) sprawdzone tylko testami — działa tylko przy uruchomionym harmonogramie.
- Testy e2e: limity logowania i rejestracji na serwerze e2e są podniesione (`web/e2e/env.ts`); przy kolejnych scenariuszach nic nie trzeba zmieniać.
- Kalendarz — rzeczy celowo odłożone na kolejne kroki 2.2: ekran „Kalendarz” to **tymczasowa lista** 60 dni (`CalendarPage.tsx`, krok 5 ją zastępuje); wydarzeń nie ma jeszcze w arkuszu [+], porannym podsumowaniu ani w widżecie (krok 6); zmiana pojedynczego wystąpienia serii i widoki Dzień/Tydzień to część 2. Serwer sprawdza „koniec nie przed początkiem” tylko, gdy obie daty przychodzą w jednej zmianie (synchronizacja wysyła tylko zmienione pola) — pilnuje tego formularz. „Miesiąc wcześniej” = 30 dni (potwierdzone 2026-11-16).
- Wydarzenie ma kilka przypomnień, każde osobnym rekordem `reminders` bez własnej reguły (`rrule` puste). Po wysłaniu serwer wylicza następne wystąpienie z wydarzenia (`EventSeries::nextReminderFor`); przypomnienie z minioną chwilą zapisuje się jako `dismissed` (wybór zapamiętany). Przycisk na powiadomieniu o wydarzeniu: „OK” (tylko zamyka, seria idzie dalej).
- Widżety Wydarzenia i Ostatnie wydatki to puste zaślepki (`PlaceholderWidgets.tsx`): moduły podmienią je w 2.2 (krok 6) i 3.1. Identyfikatorów widżetów nie zmieniać, bo są zapisane w układzie użytkownika.
- Maile lokalnie trafiają do `api/storage/logs/laravel.log`: prawdziwa wysyłka SMTP do sprawdzenia przy wdrożeniu.
- Usunąć stronę `/design` przed wdrożeniem (Etap 7).
- Śledzić CVE-2026-115560 w PHP (`projekt.md`, pkt 8.1) i `max_allowed_packet` przy synchronizacji (0.2).

---

## Przegląd etapów

| Etap | Nazwa | Zakres | Status |
|---|---|---|---|
| 0 | Przygotowanie | Decyzje, środowisko, szkielet (Laravel + React PWA), design system | ✅ |
| 1 | Fundament | Auth, przestrzenie, szyfrowanie, PWA, offline + sync, nawigacja, wyszukiwanie, tagi/powiązania, przypomnienia, dashboard (szkielet) | 🟡 w trakcie |
| 2 | Codzienność | Zadania, kalendarz, notatki Markdown z backlinkami, szybka notatka | 🟡 w trakcie (zadania gotowe; następny kalendarz) |
| 3 | Pieniądze | Finanse (portfele, kategorie, transakcje, raporty, wykresy, budżety), subskrypcje | ⬜ |
| 4 | Schowek | Zakładki z podglądem (rich links) + Share Target, listy mediów, baza kodów | ⬜ |
| 5 | Życie | Grafik pracy, trener (godziny i wynagrodzenie), nawyki, CRM bliskich, bank prezentów | ⬜ |
| 6 | Rzeczy | Paszport pojazdu, gwarancje, daty ważności, lokalizator, publiczne linki do plików | ⬜ |
| 7 | Dopracowanie i wdrożenie | 2FA, PIN, eksport/backup, audyty, wybór hostingu i wdrożenie | ⬜ |

**Zasada każdego etapu:** każdy moduł od razu jest: offline + zsynchronizowany, przeszukiwalny, linkowalny (backlinki/tagi), z datami w kalendarzu i przypomnieniach (jeśli dotyczy), z widżetem dashboardu (jeśli ma sens), z oznaczonymi i zaszyfrowanymi polami 🔐, zaprojektowany najpierw na telefon.

**Definicja „gotowe” (DoD) dla każdej funkcji:**
- działa offline i po synchronizacji w drugiej przeglądarce/urządzeniu,
- wygląda i działa dobrze na 360–412 px (Android) i poprawnie na desktopie,
- tryb jasny i ciemny,
- walidacja danych po obu stronach (zod + Laravel Validation),
- autoryzacja po stronie API (Policy przestrzeni) + test dostępu,
- wrażliwe pola zaszyfrowane (sprawdzone w bazie, że są szyfrogramem),
- testy logiki (Pest / Vitest): kwoty, rrule, nadgodziny, sync, szyfrowanie,
- użytkownik przetestował na telefonie i zaakceptował.

---

## Etap 0 — Przygotowanie

### 0.1 Zatwierdzenie decyzji
- [x] Stack: PHP + Laravel + MySQL/MariaDB (backend), React + Vite + TS PWA (frontend), TanStack Router.
- [x] Hosting współdzielony PHP (bez VPS); lokalnie XAMPP.
- [x] Szyfrowanie: libsodium po stronie serwera dla pól wrażliwych.
- [x] Testy na telefonie: kabel USB + Chrome port forwarding.
- [x] Design: propozycja Claude, ocena po zobaczeniu.
- [x] 2FA na końcu (Etap 7).
- [x] Nazwa: BaseMind.

### 0.2 Środowisko
- [x] Node.js 24.21.0, Git 2.56 — były zainstalowane.
- [x] XAMPP: PHP 8.5.12 (z poprawką PHP2Shell), MariaDB 10.11.16, wymagane rozszerzenia obecne.
- [x] PHP (`C:\xampp\php`) dodane do PATH użytkownika.
- [x] Composer 2.11.1 (`%LOCALAPPDATA%\Programs\composer`, w PATH).
- [x] pnpm 12.16.1 (globalnie przez npm).
- [-] **Mailpit** — decyzja użytkownika: na razie **`MAIL_MAILER=log`** (maile lądują w `api/storage/logs/laravel.log`). Mailpit ewentualnie później.
- [x] Utwardzenie `C:\xampp\php\php.ini` (kopia: `php.ini.bak-basemind-20261103`): `expose_php=Off`, `fatal_error_backtraces = Off`; `session.upload_progress.enabled = Off` było już ustawione przez XAMPP. Zweryfikowane przez `ini_get`.
- [x] Bazy `basemind` i `basemind_test` (utf8mb4_unicode_ci). Lokalnie użytkownik **root bez hasła** (decyzja użytkownika — root dostępny tylko z localhost). Na produkcji zawsze dedykowany użytkownik z hasłem (zapewnia hosting).
- [x] Lokalny adres backendu: **VirtualHost Apache na `localhost:8080` → `BaseMind/api/public`** (konfiguracja przy 0.3, gdy powstanie folder `api/`).
- [x] `bind-address="127.0.0.1"` w `C:\xampp\mysql\bin\my.ini` (kopia: `my.ini.bak-basemind-20261103`) — MariaDB nasłuchuje tylko lokalnie. Laravel łączy się przez `127.0.0.1` (root@::1 już nieosiągalny — to OK).
- [ ] Na później (Etap 1.4, sync): `max_allowed_packet=1M` w `my.ini` jest mały — przy partiach synchronizacji może trzeba podnieść (np. 16M). Na hostingu sprawdzić wartość.
- [x] Telefon (Samsung S25 Ultra): debugowanie USB włączone, `chrome://inspect` → Port forwarding `8080`, test użytkownika OK.

### 0.3 Szkielet projektu
- [x] `git init` (gałąź `main`), `.gitignore`, `.gitattributes` (LF). Autor commitów (lokalnie w repo): **Marcin Wójcik <mgrnewsl@gmail.com>**.
- [x] `api/` — Laravel **13.40.0** (`composer create-project`). `.env` i `.env.example`: `APP_NAME=BaseMind`, `APP_URL=http://localhost:8080`, `APP_LOCALE=pl`, `APP_FAKER_LOCALE=pl_PL`, `DB_CONNECTION=mysql` (baza `basemind`, root bez hasła), `SESSION_ENCRYPT=true`, `HASH_DRIVER=argon2id` (wspierany przez PHP z XAMPP), `MAIL_MAILER=log`, `SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:8080`, `BASEMIND_OWNER_EMAIL=mgrnewsl@gmail.com`, checklista produkcyjna w `.env.example`. Usunięty plik SQLite. Migracje wykonane na MariaDB.
- [x] Pakiety: **Sanctum 4.3 zainstalowany** (`php artisan install:api` nie potrafił wywołać Composera na Windows — zainstalowany ręcznie `composer require laravel/sanctum` + `vendor:publish`), `statefulApi()` włączone. Pint jest w szkielecie. Fortify (1.1), `minishlink/web-push` (1.8) i Larastan (2026-11-14) dodane; Pest porzucony (decyzja użytkownika: zostajemy przy PHPUnit).
- [x] `api/public/.htaccess` (utwardzony: blokada plików ukrytych i każdego PHP poza `index.php`, `php_flag` dla mod_php, nagłówki), `api/public/.user.ini` (dla CGI/FPM), `api/.htaccess` (awaryjny, gdy hosting nie pozwala ustawić document root na `public/`). `public/index.php`: `ini_set('fatal_error_backtraces','0')` na PHP 8.5+.
- [x] Bezpieczeństwo runtime: `config/basemind.php` (minimalne bezpieczne wersje PHP per gałąź), `App\Support\PhpSecurity` (wersja + ustawienia ini), middleware `EnsureSecureRuntime` (na produkcji 503 przy krytycznym problemie, poza `/api/health`), `App\Support\SecurityAlert` (log + e-mail do właściciela max 1×/dzień), komenda `php artisan basemind:security-check [--notify]`, harmonogram codziennie 06:00 (`routes/console.php`).
- [x] Middleware `SecurityHeaders` (nosniff, X-Frame-Options DENY, Referrer-Policy, COOP, Permissions-Policy, HSTS przy HTTPS, CSP dla JSON i dla HTML: `script-src 'self'`, style inline dozwolone ze względu na Radix UI).
- [x] `GET /api/health` (throttle 30/min): publicznie tylko `{"status":"ok"}`, w `APP_ENV=local` dodatkowo wersja PHP, baza, raport bezpieczeństwa. Usunięty domyślny `/up` Laravela (jeden health-check).
- [x] CORS wyłączony (`config/cors.php`: `allowed_origins => []`) — PWA i API na tej samej domenie (dev: proxy Vite).
- [x] Testy (PHPUnit, baza `basemind_test` na MariaDB — **MariaDB musi być uruchomiona**): `tests/Unit/PhpSecurityTest.php`, `tests/Feature/HealthAndSecurityTest.php` — 21 testów OK; Pint OK.
- [x] Usunięte `api/CLAUDE.md` i `api/AGENTS.md` (instrukcje Laravel Boost z instalatora) — decyzja użytkownika; wytyczne trzymamy w `projekt.md` i `plan.md`.
- [x] VirtualHost Apache **`127.0.0.1:8080`** → `api/public` (`Require local`, logi `logs/basemind-*.log`). Zmiany: `httpd.conf` (+`Listen 127.0.0.1:8080` po linii `Listen 80`), `extra/httpd-vhosts.conf` (+blok BaseMind); kopie `*.bak-basemind-20261104`. Port niedostępny z sieci LAN (sprawdzone).
- [x] Poprawka `.htaccess`: Apache z XAMPP ładuje PHP jako `php_module` → `<IfModule php_module>` (wcześniej `mod_php.c` nie pasowało). Nagłówki dla plików statycznych przez `Header set` (bez duplikatów z nagłówkami aplikacji).
- [x] Test reguł (docroot = `public/`): `/api/health` 200; `/.env`, `/.user.ini`, `/.htaccess`, `/.git/config`, `/info.php`, `/storage/logs/laravel.log`, `/%2e%2e/.env` → 403; `/.well-known/acme-challenge/*` → 200 (SSL), `/.well-known/.hidden` → 403.
- [x] Test trybu awaryjnego (docroot = cały `api/`, tymczasowy vhost 8081 — usunięty po teście): `.env`, `.env.example`, `.git`, logi → 403; `composer.json`, `artisan`, `config/`, `app/`, `vendor/`, `phpunit.xml` → 404 (Laravel); `/api/health` działa. Dodane `DirectorySlash Off` w `api/.htaccess` (301 zdradzało istnienie katalogów).
- [x] Strona powitalna Laravela usunięta; `SpaController` + `routes/web.php` serwują powłokę PWA bez sesji i bazy. `/api`, `/sanctum`, `/s`, katalogi statyczne i ścieżki z kropką zwracają prawdziwe 404. `/index.html` przechodzi przez Laravela (reguła w `.htaccess`), żeby zawsze dostać CSP.
- [x] `web/` — Vite 8 + React 19 + TS 6, Tailwind v4, shadcn/ui (`components.json`, Button), TanStack Router (trasy w kodzie, lazy loading), vite-plugin-pwa (`injectManifest`, precache powłoki, offline), font Inter z własnych plików, ikony PWA (`pnpm icons`), teksty w `src/i18n/pl.ts`, rejestr modułów `src/modules/registry.ts`.
- [x] Ekrany szkieletowe: „Dziś”, „Zadania”, „Kalendarz”, „Więcej” z siatką modułów, strona zastępcza modułu pod własnym adresem (`/notes`, `/finance`…), dolna nawigacja, arkusz [+] (na razie informacyjny; właściwy w 1.10).
- [x] „Ustawienia” (`/settings`) z wyborem motywu: system / jasny / ciemny. Zapis w `localStorage`, `public/theme-init.js` ustawia motyw przed pierwszym renderem (CSP zabrania skryptów inline). Synchronizacja z `user_settings` — Etap 1.
- [x] Proxy Vite → Apache (`/api`, `/sanctum`, `/s/`); build do `api/public/` (czyszczenie: `web/scripts/clean-build.mjs`, tylko jawna lista plików); fallback SPA w Laravelu.
- [x] ESLint + Prettier + `tsc` + Vitest (web). Pint i Larastan (api, `composer analyse`), testy api w PHPUnit. Playwright (e2e, `pnpm e2e`) dodany 2026-11-14.
- [ ] Sprawdzić nowe reguły `.htaccess` w trybie awaryjnym (docroot = cały `api/`) — testowane tylko z docroot `public/`.
- [x] `README.md` (główny) — uruchomienie backendu i frontendu, build, telefon po USB.
- [x] `CLAUDE.md` (główny) — krótki wskaźnik dla Claude: zasady współpracy + „czytaj `projekt.md` i `plan.md`”.
- [x] Repozytorium zdalne: `origin` = https://github.com/mwojcik7/BaseMind.git, wypchnięta gałąź `main`.

### 0.4 Design system
- [x] Tokeny w `web/src/index.css`: kolory (jasny/ciemny przez `light-dark()`, akcent niebieski, statusy z kontrastem ≥ 4,5:1), typografia (Inter, `PageHeader`, cyfry tabelaryczne), promienie, cień `shadow-raised`, `prefers-reduced-motion`. Odstępy: skala Tailwinda.
- [x] Komponenty w `web/src/components/ui/`: Button, Input, AmountInput (kwoty w groszach, `lib/money.ts`), DatePicker (pl, poniedziałek pierwszy, wartość `yyyy-MM-dd`), Select, Checkbox, Switch, BottomSheet (ściąganie uchwytu w dół), Dialog, Toast, EmptyState, ListItem ze swipe (akcje także jako przyciski), Card, Badge, Tabs, FAB (przycisk [+] w nawigacji). Cele dotykowe min. 44 px.
- [x] Layout mobile: górny pasek z wyszukiwarką (na razie informacyjna; właściwa w 1.7), dolna nawigacja, safe-area.
- [x] Layout desktop: sidebar + treść, `Ctrl+K`.
- [x] Strona „Więcej” — siatka modułów.
- [x] Przełącznik motywu (system/jasny/ciemny).
- [x] Podgląd wszystkich elementów: `/design` (bez linku w aplikacji).
- [x] **Pokaz użytkownikowi na telefonie** — zaakceptowany przez użytkownika.
- [-] Osobny kolor każdego modułu — odrzucone przez użytkownika: jeden niebieski akcent w całej aplikacji.
- [ ] Usunąć `/design` przed wdrożeniem (Etap 7).

---

## Etap 1 — Fundament

### 1.1 Uwierzytelnianie i przestrzenie
- [x] Migracje: `users` (`display_name`, `timezone`, `locale`), `sessions`, `spaces`, `space_members`, `user_settings`, `sync_counter`.
- [x] Fortify (headless, pod `/api/auth`) + Sanctum SPA: logowanie, wylogowanie, reset hasła e-mailem (link prowadzi do ekranu PWA; reset wylogowuje wszystkie urządzenia).
- [x] Rejestracja: **kod zaproszenia** (`BASEMIND_REGISTRATION_CODE`; pusty = rejestracja wyłączona; 5 prób na 15 min). Polskie komunikaty w `api/lang/pl`.
- [x] argon2id (zweryfikowane na koncie utworzonym przez formularz); rate limiting: logowanie 5/min na konto i adres, 20/min na adres, wszystkie endpointy auth 30/min.
- [x] Automatyczna przestrzeń prywatna i ustawienia przy tworzeniu użytkownika.
- [x] Policies: `SpacePolicy`, `SpaceItemPolicy` + trait `BelongsToSpace` dla modeli z `space_id` (obcym 404, nie 403).
- [x] Ekrany logowania, rejestracji, resetu hasła + „Sesje i urządzenia” (`/settings/sessions`); wylogowanie w ustawieniach. Strażnik tras w `AppLayout`/`AuthLayout`.
- [x] Offline: zapamiętane konto otwiera aplikację bez sieci (na razie `localStorage`, w 1.3 przeniesienie do Dexie); wylogowanie wymaga połączenia, bo sesja serwera mogłaby wrócić.
- [x] Testy (PHPUnit, nie Pest): użytkownik A nie ma dostępu do danych przestrzeni B; Chrome: cały przepływ z prawdziwym CSRF, w tym unieważnienie sesji drugiego urządzenia.
- [x] Test użytkownika na telefonie — logowanie działa.
- [-] 2FA — przeniesione do Etapu 7 (decyzja użytkownika).

### 1.2 Szyfrowanie
- [x] Serwis `Crypto` (libsodium): secretbox dla pól, secretstream dla plików, identyfikator klucza w szyfrogramie, osobne podklucze dla pól i plików. Sprawdzone na pliku 50 MB: ok. 0,2 MB dodatkowej pamięci.
- [x] Casty Eloquent: `SodiumEncrypted`, `SodiumEncryptedJson` (także liczby, np. stawki). Zapis tej samej wartości nie jest zmianą, więc nie będzie podbijał `version` w synchronizacji.
- [x] Komenda `php artisan basemind:key` (generowanie `SODIUM_KEY`, nie wypisuje klucza, nie nadpisuje istniejącego) + instrukcja bezpiecznej kopii w `README.md`.
- [x] Rotacja klucza: `basemind:key --rotate` (nowy klucz, stary trafia do `SODIUM_PREVIOUS_KEYS`) i `basemind:reencrypt` (przeszyfrowanie pól, także usuniętych wierszy, bez zmiany `updated_at`, można przerwać i powtórzyć).
- [x] Testy: zapis → w bazie szyfrogram, odczyt → tekst jawny; zły klucz → błąd; brak klucza → nic nie trafia do bazy; pliki: zmiana, ucięcie, zamiana kawałków.
- [ ] Rotacja zaszyfrowanych plików — razem z tabelą `attachments` (6.5). Do tego czasu pliki czytamy starymi kluczami z `SODIUM_PREVIOUS_KEYS`.

### 1.3 Warstwa danych offline (klient)
- [x] Dexie: schemat, wersjonowanie, tabele `outbox`, `meta` (`web/src/db/db.ts`; nowy moduł dopisuje kolejną wersję do `SCHEMA_VERSIONS`).
- [x] Generyczne repozytorium encji (`create/update/softDelete/get/list`) → Dexie + outbox w jednej transakcji, pola wspólne (UUIDv7, space_id, timestamps, version). `update` wysyła tylko zmienione pola; zapis tych samych wartości nie jest zmianą.
- [x] Hooki React: `useRecords`, `useRecord` (`useLiveQuery`).
- [x] Czyszczenie danych przy wylogowaniu, po zakończeniu sesji przez serwer i przy zalogowaniu na inne konto.
- [x] Zapamiętane konto przeniesione z `localStorage` do Dexie (także automatycznie na istniejących urządzeniach).
- [x] Test użytkownika na telefonie: konto przeniesione, aplikacja otwiera się bez logowania także po odłączeniu kabla (sprawdzone przy 1.4; tryb samolotowy z pierwszego testu nie odcinał serwera).

### 1.4 Synchronizacja
- [x] Rejestr encji sync w Laravelu: `config/sync.php`, trait `Syncable` (reguły walidacji i pola dozwolone w `syncRules()`), `SpaceItemPolicy`, makro `$table->syncable()`.
- [x] `POST /api/sync/push` — partie do 100, walidacja, uprawnienia, wersje, LWW per pole (`field_stamps`), idempotentność (`sync_ops`). Tekst zapisywany bez przycinania.
- [-] Kopie konfliktów notatek — przeniesione do 2.3 (decyzja użytkownika), bo tabela notatek jeszcze nie istnieje.
- [x] `GET /api/sync/pull?cursor=` — stronicowanie, nagrobki, odszyfrowanie pól 🔐.
- [x] Globalny licznik `rev` (`sync_counter`, atomowo w transakcji).
- [x] Klient: silnik sync (start, `online`, powrót do aplikacji, debounce 2 s, interwał 60 s, Background Sync w SW). Niewysłane zmiany zostają na wierzchu pobranych rekordów.
- [x] Wskaźnik stanu sync w UI (ikona przy wyszukiwarce).
- [x] Ostrzeżenie przy wylogowaniu z niewysłanymi zmianami.
- [x] Motyw synchronizowany przez `user_settings` (`POST /api/settings`, `settings` w odpowiedzi pull).
- [x] Testy automatyczne: konflikty, ponowne wysłanie partii, uprawnienia, szyfrowanie, stronicowanie, edycje w trakcie synchronizacji.
- [x] Test użytkownika: start bez kabla, stan offline, przeniesienie motywu z telefonu na komputer.
- [x] Na żywo: rekordy między telefonem a komputerem, także dodane bez połączenia (test użytkownika przy 1.6).
- [ ] Na żywo: Background Sync.

### 1.5 PWA
- [x] Manifest: ikony (192, 512, maskable), `shortcuts`, kolory, `standalone`. Skróty otwierają na razie ekrany modułów; przekierować na formularze dodawania, gdy powstaną.
- [x] Service Worker (`injectManifest`): precache, fallback offline.
- [-] Cache obrazów — przeniesione do 4.1 (decyzja użytkownika): jedyne obrazki to ikony, które są w precache.
- [x] Baner instalacji (Android) + instrukcja iOS. Po zamknięciu wraca po 30 dniach.
- [x] Meta tagi iOS, apple-touch-icon.
- [-] Ekrany startowe iOS (splash) — pominięte (decyzja użytkownika): dziesiątki obrazków pobieranych też na Androidzie, brak iPhone'a do sprawdzenia. Dodać, gdy ktoś zacznie używać iPhone'a.
- [x] Aktualizacja aplikacji („Dostępna nowa wersja” + „Odśwież”), także po powrocie do otwartej aplikacji (najwyżej co godzinę).
- [x] Test użytkownika na telefonie: instalacja, skróty, komunikat o nowej wersji.

### 1.6 Tagi i powiązania
- [x] Migracje i sync: `tags`, `entity_tags`, `entity_links` (modele, reguły, tabele lokalne, repozytoria). Tag i źródło powiązania muszą być w tej samej przestrzeni; cel powiązania może być w innej.
- [x] Test użytkownika: rekordy między telefonem a komputerem, usuwanie, dodawanie bez połączenia (strona `/design`).
- [-] Komponenty wyboru tagów i „Powiązania”, parser treści — przeniesione do 2.3 (decyzja użytkownika), bo nie ma jeszcze modułu, do którego można by je podpiąć.

### 1.7 Globalne wyszukiwanie
- [x] Worker MiniSearch: indeks encji z Dexie, aktualizacja przy zmianach (indeks tylko w pamięci, startuje przy pierwszym wyszukiwaniu).
- [x] Normalizacja polskich znaków, wyszukiwanie prefiksowe i rozmyte, tolerancja przestawionych liter.
- [x] UI: pasek u góry (mobile — pełnoekranowe wyniki), `Ctrl+K` (desktop), wyniki pogrupowane po modułach, ostatnie wyszukiwania.
- [x] Rejestr: `web/src/search/sources.ts` (pola, tytuł, adres) i `presentation.ts` (ikona, nazwa grupy). Na razie tylko tagi; każdy moduł dopisuje swój wpis.
- [x] Test użytkownika na telefonie: wyszukiwanie, literówki, usuwanie z wyników, ostatnie wyszukiwania, offline.

### 1.8 Przypomnienia i powiadomienia
- [x] Migracje: `reminders` (tytuł 🔐, synchronizowane), `push_subscriptions` (powiązane z sesją: koniec sesji zatrzymuje powiadomienia); `jobs`, `failed_jobs` już były.
- [x] Klucze VAPID (`basemind:vapid`), endpoint subskrypcji push (tylko prawdziwe serwery push: ochrona SSRF), zgoda na powiadomienia na ekranie ustawień.
- [x] Scheduler (`routes/console.php`): co minutę przypomnienia, digesty i `queue:work --stop-when-empty`. Cykliczne w strefie użytkownika (także przy zmianie czasu), „X dni przed” przez `offset_minutes`, pominięte terminy nie idą seriami.
- [x] Wysyłka push z akcjami („Zrobione”, „Odłóż 1 h”) + obsługa w SW; usuwanie wygasłych subskrypcji (404/410).
- [x] Wysyłka e-mail (Laravel Mail, tekst; lokalnie do logu).
- [x] Ustawienia: `/settings/notifications` — powiadomienia na urządzeniu, e-mail, godziny ciszy, podsumowanie.
- [-] Kanały per typ — przeniesione do modułów (decyzja użytkownika), bo typy jeszcze nie istnieją.
- [x] Daily digest: domyślnie 7:00, zmiana w ustawieniach; wysyłany tylko z treścią. Sekcje (zadania i wydarzenia na dziś, zaległe, płatności, urodziny) dodają moduły przez `config/digest.php`.
- [x] Badging API (przypomnienia wysłane i bez odpowiedzi).
- [x] Lokalnie: `php artisan schedule:work` (z `OPENSSL_CONF`, `projekt.md`, pkt 14); produkcyjnie: instrukcja crona w `routes/console.php`.
- [x] Test użytkownika na telefonie: zgoda, powiadomienie przy zamkniętej aplikacji, przyciski, licznik, ustawienia. Logi potwierdziły stany i e-maile.

### 1.9 Dashboard „Dziś” (szkielet)
- [x] System widżetów: rejestr, kolejność i widoczność na ekranie `/settings/dashboard`; układ działa offline i synchronizuje się przez `user_settings`.
- [x] Powitanie zależne od pory dnia, imię z `display_name`, data (zawsze na górze, bez możliwości ukrycia).
- [-] Imieniny — odrzucone przez użytkownika, w całej aplikacji.
- [-] Widżet „Szybka notatka” — przeniesiony do 2.3 (decyzja użytkownika), bo notatki jeszcze nie istnieją.
- [x] Test użytkownika na telefonie.

### 1.10 Szybkie dodawanie [+]
Zrobione razem z 2.1 (decyzja użytkownika).
- [x] Bottom sheet z rejestrem typów (przy jednym typie bez wyboru); typ dostarcza własny formularz.
- [x] Parser tekstu z regułami dodawanymi przez moduły.
- [x] Osobny skrót na komputerze: klawisz Q (`Ctrl+K` to wyszukiwarka).
- [x] Panele wysuwane unoszą się nad klawiaturą ekranową.

### 1.11 Poprawki zgłoszone przez użytkownika
- [x] Ostatnie wyszukiwania: usuwanie pojedynczego wpisu (krzyżyk przy wpisie w `SearchDialog`).
- [x] Synchronizacja po kliknięciu: wskaźnik stanu (`SyncIndicator`, ikona przy wyszukiwarce) uruchamia od razu pełny cykl (`syncNow()`), ikona kręci się co najmniej 0,6 s. Powód: automatyczne pobieranie zmian co 60 s trwa użytkownikowi za długo. Interwał 60 s zostaje bez zmian (decyzja z 2026-11-09), to dodatkowa, ręczna droga.
- [x] Test użytkownika na telefonie.

### 1.12 Kosz (zgłoszone przez użytkownika; robiony zaraz po części 2 zadań)
- [x] **Podzadania:** pole `tasks.deleted_with_parent` (synchronizowane) zamiast listy w pamięci: przywrócenie zadania przywraca tylko podzadania usunięte razem z nim, także na innym urządzeniu. Przywrócenie podzadania przywraca też rodzica (bez jego pozostałych podzadań).
- [x] Ekran „Kosz” (`/trash`, wejście z „Więcej”): pozycje pogrupowane według dnia usunięcia, „Zostało N dni”, „Przywróć”, ikona „Usuń na zawsze” z potwierdzeniem, „Opróżnij kosz”. Działa offline.
- [x] Trwałe usuwanie: operacja synchronizacji `purge` (tylko dla elementów w koszu), serwis `Trash` usuwa też podzadania, przypomnienia, tagi i powiązania; codziennie o 3:30 `basemind:empty-trash` usuwa elementy starsze niż 30 dni. Z rekordu zostaje tylko wpis w `sync_purges` (bez treści), po którym urządzenia kasują swoją kopię; wpisy starsze niż rok są usuwane, a urządzenie z kursorem sprzed nich pobiera dane od nowa (`reset` w odpowiedzi pull, `sync_counter.purge_horizon`). Ustawienia w `config/trash.php`.
- [x] Rejestr `web/src/modules/trashRegistry.ts`: moduł dopisuje się jednym wpisem (ikona, nazwa, pozycje, przywracanie, usuwanie). Listy zadań: usunięta lista zostawia zadaniom `list_id`, więc są w Skrzynce do przywrócenia listy; po trwałym usunięciu serwer przenosi je do Skrzynki na stałe. Usuwanie listy ma „Cofnij”. Kopia wystąpienia cofnięta przez „Cofnij” znika od razu, bez kosza. Tagi w koszu razem z ekranem tagów (2.3).
- [x] Użytkownik potwierdził na telefonie 2026-11-15.

---

## Etap 2 — Codzienność

### 2.1 Zadania (Todo)
**Część 1 (zrobiona)**
- [x] Encje `task_lists`, `tasks` (+ sync, wyszukiwanie); tytuł i notatka 🔐.
- [x] Widoki: Dziś (zaległe jako sekcja na górze, decyzja użytkownika), Nadchodzące (z „Bez terminu”), Listy (ze Skrzynką), Ukończone.
- [x] Priorytety P1–P4, termin (data + opcjonalnie godzina), notatka tekstowa, edycja pod własnym adresem (`/tasks/$taskId`).
- [x] Sekcje porannego podsumowania: zadania na dziś i zaległe.
- [x] Przypomnienia (w chwili terminu, 30 min, 1 godz., 1 dzień przed; bez godziny liczone od 9:00), także w arkuszu [+]; podążają za odhaczeniem, usunięciem i zmianą terminu. „Zrobione” na powiadomieniu odhacza zadanie.
- [x] Pole wyboru odhacza, swipe w prawo: na jutro, w lewo: usuń z „Cofnij” (zaakceptowane przez użytkownika).
- [x] Parser: „dziś”, „jutro”, „w piątek”, „!1”.
- [x] Widżet dashboardu: dziś + zaległe.

**Część 2 (w toku; kolejność ustalona z użytkownikiem 2026-11-14)**
- [x] Podzadania (jeden poziom, pełne zadania z `parent_id`): sekcja w oknie zadania, licznik postępu, podzadania z terminem w „Dziś”/„Nadchodzące” z nazwą rodzica, pytanie przy odhaczaniu rodzica z otwartymi podzadaniami (także z przycisku „Zrobione” na powiadomieniu, który otwiera aplikację), usuwanie razem z rodzicem z „Cofnij”. Notatka w Markdown: pole tekstowe z podglądem. Użytkownik potwierdził na telefonie (w tym „Zrobione” na powiadomieniu).
- [x] Cykliczność: wzorce dzienne, tygodniowe (wybrane dni, dni robocze), miesięczne (dzień, ostatni dzień, n-ty / ostatni dzień tygodnia), roczne, co N; od terminu lub od ukończenia; koniec po dacie lub liczbie razy. Odhaczenie przesuwa zadanie z „Cofnij”, kopia trafia do „Ukończonych”, podzadania wracają otwarte z przesuniętymi terminami, przypomnienia idą za terminem; „na jutro” przesuwa tylko jedno wystąpienie; „Pomiń to wystąpienie”. „Zrobione” na powiadomieniu działa tak samo na serwerze. Podzadania nie powtarzają się. Użytkownik potwierdził na telefonie 2026-11-15 (w tym „Zrobione” na powiadomieniu).
- [x] Reszta parsera: powtarzanie, godzina, daty (`pojutrze`, `za 3 dni`, `w przyszły wtorek`, `15.11`, `15 listopada`), `#lista` (tylko istniejące, najdłuższa nazwa wygrywa), `przypomnij …`; podsumowanie pod polem arkusza.
- [x] Kanały powiadomień dla typu (przeniesione z 1.8): sekcja „Według typu” w ustawieniach powiadomień, zadania domyślnie tylko telefon, przełączniki ogólne nadrzędne. Kolejne moduły dopisują typ w `api/config/notifications.php` i `web/src/modules/notificationTypes.ts`. Przy okazji: push bez stałej treści „Przypomnienie z BaseMind”. Użytkownik potwierdził na telefonie 2026-11-15.
- [ ] Powiązania i tagi zadań — przeniesione do 2.3 (opierają się na komponentach notatek).
- [ ] Sortowanie przeciąganiem (odłożone, decyzja użytkownika 2026-11-14; nie w części 2). Do tego czasu podzadania w kolejności dodania.

### 2.2 Kalendarz
> Zakres ustalony z użytkownikiem 2026-11-15 (decyzje w `projekt.md`, pkt 13). Dwie części, jak przy zadaniach.

**Część 1**
- [x] Encja `events` (+ sync; zrobione 2026-11-15, model w `projekt.md`, pkt 4; ekran edycji w osobnym punkcie): tytuł 🔐, miejsce 🔐, notatka 🔐 (Markdown z podglądem), cały dzień / godziny (domyślnie 1 godz.), wielodniowe, kolor z palety ok. 8 kolorów (nie dowolny), `rrule`.
- [x] Ekran wydarzenia (`/calendar/new`, `/calendar/events/{id}?date=`; 2026-11-15): arkusz od dołu z polami w ustalonej kolejności, koniec przesuwa się z początkiem, „Cały dzień” z przypomnieniami „W dniu, 7:00” / „Dzień wcześniej, 7:00”, 8 kolorów, notatka Markdown (wspólny `MarkdownField`), „Pomiń to wystąpienie” z „Cofnij”, usuwanie z „Cofnij”. Na ekranie „Kalendarz” tymczasowa lista najbliższych 60 dni (do zastąpienia widokami Agenda i Miesiąc). 2026-11-16 po uwagach użytkownika: kilka przypomnień na wydarzenie (lista z „Dodaj przypomnienie” i usuwaniem), dla całodniowych także 2 i 3 dni, tydzień i miesiąc (30 dni) wcześniej; nowa paleta kolorów (różowy → szary, morski → turkusowy). Sprawdzone na telefonie 2026-11-16. Tego dnia także przypomnienie **„Własne…”** (liczba + min / godz. / dni / tyg.; przy dniach i tygodniach własna godzina, kolumna `reminders.remind_time`), również przy zadaniach; sprawdzone na telefonie.
- [x] Cykliczność: ten sam edytor `RepeatField` (bez wyboru „od ukończenia”, liczba powtórzeń jako `COUNT`); wszystkie wystąpienia wyliczane z reguły w strefie użytkownika (godzina stała przy zmianie czasu); w części 1 zmiana całej serii albo pominięcie jednego wystąpienia. Wyliczanie wystąpień zrobione (`series.ts` / `EventSeries`); edytor w ekranie wydarzenia.
- [x] Przypomnienia: w chwili rozpoczęcia, 15 min, 30 min, 1 godz., 1 dzień przed; **domyślnie 1 dzień przed**; „1 dzień przed” zawsze dzień wcześniej **o 7:00** (także dla wydarzeń z godziną); całodniowe liczone od 7:00; przed każdym wystąpieniem serii (serwer po wysłaniu wylicza następne). Zrobione: przypomnienie bez własnej reguły, serwer po wysłaniu przechodzi do następnego wystąpienia; „Zrobione” na powiadomieniu o wydarzeniu nazywa się „OK” i tylko zamyka przypomnienie, seria idzie dalej.
- [x] Zadania: przypomnienia bez godziny liczone od **7:00** zamiast 9:00; „1 dzień przed” też dzień wcześniej o 7:00 (spójnie z wydarzeniami). Wspólna reguła `reminder-moment.ts` / `App\Support\ReminderMoment` z przypadkami w `web/src/lib/reminder-moment.cases.json`; etykieta „Dzień wcześniej, 7:00”. Zaplanowanych przypomnień nie trzeba było przeliczać (jedyne nie podlegało zmianie).
- [x] Widoki: Agenda (domyślny na telefonie, dzień po dniu, w przód i w tył) i Miesiąc (siatka z kropkami, lista dnia pod spodem); przycisk „Dziś”, przesuwanie palcem. Zrobione 2026-11-16 (`AgendaView.tsx`, `MonthView.tsx`, `CalendarItems.tsx`, logika w `days.ts`, stan widoku w `view.ts`): w Agendzie tylko dni z wpisami i zawsze dziś, przeszłość przyciskiem „Pokaż wcześniejsze dni”, przyszłość doczytywana sama (do 2 lat), nagłówki dni przyklejone pod paskiem (`--app-bar` z `AppShell`); widok zapamiętany na urządzeniu (telefon Agenda, komputer Miesiąc). Zaakceptowane przez użytkownika.
- [x] Rejestr „dostawców dat” z warstwami do włączania (wybór zapisany w `user_settings`): Wydarzenia; Zadania z terminem (domyślnie włączone; odhaczanie z „Cofnij”, dotknięcie otwiera zadanie; zaległe w swoim dniu oraz dziś w sekcji „Zaległe” na górze; zrobione domyślnie ukryte, przełącznik „Pokazuj zrobione zadania” w ustawieniach kalendarza); Polskie święta ustawowe (wyliczane w aplikacji, z Wielkanocą i Wigilią od 2025). Zrobione 2026-11-16: `itemsByDay` w `days.ts` (nowa warstwa = wpis w `CALENDAR_LAYERS` w `settings.ts` + gałąź w `itemsByDay`), `holidays.ts`, ustawienia `calendar` w `user_settings` (`hidden_layers`, `show_done`; `saveCalendarSettings` w silniku synchronizacji), przełącznik „Pokazuj zrobione” w arkuszu warstw (decyzja użytkownika). Zadania cykliczne widoczne tylko w dniu bieżącego terminu.
- [ ] Widżet „Wydarzenia” na „Dziś”: dziś i jutro (identyfikator `events` zostaje).
- [ ] Sekcja „Wydarzenia dziś” w porannym podsumowaniu.
- [ ] Arkusz [+]: zakładka „Wydarzenie” z parserem (`jutro 18:00 dentysta`, `w piątek 10-12 …`, `co wtorek 18:00 …`, `przypomnij …`).
- [x] Wyszukiwanie, kosz (z przypomnieniem idącym za wydarzeniem) i typ „Wydarzenia” w kanałach powiadomień (domyślnie tylko telefon). Adres wyniku `/calendar/events/{id}` zacznie działać z ekranem wydarzenia.
- [x] Dotknięcie powiadomienia otwiera samo wydarzenie; **to samo dla zadań** — zadania zrobione (adresy w `config/notifications.php`, sekcja `paths`; otwarta aplikacja przechodzi do zadania), sprawdzone na telefonie 2026-11-16; wydarzenia: adres `/calendar/events/{id}` w `paths`, zadziała z ekranem wydarzenia.

**Część 2**
- [ ] Widoki Dzień i Tydzień z osią godzin.
- [ ] Zmiana jednego wystąpienia serii: „tylko to”, „to i następne”, „wszystkie”.
- [ ] Przeciąganie wydarzeń na inną godzinę lub dzień.
- [ ] Duplikowanie wydarzenia.

**Później (🔒, osobne decyzje)**
- [ ] Eksport iCal (subskrybowany link) / import `.ics`.
- [-] Dwustronna synchronizacja z Google Calendar — raczej nie (koszt, konflikt z szyfrowaniem).
- [-] Zaproszenia i uczestnicy — nie; wspólne wydarzenia przez przestrzenie współdzielone.

### 2.3 Notatki Markdown z backlinkami
- [ ] Encje `notes` (content 🔐, kolumna `MEDIUMTEXT`, bo szyfrogram jest o ok. 1/3 dłuższy), `note_folders`.
- [ ] Edytor CodeMirror 6 z paskiem narzędzi nad klawiaturą, tryb podglądu.
- [ ] Autouzupełnianie `[[`, `@`, `#`.
- [ ] Komponent wyboru tagów; komponent „Powiązania” (linki wychodzące + backlinki, dodawanie ręczne) (przeniesione z 1.6).
- [ ] Parser treści `[[tytuł]]`, `@osoba`, `#tag` → `entity_links` (`origin=parsed`) (przeniesione z 1.6).
- [ ] Tagi i powiązania: pokazywanie bez duplikatów (dwa urządzenia offline mogą utworzyć ten sam tag lub przypiąć go dwa razy) i sprzątanie po usunięciu elementu.
- [ ] Panel backlinków; tworzenie notatki z nieistniejącego `[[linku]]`.
- [ ] Przypinanie, foldery, archiwum.
- [ ] Kopia konfliktu przy sync (przeniesiona z 1.4; miejsce na nią to gałąź konfliktu w `SyncService::update`).
- [ ] Szybka notatka z dashboardu → „Inbox”.
- [ ] (Opcjonalnie) graf powiązań, notatki dzienne.

---

## Etap 3 — Pieniądze

### 3.1 Manager finansów
- [ ] Encje `wallets`, `categories`, `transactions`, `budgets`.
- [ ] Domyślne kategorie PL (edytowalne).
- [ ] Portfele z saldem, przelewy między portfelami.
- [ ] **Szybkie dodawanie** (priorytet UX): duża klawiatura kwoty → kategoria (ostatnio używane) → zapisz; parser `-45 paliwo karta`.
- [ ] Arkusz [+] sam rozpoznaje typ po treści: `-liczba` to wydatek, `+liczba` to wpływ (zgłoszone przez użytkownika; „wpływ” potwierdzony 2026-11-14).
- [ ] Lista transakcji z filtrami, grupowanie po dniach.
- [ ] Raporty: wydatki per kategoria (donut), wpływy/wydatki miesięcznie (słupki), trend salda, porównanie miesięcy.
- [ ] Budżety miesięczne z ostrzeżeniami.
- [ ] 🔒 Waluty obce.
- [ ] Widżet dashboardu: ostatnie wydatki + wydano w miesiącu vs budżet.
- [-] Import wyciągów bankowych — **odrzucone przez użytkownika**.

### 3.2 Agregator subskrypcji
- [ ] Encja `subscriptions`.
- [ ] Lista z sumą miesięczną/roczną, sortowanie wg najbliższej płatności.
- [ ] Cykle (miesięczny, roczny, kwartalny, co X tygodni, własny), okres próbny.
- [ ] Przypomnienia przed pobraniem i przed końcem okresu próbnego.
- [ ] Automatyczna transakcja w dniu pobrania (🔒 klient czy serwer — bez dublowania).
- [ ] Płatności w kalendarzu; widżet „najbliższe płatności”.

---

## Etap 4 — Schowek

### 4.1 Zakładki (rich links)
- [ ] Encja `bookmarks`.
- [ ] `/api/link-preview`: OG/Twitter Card/oEmbed (YouTube), favicon, **ochrona SSRF**, timeouty, cache, zapis miniatury.
- [ ] Offline: link zapisany od razu, podgląd pobierany po sync.
- [ ] Cache miniatur w Service Workerze (przeniesione z 1.5).
- [ ] **Android Share Target** → zapis do schowka (z tagiem/notatką).
- [ ] Widoki: Inbox / Przeczytane / Archiwum / Ulubione; filtr artykuły/filmy; karty z miniaturami.
- [ ] (iOS, później) instrukcja Skrótu.

### 4.2 Listy: do obejrzenia / przeczytania / zagrania
- [ ] Encja `media_items`; zakładki Filmy, Seriale, Książki, Gry; statusy, oceny.
- [ ] 🔒 Automatyczne okładki (TMDB / OpenLibrary / IGDB).
- [ ] Konwersja zakładki w element listy.

### 4.3 Baza kodów i szybkich danych
- [ ] Encja `quick_codes` (value 🔐).
- [ ] Kategorie, kopiowanie jednym dotknięciem, ukrywanie wartości wrażliwych.
- [ ] (Opcjonalnie) QR Wi-Fi dla gości, karty lojalnościowe jako kod kreskowy.

---

## Etap 5 — Życie

### 5.1 Grafik pracy i godziny
- [ ] Encje `work_profiles`, `shift_templates`, `work_entries`.
- [ ] Tryb stały (jedno dotknięcie „dzień standardowy”) i zmianowy (szablony zmian).
- [ ] Start/stop lub wpis ręczny.
- [ ] 🔒 Reguły nadgodzin (norma, dodatki 50%/100%, noc, święta), wynagrodzenie.
- [ ] Typy dni: praca, urlop, L4, święto, wolne; licznik urlopu.
- [ ] Podsumowania tydzień/miesiąc, szacowana wypłata.
- [ ] Warstwa w kalendarzu; widżet dashboardu.

### 5.2 Trener: godziny i wynagrodzenie (zgłoszone przez użytkownika, zaraz po 5.1)
Kontekst: użytkownik po etacie jest trenerem piłki nożnej w klubie, na umowie zlecenia, rozliczenie raz w miesiącu za cały miesiąc. Kwoty od klubu są podawane brutto.
- [ ] Encje: umowa z klubem (rodzaj umowy, stawki domyślne dla każdego rodzaju wydarzenia), stały grafik tygodniowy treningów, wydarzenia z godzinami i kwotą, zwroty kosztów paliwa (osobno, poza wynagrodzeniem).
- [ ] Rodzaje wydarzeń: trening, mecz, turniej, organizacja turnieju, wyjazd. Mecze i turnieje dodawane ręcznie (także z [+]); kwota domyślna z możliwością zmiany przy wydarzeniu.
- [ ] Treningi generowane ze stałego grafiku; wyjątki: przeniesiony, odwołany, zastępstwo w obie strony (zastępuję kogoś: dodatkowo płatne; ktoś zastępuje mnie: bez wynagrodzenia).
- [ ] Stawka na godzinę dla każdej pozycji osobno + podsumowanie miesięczne i roczne (z podziałem na rodzaje wydarzeń).
- [ ] Kalkulator brutto → netto z wyborem rodzaju umowy (zaczynamy od zlecenia; inne do wyboru); przełączniki: zbieg tytułów ZUS (etat ≥ płaca minimalna → ze zlecenia tylko składka zdrowotna), PIT-2 (domyślnie wyłączony, bo zwykle jest na etacie), koszty uzyskania przychodu. Pole „faktycznie otrzymane netto” do porównania z wyliczeniem. Stawki podatkowe i ZUS w konfiguracji na każdy rok, testy na przykładach.
- [ ] 🔒 Zwrot paliwa: kwota z rachunku czy stawka za kilometr, opodatkowany czy nie (użytkownik jeszcze nie korzystał; ustalić przy wdrożeniu).
- [ ] Wypłata za miesiąc jako wpływ w finansach (Etap 3), bez dublowania.
- [ ] Treningi i mecze w kalendarzu z przypomnieniami; widżet dashboardu „ten miesiąc: X h, Y zł”.
- [ ] Kwoty, stawki i wynagrodzenie 🔐.

### 5.3 Strażnik nawyków
- [ ] Encje `habits`, `habit_logs`.
- [ ] Odhaczanie dnia (także wartości liczbowe), harmonogramy, seria, heatmapa, statystyki.
- [ ] Przypomnienia; widżet dashboardu.

### 5.4 CRM bliskich
- [ ] Encja `contacts` (pola 🔐 wg `projekt.md`), zawsze w przestrzeni prywatnej.
- [ ] Profil: zdjęcie, relacja, urodziny, rozmiary, lubi/nie lubi, jedzenie, alkohole, alergie, rodzina i zwierzęta, ważne daty, notatki.
- [ ] Urodziny w kalendarzu + przypomnienia.
- [ ] Wzmianki `@osoba` → backlinki na profilu.
- [ ] Widżet: nadchodzące urodziny.

### 5.5 Bank pomysłów na prezenty
- [ ] Encja `gift_ideas` (pola 🔐) powiązana z `contacts`.
- [ ] Szybkie dodanie z profilu osoby i z [+].
- [ ] Statusy pomysł → kupione → wręczone; okazja, cena, link.
- [ ] Przypomnienie przed okazją: „Masz X pomysłów na prezent dla …”.
- [ ] Historia wręczonych prezentów.

---

## Etap 6 — Rzeczy

### 6.1 Paszport pojazdu
- [ ] Encje `vehicles`, `vehicle_records`, `vehicle_documents`.
- [ ] Karta pojazdu (VIN 🔐, rejestracja 🔐, opony, olej…), historia serwisowa, dokumenty (OC/AC, przegląd).
- [ ] Przypomnienia: przegląd, OC, olej (data lub przebieg), sezonowa zmiana opon.
- [ ] Koszt → transakcja; terminy w kalendarzu.

### 6.2 Rejestr sprzętów i gwarancji
- [ ] Encja `assets` + załączniki (szyfrowane na dysku).
- [ ] Zdjęcie paragonu z aparatu (kompresja na kliencie, offline do czasu uploadu).
- [ ] Koniec gwarancji (wyliczany), rękojmia jako informacja, przypomnienia, lista „kończy się wkrótce”.
- [ ] Powiązania z lokalizacją i transakcją.

### 6.3 Strażnik dat ważności
- [ ] Encja `expiry_items`.
- [ ] Kategorie z domyślnymi wyprzedzeniami przypomnień (np. paszport — 6 miesięcy).
- [ ] Lista wg terminu z kolorami; terminy w kalendarzu.

### 6.4 Lokalizator rzeczy
- [ ] Encje `locations` (drzewo), `stored_items`.
- [ ] Nawigacja z okruszkami, zdjęcia.
- [ ] Etykiety QR do druku + skanowanie QR w aplikacji.

### 6.5 Publiczne linki do plików
- [ ] Encje `attachments`, `file_shares`.
- [ ] Generowanie linku: czas ważności (1 h / 24 h / 7 dni), hasło, limit pobrań.
- [ ] Publiczna strona `/s/{token}`, unieważnianie, lista aktywnych linków, rate limit.
- [ ] Sprzątanie wygasłych (scheduler).
- [ ] Web Share API (Android).

---

## Etap 7 — Dopracowanie i wdrożenie

- [ ] **2FA TOTP** (Fortify) + kody zapasowe.
- [ ] Blokada aplikacji PIN-em / biometrią (WebAuthn — do sprawdzenia).
- [ ] Eksport wszystkich danych (JSON + ZIP) i import kopii.
- [ ] Audyt wydajności (Lighthouse mobile ≥ 90), wirtualizacja list, rozmiar paczek.
- [ ] Audyt bezpieczeństwa: nagłówki, CSP, rate limity, testy autoryzacji, SSRF, `/.env` niedostępne, aktualne advisory PHP/Laravel (aktualizacja tabeli w `projekt.md` 8.1).
- [ ] Dostępność (kontrast, czytniki ekranu, rozmiary dotyku).
- [ ] 🔒 **Wybór hostingu** wg checklisty `projekt.md` pkt 11.
- [ ] Wdrożenie: struktura katalogów na hostingu, `.env` produkcyjne, `SODIUM_KEY` + kopia w menedżerze haseł, migracje, cron, SMTP, SSL, test push na produkcji.
- [ ] Instrukcja aktualizacji (build lokalny → upload → migracje) w README.
- [ ] Współdzielenie (gdy będzie potrzebne): zaproszenia do przestrzeni wspólnej, role, udostępnianie elementów, wybór przestrzeni przy tworzeniu.

---

## Pomysły na przyszłość (niezaplanowane)

- Eksport/subskrypcja kalendarza iCal (Google Calendar).
- Podsumowanie roku (wydatki, nawyki, przeczytane książki).
- Szablony notatek, notatki dzienne, graf powiązań.
- Lista zakupów współdzielona w przestrzeni wspólnej.
- Skróty iOS do udostępniania linków.
- Bot Telegram (obecnie nie wybrany).
- OCR paragonów (obecnie nie planowany).

---

## Dziennik zmian

| Data | Co zrobiono | Następny krok |
|---|---|---|
| 2026-11-03 | Zebrane wymagania, utworzone `projekt.md` i `plan.md`. | Zatwierdzenie stacku. |
| 2026-11-03 | Zmiana architektury na hosting współdzielony PHP: Laravel + MySQL, lokalnie XAMPP. Szyfrowanie libsodium, 2FA na końcu, nazwa BaseMind, testy przez USB. Analiza luk PHP2Shell i CVE-2026-115560 → sekcja bezpieczeństwa w `projekt.md`. Zainstalowano Composer 2.11.1 i pnpm 12.16.1, PHP i Composer w PATH. Pobranie Mailpit zablokowane przez zabezpieczenia sesji. | Mailpit, utwardzenie php.ini XAMPP, adres lokalny backendu, potem szkielet projektu (0.3). |
| 2026-11-03 | Mail lokalnie przez `log` (bez Mailpit). Utwardzony `php.ini` (z kopią). Utworzone bazy `basemind`, `basemind_test`; lokalnie root bez hasła. Ustalony adres backendu `localhost:8080`. | Szkielet projektu (0.3) — po zgodzie użytkownika. |
| 2026-11-03 | `bind-address=127.0.0.1` dla MariaDB. `git init` + `.gitignore`/`.gitattributes` (commit czeka na autora). Laravel 13.40 w `api/`: MySQL, argon2id, szyfrowane sesje, Sanctum (stateful API), CORS wyłączony, utwardzone `.htaccess`/`.user.ini`, `PhpSecurity` + `EnsureSecureRuntime` + `basemind:security-check`, `SecurityHeaders`, `/api/health`. 21 testów OK, Pint OK. | Autor commitów, e-mail właściciela, decyzja o `api/CLAUDE.md`; potem VirtualHost i `web/`. |
| 2026-11-03 | Autor git: Marcin Wójcik <mgrnewsl@gmail.com>; e-mail alertów = ten sam. Usunięte `api/CLAUDE.md`, `api/AGENTS.md`. Pierwsze commity. | VirtualHost Apache `localhost:8080`, potem `web/` (React PWA). |
| 2026-11-04 | VirtualHost Apache `127.0.0.1:8080` → `api/public` (kopie konfiguracji XAMPP). Poprawki `.htaccess` (`php_module`, bez duplikatów nagłówków, `DirectorySlash Off` w trybie awaryjnym). Testy HTTP reguł dostępu w obu trybach (docroot `public/` i cały `api/`) — brak wycieku plików. | `web/` (React PWA) + test na telefonie. |
| 2026-11-04 | Przygotowanie do przerwy: sekcja „Wznowienie pracy” w `plan.md`; w `projekt.md` pkt 14 (konfiguracja poza repo — XAMPP, PATH, `.env`) i 15 (pułapki); `README.md` i `CLAUDE.md` w katalogu głównym; remote `origin` → GitHub, push `main`. | Następna sesja: frontend `web/` (krok 0.3) — po zgodzie użytkownika. |
| 2026-11-04 | Frontend `web/` (krok 0.3): szkielet PWA, ekrany, proxy, build do `api/public/`, powłoka serwowana przez Laravela z CSP, ikony w `/app-icons/`. Testy: web 8 OK, api 38 OK; Chrome z emulacją Pixel 7: brak błędów CSP, SW aktywny, offline działa. Symfony 8.1.10 → 8.1.11 (poprawki bezpieczeństwa, `composer audit` czysty). Usunięte nieużywane pliki frontendu Laravela (`api/package.json`, `api/vite.config.js`, `api/resources/js`, `api/resources/css`) i kroki `npm` ze skryptu `composer setup`. | Test na telefonie, potem 0.4. |
| 2026-11-04 | Uwagi użytkownika po teście na telefonie (S25 Ultra, test OK): adresy modułów bez `/more` (`/notes`), ekran „Ustawienia” z wyborem motywu, kolor akcentu niebieski `#2563EB` (także ikony PWA), nazwa „Lokalizator rzeczy”. | Design system (0.4) — po zgodzie użytkownika. |
| 2026-11-04 | Design system (0.4): tokeny, komponenty, górny pasek z wyszukiwarką, sidebar na desktopie, podgląd `/design`. Testy: web 45 OK; Chrome z emulacją Pixel 7 i na desktopie: brak błędów CSP, arkusz, swipe, kalendarz i powiadomienia działają. Paczka startowa urosła do ok. 179 kB gzip — sprawdzić przy audycie wydajności. Decyzja użytkownika: jeden niebieski akcent, bez kolorów modułów. | Ocena użytkownika na telefonie, potem Etap 1. |
| 2026-11-05 | Etap 0 zamknięty (design zaakceptowany na telefonie). Krok 1.1: konta z kodem zaproszenia, logowanie, reset hasła, przestrzenie i uprawnienia, ekran sesji, strażnik tras, działanie offline z zapamiętanym kontem. Testy: api 70 OK, web 79 OK; pełny przepływ w Chrome na prawdziwym serwerze; użytkownik potwierdził działanie na telefonie. | 1.2 (szyfrowanie) — po zgodzie użytkownika. |
| 2026-11-05 | Koniec sesji na prośbę użytkownika: dokumentacja przygotowana do wznowienia (stan, lista otwartych spraw, konfiguracja poza repozytorium). Kod bez zmian. Serwery zatrzymane. | 1.2 (szyfrowanie) — po zgodzie użytkownika. |
| 2026-11-05 | Krok 1.2: serwis `Crypto`, casty `SodiumEncrypted` i `SodiumEncryptedJson`, komendy `basemind:key` i `basemind:reencrypt`, lokalny `SODIUM_KEY`. Testy: api 141 OK, web 79 OK (bez zmian), oba audyty czyste; plik 50 MB odszyfrowany identycznie. Rotacja plików odłożona do 6.5. Commit i push za zgodą użytkownika. | Kopia klucza w menedżerze haseł, potem 1.3 — po zgodzie użytkownika. |
| 2026-11-05 | Koniec sesji na prośbę użytkownika: pytania bez odpowiedzi zapisane w „Pytania na start”, wnioski w `projekt.md`, pkt 15. Kod bez zmian. Serwery zatrzymane. Commit i push za zgodą użytkownika. | „Pytania na start”, potem 1.3 — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.3: Dexie (`outbox`, `meta`), repozytorium encji, hooki, konto w Dexie, czyszczenie lokalnych danych. Rozstrzygnięte: kopia klucza w menedżerze haseł, ograniczenie `secretbox` zaakceptowane, zakończenie sesji przez serwer kasuje dane urządzenia. Testy: web 99 OK; audyty `pnpm --prod` i `composer` czyste; testów API nie uruchamiano, bo backend bez zmian. Użytkownik potwierdził działanie na telefonie. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.4 (synchronizacja) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.4: push i pull z rejestrem encji, LWW per pole, `sync_ops`, silnik na kliencie, wskaźnik stanu, Background Sync, ostrzeżenie przy wylogowaniu, motyw w `user_settings`. Testy: api 162 OK, web 131 OK; audyt `composer` czysty; migracja `sync_ops` wykonana na `basemind`. Użytkownik potwierdził na telefonie i komputerze: start bez kabla, stan offline, przeniesienie motywu. Korekta: tryb samolotowy nie odcina serwera przy USB. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.5 (PWA) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.5: skróty w manifeście, baner instalacji, instrukcja iOS, aktualizacje na żądanie zamiast automatycznych, sprawdzanie nowej wersji po powrocie do aplikacji. Testy: web 148 OK; backend bez zmian. Użytkownik potwierdził na telefonie instalację, skróty i komunikat o nowej wersji. Ekrany startowe iOS pominięte, cache obrazków przeniesiony do 4.1. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.6 (tagi i powiązania) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.6 w ustalonym zakresie: tabele, modele, synchronizacja i tabele lokalne dla tagów i powiązań; lista testowa na `/design`. Testy: api 173 OK, web 151 OK; audyt `composer` czysty; migracja wykonana na `basemind`. Użytkownik potwierdził przesyłanie rekordów między telefonem a komputerem. Zgłoszone opóźnienie: serwer odpowiada w ok. 60 ms, zwłoka wynika z pobierania zmian co 60 s na drugim urządzeniu. Interfejs i parser przeniesione do 2.3. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.7 (wyszukiwanie) — po zgodzie użytkownika. |
| 2026-11-09 | Interwał pobierania zmian zostaje 60 s (decyzja użytkownika). Krok 1.7: indeks MiniSearch w Web Workerze, polskie znaki, literówki i przestawione litery, ekran wyników, ostatnie wyszukiwania, rejestr źródeł (na razie tagi). Testy: web 177 OK; backend bez zmian. Użytkownik potwierdził na telefonie; test wykrył brak tolerancji przestawionych liter, poprawione. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.8 (przypomnienia) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.8: przypomnienia (także cykliczne, odkładanie, godziny ciszy), Web Push z przyciskami, e-maile, ustawienia, licznik na ikonie, mechanizm porannego podsumowania. Tytuły przypomnień szyfrowane (decyzja użytkownika; 3 testowe zaszyfrowane jednorazowo w lokalnej bazie). Testy: api 219 OK, web 195 OK; oba audyty czyste; migracja na `basemind`, klucze VAPID w `.env`. Użytkownik potwierdził na telefonie. Koniec sesji na prośbę użytkownika, dokumentacja przygotowana do wznowienia. Serwery i harmonogram zatrzymane. Commit i push za zgodą użytkownika. | 1.9 (dashboard) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.9: rejestr widżetów, powitanie, ekran ustawień kolejności i widoczności, zapis offline z synchronizacją przez `user_settings` (bez migracji). Szybka notatka przeniesiona do 2.3, imieniny usunięte z całego projektu (decyzje użytkownika). Testy: api 227 OK, web 219 OK; oba audyty czyste. Użytkownik potwierdził działanie. Do planu dopisane poprawki 1.11: usuwanie pojedynczego wpisu z ostatnich wyszukiwań i synchronizacja po kliknięciu. | 1.10 (szybkie dodawanie) — po zgodzie użytkownika. |
| 2026-11-09 | Poprawki 1.11: krzyżyk przy ostatnich wyszukiwaniach, synchronizacja po dotknięciu ikony stanu. Testy: web 223 OK; backend bez zmian. Użytkownik potwierdził działanie. Commit i push za zgodą użytkownika. Kolejność dalej: 1.10, potem zadania z 2.1 (decyzja użytkownika). | 1.10 (szybkie dodawanie) — po ustaleniu zakresu. |
| 2026-11-09 | Część 1 zadań razem z krokiem 1.10: tabele i synchronizacja (tytuł i notatka szyfrowane), widoki, listy, edycja, gesty z „Cofnij” (nowa operacja `restore`), arkusz [+] z polami i parserem, skrót Q, panele nad klawiaturą, przypomnienia, „Zrobione” odhaczające zadanie, sekcje podsumowania, widżet, wyszukiwarka. Naprawione: serwer gubił rejestrację push telefonu, a aplikacja tego nie wykrywała. Do planu dopisany kosz (1.12) i rozpoznawanie `-liczba`/`+liczba` (3.1). Testy: api 247 OK, web 284 OK; migracja na `basemind`. Użytkownik potwierdził gesty i powiadomienia z „Zrobione”. Commit i push za zgodą użytkownika. | Część 2 zadań i termin kosza — po ustaleniu z użytkownikiem. |
| 2026-11-10 | Test w Chrome wykrył fałszywe wylogowania: równoległe żądania gubiły konfigurację z `.env` (Apache na Windows działa wątkami), a pojedynczy 401 kasował dane urządzenia. Naprawione: 401 liczy się dopiero po powtórzeniu, tylko 401 może wylogować przy sprawdzaniu konta, karta nie zapisuje danych po wylogowaniu w innej karcie, lokalnie `ThreadsPerChild 1` i `KeepAlive Off` (przed: 3 z 25 równoległych żądań z błędem 500, po: 0 z 25). Ikony akcji wiersza na komputerze powiększone. W Chrome odtworzone dane lokalne (usunięty kursor); potwierdzone: wyszukiwanie, listy, skrót Q, „Cofnij”. Testy: web 292 OK, api 247 OK (backend bez zmian od ostatniego uruchomienia). | Część 2 zadań i termin kosza — po ustaleniu z użytkownikiem. |
| 2026-11-10 | Koniec sesji na prośbę użytkownika: kod wypchnięty (`ec5393b`), dokumentacja przygotowana do wznowienia (nieaktualne zapisy poprawione, polecenia startu serwerów, procedura naprawy danych lokalnych). Serwery i harmonogram zatrzymane. | „Pytania na start”, potem część 2 zadań — po zgodzie użytkownika. |
| 2026-11-14 | Krótka sesja bez kodu: przypomnienie stanu projektu, ponownie zadane „Pytania na start” (bez odpowiedzi, zostają na następną sesję). Serwery nie były uruchamiane, audyty i testy nie były sprawdzane (zrobić na starcie następnej sesji). Commit i push za zgodą użytkownika. | „Pytania na start”, potem część 2 zadań — po zgodzie użytkownika. |
| 2026-11-14 | Do planu dopisany moduł 5.2 „Trener: godziny i wynagrodzenie” (zgłoszenie użytkownika): treningi ze stałego grafiku z wyjątkami, mecze, turnieje, organizacja turnieju, wyjazdy, zwrot paliwa, stawka na godzinę, podsumowania miesięczne i roczne, kalkulator brutto → netto dla zlecenia. Kolejność: zaraz po grafiku pracy (5.1); dalsze kroki Etapu 5 przesunięte na 5.3–5.5. Model danych w `projekt.md`, pkt 4.4. | „Pytania na start”, potem część 2 zadań — po zgodzie użytkownika. |
| 2026-11-14 | Odpowiedzi użytkownika: część 2 zadań, potem kosz, sortowanie przeciąganiem odłożone; telefon po „Odśwież” ma te same zadania co komputer; `+liczba` = wpływ; zostajemy przy PHPUnit. Larastan 3.15 (poziom 5, `parseModelCastsMethod`): z 41 uwag 0, bez wyciszeń i bez prawdziwych błędów w działaniu; dodane interfejsy `SpaceScoped` i `SyncableModel` (wymuszone typami w `SyncService` i `SpaceItemPolicy`), klasa `SpaceMember`, test rejestru synchronizacji. Playwright 1.65: 7 scenariuszy e2e (logowanie, ciasteczko sesji, start offline, odmowa wylogowania offline, zakończenie sesji drugiego urządzenia) na osobnym serwerze i bazie `basemind_e2e`; baza `basemind` nietknięta (sprawdzone). Testy: api 248 OK, web 292 OK, e2e 7 OK; Larastan, Pint, ESLint, Prettier, `tsc` czyste. Decyzje techniczne z pkt 2 nadal czekają na potwierdzenie. Commity `14287ca`, `bd421fb` i push za zgodą użytkownika. | Potwierdzenie decyzji technicznych, potem część 2 zadań — po ustaleniu zakresu z użytkownikiem. |
| 2026-11-14 | Użytkownik potwierdził wszystkie decyzje techniczne Claude oznaczone „do oceny użytkownika” (po wyjaśnieniu, że nie są przerostem; jedyną zbędną biblioteką jest `react-day-picker`, zostaje). Rejestr w `projekt.md`, pkt 13, zaktualizowany; brak otwartych „Pytań na start”. | Część 2 zadań — po ustaleniu zakresu i kolejności z użytkownikiem. |
| 2026-11-14 | Część 2 zadań: kolejność ustalona z użytkownikiem (podzadania z Markdown, cykliczność z resztą parsera, kanały powiadomień; tagi zadań do 2.3). Podzadania i notatka w Markdown: migracja `tasks.parent_id` (wykonana na `basemind`, dane nietknięte), reguła `ParentTask`, 409 dla „Zrobione” przy otwartych podzadaniach, pytanie przy odhaczaniu, usuwanie z rodzicem, licznik postępu, podgląd Markdown bez HTML i obrazków. Test e2e wykrył, że przejścia rodzic ↔ podzadanie dokładały wpisy historii (zamknięcie wracało do poprzedniego zadania): teraz `replace`. Powiadomienia „nie działały”, bo harmonogram nie był uruchomiony; po uruchomieniu (za zgodą użytkownika) przyszły, a „Zrobione” przy otwartych podzadaniach otworzyło aplikację z pytaniem (potwierdzone na telefonie). Testy: api 255 OK, web 301 OK, e2e 9 OK; Larastan, Pint, ESLint, Prettier, `tsc` czyste. Commit `fd916b1` i push za zgodą użytkownika. Koniec sesji na prośbę użytkownika: dokumentacja przygotowana do wznowienia (pytania o cykliczność w „Pytaniach na start”), MariaDB, Apache i harmonogram zatrzymane. | Cykliczność zadań razem z resztą parsera — po ustaleniu szczegółów z użytkownikiem. |
| 2026-11-14 | Cykliczność zadań i reszta parsera według odpowiedzi użytkownika (decyzje w `projekt.md`, pkt 13). Serwer: migracja kolumn cykliczności (wykonana na `basemind`, tylko dodanie kolumn), reguła `TaskRecurrence` (bez `COUNT`/`DTSTART`, `UNTIL` jako data), serwis `TaskSeries`, „Zrobione” na powiadomieniu przesuwa serię. Aplikacja: paczka `rrule` 2.8.1, logika serii z „Cofnij”, edytor „Powtarzaj”, „Pomiń to wystąpienie”, ikona i opis w wierszu, pominięte w „Ukończonych”. 23 wspólne przypadki dają ten sam wynik w PHP i JS. Parser: powtarzanie, godziny, daty, `#lista`, przypomnienie. Przy okazji: pole podzadania czyści się od razu (szybko wpisane drugie podzadanie znikało; wykryte niestabilnym testem e2e). Testy: api 292 OK, web 413 OK, e2e 12 OK; Larastan, Pint, ESLint, Prettier, `tsc` czyste. Brak testu na telefonie. Commity `e6a3b79`, `3d72c77`, `87c602a`. | Test na telefonie, potwierdzenie dwóch decyzji, potem kanały powiadomień dla typu. |
| 2026-11-14 | Koniec sesji na prośbę użytkownika: test na telefonie przełożony na następną sesję (przypomnieć na samym początku), dokumentacja przygotowana do wznowienia, push za zgodą użytkownika. MariaDB zatrzymana; Apache i harmonogram nie były uruchamiane. | Test cykliczności na telefonie, potwierdzenie dwóch decyzji, potem kanały powiadomień dla typu. |
| 2026-11-15 | Test cykliczności na telefonie zaliczony; dwie decyzje Claude potwierdzone. Powiadomienie push bez stałej treści „Przypomnienie z BaseMind” (sam tytuł; mail z samym tytułem w treści); wariant z terminem i listą zapisany w „Otwartych sprawach”. Kanały powiadomień dla typu: `config/notifications.php`, `UserSettings::allowsChannel`, walidacja typów, zapis bez `types` zachowuje typy; w aplikacji rejestr `notificationTypes.ts` i sekcja „Według typu”; zadania domyślnie tylko telefon. Potwierdzone na telefonie. Testy: api 297 OK, web 413 OK, e2e 13 OK; Larastan, Pint, ESLint, `tsc` czyste. Commit i push za zgodą użytkownika. Część 2 zadań zamknięta. | Kosz (1.12) — po ustaleniu szczegółów z użytkownikiem. |
| 2026-11-15 | Kosz (1.12) według propozycji zaakceptowanej przez użytkownika: migracja `add_trash_support` (wykonana na `basemind`, tylko dodanie kolumny i tabeli), operacja `purge`, serwis `Trash`, codzienne czyszczenie po 30 dniach, informacje o usunięciu przez rok z pełnym pobraniem dla starszych urządzeń; w aplikacji ekran „Kosz”, rejestr źródeł, `deleted_with_parent` zamiast listy w pamięci, listy zostawiają zadaniom `list_id`. Po uwagach użytkownika: kosz tylko w „Więcej” (nie w Ustawieniach); w arkuszu [+] pole „Lista” (domyślnie otwarta lista, `#lista` w tekście, wybór ręczny wygrywa), ten sam komponent w oknie zadania. Testy e2e trafiały na limit 30 logowań/min z jednego adresu: limity konfigurowalne (`config/basemind.php`), podniesione tylko na serwerze e2e. Potwierdzone na telefonie. Testy: api 308 OK, web 428 OK, e2e 16 OK; Larastan, Pint, ESLint, Prettier, `tsc` czyste. Commit i push za zgodą użytkownika. | Kalendarz (2.2) — po ustaleniu zakresu z użytkownikiem. |
| 2026-11-15 | Koniec sesji na prośbę użytkownika: dokumentacja przygotowana do wznowienia (pytania o zakres kalendarza w „Pytaniach na start”, lista kontrolna dla nowych modułów w „Otwartych sprawach”), push za zgodą użytkownika. MariaDB, Apache i harmonogram zatrzymane. | Kalendarz (2.2) — najpierw propozycja zakresu i decyzje użytkownika. |
| 2026-11-15 | Sesja bez kodu: propozycja kalendarza (2.2) zaakceptowana z uwagami użytkownika. Dwie części (1: wydarzenia, Agenda + Miesiąc, warstwy zadań i świąt, przypomnienia, widżet, podsumowanie, arkusz [+]; 2: Dzień/Tydzień, zmiana pojedynczych wystąpień, przeciąganie, duplikowanie). Przypomnienie domyślne 1 dzień przed, zawsze o 7:00; zadania bez godziny od 7:00 zamiast 9:00; dotknięcie powiadomienia otwiera wydarzenie lub zadanie. Serwery nie były uruchamiane. | Część 1 kalendarza — kolejność pracy po zgodzie użytkownika. |
| 2026-11-15/16 | Kalendarz (2.2), część 1, kroki 1–4 (kolejność zaakceptowana przez użytkownika). **1:** wspólna reguła godziny przypomnień (`ReminderMoment` / `reminder-moment.ts`, 11 wspólnych przypadków): bez godziny od 7:00, „dzień wcześniej” zawsze o 7:00; etykieta „Dzień wcześniej, 7:00”; dotknięcie powiadomienia otwiera samo zadanie (`Reminder::appPath`, `openAppAt`); przeliczanie zaplanowanych przypomnień okazało się zbędne (jedyne nie podlegało zmianie). **2:** encja `events` (migracja wykonana na `basemind`, tylko nowa tabela), szyfrowanie tytułu, miejsca i notatki, reguła `EventSpan`, wyszukiwanie, kosz. **3:** wystąpienia serii i przypomnienia o wydarzeniach po obu stronach (`EventSeries` / `series.ts`, 21 wspólnych przypadków), przejście na następne wystąpienie po wysłaniu, typ „Wydarzenia” w kanałach, przycisk „OK”. **4:** okno wydarzenia według zaakceptowanego szkicu, tymczasowa lista na ekranie „Kalendarz”, wspólny `MarkdownField`; po uwagach użytkownika: kilka przypomnień na wydarzenie, dla całodniowych 2/3 dni, tydzień i miesiąc (30 dni) wcześniej, nowa paleta (różowy → szary, morski → turkusowy). Testy: api 371 OK, web 476 OK, e2e 19 OK; Larastan, Pint, ESLint, Prettier, `tsc` czyste. Commity `a8e8611`, `2a30782`, `ad485eb`, `2f4759e`, `050d472` i push za zgodą użytkownika. Test na telefonie rozpoczęty przez użytkownika, wynik nieznany. Koniec sesji na prośbę użytkownika: dokumentacja przygotowana do wznowienia; MariaDB, Apache i harmonogram zatrzymane. | Wynik testu na telefonie i pytania z „Pytań na start”, potem krok 5 (Agenda i Miesiąc z warstwami). |
| 2026-11-16 | Test kroków 1–4 kalendarza zaliczony; „miesiąc wcześniej” = 30 dni; dwie decyzje Claude potwierdzone. Czerwony trójkąt synchronizacji: wydarzenie w starym kolorze `pink` utworzone tuż przed zmianą palety zostało odrzucone (`invalid`); naprawa: jednorazowa poprawka danych lokalnych (`SCHEMA_UPGRADES`, wersja 7: `pink`→`gray`, `teal`→`cyan`, ponowne wysłanie), log odrzuceń na serwerze, zasada w `projekt.md`, pkt 15; sprawdzone na telefonie. Przypomnienie „Własne…” przy wydarzeniach i zadaniach z własną godziną dla dni i tygodni (migracja `remind_time` wykonana na `basemind`, 5 nowych wspólnych przypadków reguły godziny, test e2e); sprawdzone na telefonie. PHPUnit 379, Vitest 492, e2e 19 OK. | Krok 5 kalendarza: widoki Agenda i Miesiąc (najpierw szkic). |
| 2026-11-16 (druga sesja) | Przypomnienie „Własne…” w zadaniu bez godziny także „w dniu terminu o godzinie” (wariant B; `fitTaskTiming`), sprawdzone na telefonie. Krok 5 kalendarza według zaakceptowanego szkicu: widoki Agenda i Miesiąc, warstwy (wydarzenia, zadania, polskie święta), sekcja „Zaległe”, odhaczanie z „Cofnij”, ustawienia `calendar` w `user_settings`; tymczasowa lista usunięta. PHPUnit 381, Vitest 505, e2e 20 OK; Larastan, Pint, ESLint, `tsc` czyste. Commity i push za zgodą użytkownika. MariaDB, Apache i harmonogram uruchomione przez Claude. | Krok 6 kalendarza (widżet, podsumowanie, arkusz [+]). |
