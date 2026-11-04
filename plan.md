# BaseMind — plan prac

> **Jak korzystać z tego pliku (także po wyczyszczeniu kontekstu):**
> 1. Przeczytaj `projekt.md` (wizja, ustalenia, architektura, model danych, bezpieczeństwo, zasady współpracy).
> 2. Sprawdź sekcję **„Stan bieżący”** poniżej — na czym skończyliśmy i co jest następne.
> 3. Przejrzyj **„Dziennik zmian”** na końcu pliku.
> 4. **Nic nie rób bez akceptacji użytkownika** — zaproponuj kolejny krok i zapytaj.
> 5. Po każdej sesji: odhacz zrobione punkty (`[x]`), zaktualizuj „Stan bieżący” i dopisz wpis do „Dziennika zmian”.
>
> Legenda: `[ ]` do zrobienia · `[~]` w trakcie · `[x]` zrobione · `[-]` porzucone (z uzasadnieniem) · 🔒 wymaga decyzji użytkownika

---

## Stan bieżący (ostatnia sesja: 2026-11-04)

- **Faza:** Etap 0 — decyzje zatwierdzone (0.1), środowisko gotowe (0.2), **backend i frontend `web/` gotowe, test na Samsungu S25 Ultra zaakceptowany przez użytkownika** (0.3). Design system (0.4) zaakceptowany na telefonie. **Etap 0 zamknięty, w toku Etap 1** (zaczynamy od 1.1).
- **Repozytorium:** lokalnie `C:\Users\Praca\Documents\Kodowanie\BaseMind`, gałąź `main`, zdalne `origin` = https://github.com/mwojcik7/BaseMind.git. Autor commitów: Marcin Wójcik <mgrnewsl@gmail.com>.
- **Zrobione:** dokumentacja; Laravel 13.40 w `api/` (MySQL, Sanctum, utwardzenie PHP/Apache, kontrola luk PHP, nagłówki, `/api/health`, 21 testów OK); Apache VirtualHost `127.0.0.1:8080` → `api/public`; testy HTTP reguł dostępu (brak wycieku plików).
- **Zrobione w `web/`:** React 19 + Vite 8 + TS 6, Tailwind v4, shadcn/ui, TanStack Router, PWA (`injectManifest`), Inter, tryb jasny/ciemny wg systemu, ekrany szkieletowe, ESLint + Prettier + Vitest. Laravel serwuje powłokę PWA z CSP. Sprawdzone w Chrome z emulacją Pixel 7: brak błędów CSP, Service Worker aktywny, aplikacja działa offline.
- **Czeka na użytkownika:** zgoda na start kroku 1.2 (szyfrowanie). Krok 1.1 zamknięty.
- **Uwaga:** ta sama instalacja MariaDB trzyma bazy innego projektu użytkownika (np. `syslead_test`). Nie używać `migrate:fresh` na bazie `basemind` ani poleceń obejmujących cały serwer; testy działają na `basemind_test`.
- **Uwaga:** MariaDB/Apache uruchamia użytkownik (panel XAMPP). Claude uruchamia je tylko na czas pracy (testy, migracje) i zatrzymuje.

### ▶ Wznowienie pracy — od czego zacząć następną sesję
1. Przeczytać `projekt.md` (szczególnie pkt 0, 3, 8, 14 „Konfiguracja poza repozytorium”, 15 „Pułapki”) i ten plik.
2. Szybko sprawdzić stan: `git status`, `git log --oneline -5`, czy XAMPP (Apache + MySQL) działa → `http://localhost:8080/api/health` zwraca `{"status":"ok",...}`; testy: `cd api && php artisan test` (wymaga działającej MariaDB).
3. Przed uruchomieniem testów upewnić się, że `composer audit` jest czysty.
4. **Test na telefonie przez USB** (instrukcja w `README.md`): do sprawdzania PWA używać builda, czyli port `8080 → localhost:8080` i na telefonie `http://localhost:8080`. Telefon użytkownika: Samsung S25 Ultra.
5. Dalej: 0.4 design system → pokaz użytkownikowi → Etap 1.
6. Po sesji: zaktualizować ten plik („Stan bieżący”, checklisty, „Dziennik zmian”), commit i `git push`.

---

## Przegląd etapów

| Etap | Nazwa | Zakres | Status |
|---|---|---|---|
| 0 | Przygotowanie | Decyzje, środowisko, szkielet (Laravel + React PWA), design system | ✅ |
| 1 | Fundament | Auth, przestrzenie, szyfrowanie, PWA, offline + sync, nawigacja, wyszukiwanie, tagi/powiązania, przypomnienia, dashboard (szkielet) | 🟡 w trakcie |
| 2 | Codzienność | Zadania, kalendarz, notatki Markdown z backlinkami, szybka notatka | ⬜ |
| 3 | Pieniądze | Finanse (portfele, kategorie, transakcje, raporty, wykresy, budżety), subskrypcje | ⬜ |
| 4 | Schowek | Zakładki z podglądem (rich links) + Share Target, listy mediów, baza kodów | ⬜ |
| 5 | Życie | Grafik pracy, nawyki, CRM bliskich, bank prezentów | ⬜ |
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
- [~] Pakiety: **Sanctum 4.3 zainstalowany** (`php artisan install:api` nie potrafił wywołać Composera na Windows — zainstalowany ręcznie `composer require laravel/sanctum` + `vendor:publish`), `statefulApi()` włączone. Pint jest w szkielecie. Do zrobienia: Fortify (Etap 1.1), `minishlink/web-push` (Etap 1.8), Pest + Larastan.
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
- [~] ESLint + Prettier + `tsc` + Vitest (web) — zrobione, 79 testów OK. Pint jest; Larastan i Pest (api) — do zrobienia (testy api na razie w PHPUnit, 70 OK).
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
- [ ] Serwis `Crypto` (libsodium): secretbox dla pól, secretstream dla plików, identyfikator klucza w szyfrogramie.
- [ ] Casty Eloquent: `SodiumEncrypted`, `SodiumEncryptedJson`.
- [ ] Komenda `php artisan basemind:key` (generowanie `SODIUM_KEY`) + instrukcja bezpiecznej kopii klucza.
- [ ] Komenda rotacji klucza (przeszyfrowanie danych).
- [ ] Testy: zapis → w bazie szyfrogram, odczyt → tekst jawny; zły klucz → błąd.

### 1.3 Warstwa danych offline (klient)
- [ ] Dexie: schemat, wersjonowanie, tabele `outbox`, `meta` (kursor sync, user).
- [ ] Generyczne repozytorium encji (`create/update/softDelete/get/list`) → Dexie + outbox, pola wspólne (UUIDv7, space_id, timestamps, version).
- [ ] Hooki React (`useLiveQuery`).
- [ ] Czyszczenie danych przy wylogowaniu.

### 1.4 Synchronizacja
- [ ] Rejestr encji sync w Laravelu (model, reguły walidacji, policy, pola dozwolone).
- [ ] `POST /api/sync/push` — partie, walidacja, uprawnienia, wersje, LWW per pole, kopie konfliktów notatek, idempotentność (`sync_ops`).
- [ ] `GET /api/sync/pull?cursor=` — stronicowanie, nagrobki, odszyfrowanie pól 🔐.
- [ ] Globalny licznik `rev` (`sync_counter`, atomowo w transakcji).
- [ ] Klient: silnik sync (start, `online`, debounce, interwał, Background Sync w SW).
- [ ] Wskaźnik stanu sync w UI.
- [ ] Testy: zapis offline → sync → widoczne w drugiej przeglądarce; konflikt dwóch edycji; ponowne wysłanie tej samej partii.

### 1.5 PWA
- [ ] Manifest: ikony (192, 512, maskable), `shortcuts`, kolory, `standalone`.
- [ ] Service Worker (`injectManifest`): precache, cache obrazów, fallback offline.
- [ ] Baner instalacji (Android) + instrukcja iOS.
- [ ] Meta tagi iOS, apple-touch-icon, splash.
- [ ] Aktualizacja aplikacji („Nowa wersja — odśwież”).
- [ ] Test instalacji na telefonie (USB).

### 1.6 Tagi i powiązania
- [ ] Migracje i sync: `tags`, `entity_tags`, `entity_links`.
- [ ] Komponent wyboru tagów; komponent „Powiązania” (linki wychodzące + backlinki, dodawanie ręczne).
- [ ] Parser treści `[[tytuł]]`, `@osoba`, `#tag` → `entity_links` (`origin=parsed`).

### 1.7 Globalne wyszukiwanie
- [ ] Worker MiniSearch: indeks wszystkich encji z Dexie, aktualizacja przy zmianach.
- [ ] Normalizacja polskich znaków, wyszukiwanie prefiksowe i rozmyte.
- [ ] UI: pasek u góry (mobile — pełnoekranowe wyniki), `Ctrl+K` (desktop), wyniki pogrupowane po modułach, ostatnie wyszukiwania.
- [ ] Rejestr: każdy moduł deklaruje pola indeksowane, ikonę i widok wyniku.

### 1.8 Przypomnienia i powiadomienia
- [ ] Migracje: `reminders`, `push_subscriptions`, `jobs`, `failed_jobs`.
- [ ] Klucze VAPID (komenda), endpoint subskrypcji push, ekran zgody na powiadomienia (w odpowiednim momencie).
- [ ] Scheduler (`routes/console.php`): co minutę — wybór przypomnień do wysłania, cykliczne i „X dni przed”; `queue:work --stop-when-empty`.
- [ ] Wysyłka push (web-push) z akcjami („Zrobione”, „Odłóż”) + obsługa w SW; usuwanie wygasłych subskrypcji (410).
- [ ] Wysyłka e-mail (Laravel Mail, szablony; lokalnie Mailpit).
- [ ] Ustawienia: kanały per typ, godziny ciszy.
- [ ] 🔒 Daily digest (godzina, zawartość).
- [ ] Badging API.
- [ ] Lokalnie: `php artisan schedule:work`; produkcyjnie: instrukcja crona.

### 1.9 Dashboard „Dziś” (szkielet)
- [ ] System widżetów (rejestr, kolejność i widoczność w ustawieniach).
- [ ] Widżet powitania (data, imieniny — opcjonalnie).
- [ ] Widżet „Szybka notatka”.

### 1.10 Szybkie dodawanie [+]
- [ ] Bottom sheet z wyborem typu (rozszerzany w kolejnych etapach).
- [ ] Szkielet parsera tekstu (reguły dodawane przez moduły).

---

## Etap 2 — Codzienność

### 2.1 Zadania (Todo)
- [ ] Encje `task_lists`, `tasks` (+ sync, wyszukiwanie, powiązania).
- [ ] Widoki: Dziś, Nadchodzące, Zaległe, Listy, Ukończone.
- [ ] Priorytety P1–P4, termin (data + opcjonalnie godzina), podzadania, notatka Markdown.
- [ ] Cykliczność (rrule; „od terminu” vs „od ukończenia”).
- [ ] Przypomnienia.
- [ ] Swipe: odhacz / na jutro / usuń; sortowanie przeciąganiem.
- [ ] Parser języka naturalnego (pl): „jutro”, „w piątek”, „co tydzień”, „!1”.
- [ ] Widżet dashboardu: dziś + zaległe.

### 2.2 Kalendarz
- [ ] Encja `events` (rrule, przypomnienia).
- [ ] Widoki: Agenda (domyślny mobile), Dzień, Tydzień, Miesiąc.
- [ ] Agregator „dostawców dat” z filtrem warstw (zadania; kolejne moduły dopisują się później).
- [ ] Polskie święta ustawowe.
- [ ] Widżet dashboardu: dziś i jutro.
- [ ] (Później, 🔒) eksport iCal.

### 2.3 Notatki Markdown z backlinkami
- [ ] Encje `notes` (content 🔐), `note_folders`.
- [ ] Edytor CodeMirror 6 z paskiem narzędzi nad klawiaturą, tryb podglądu.
- [ ] Autouzupełnianie `[[`, `@`, `#`.
- [ ] Panel backlinków; tworzenie notatki z nieistniejącego `[[linku]]`.
- [ ] Przypinanie, foldery, archiwum.
- [ ] Kopia konfliktu przy sync.
- [ ] Szybka notatka z dashboardu → „Inbox”.
- [ ] (Opcjonalnie) graf powiązań, notatki dzienne.

---

## Etap 3 — Pieniądze

### 3.1 Manager finansów
- [ ] Encje `wallets`, `categories`, `transactions`, `budgets`.
- [ ] Domyślne kategorie PL (edytowalne).
- [ ] Portfele z saldem, przelewy między portfelami.
- [ ] **Szybkie dodawanie** (priorytet UX): duża klawiatura kwoty → kategoria (ostatnio używane) → zapisz; parser `-45 paliwo karta`.
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

### 5.2 Strażnik nawyków
- [ ] Encje `habits`, `habit_logs`.
- [ ] Odhaczanie dnia (także wartości liczbowe), harmonogramy, seria, heatmapa, statystyki.
- [ ] Przypomnienia; widżet dashboardu.

### 5.3 CRM bliskich
- [ ] Encja `contacts` (pola 🔐 wg `projekt.md`), zawsze w przestrzeni prywatnej.
- [ ] Profil: zdjęcie, relacja, urodziny, imieniny, rozmiary, lubi/nie lubi, jedzenie, alkohole, alergie, rodzina i zwierzęta, ważne daty, notatki.
- [ ] Urodziny/imieniny w kalendarzu + przypomnienia.
- [ ] Wzmianki `@osoba` → backlinki na profilu.
- [ ] Widżet: nadchodzące urodziny/imieniny.

### 5.4 Bank pomysłów na prezenty
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
