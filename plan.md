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

**Najpierw**
1. **Krok 1.8:** czy zaczynamy przypomnienia i powiadomienia? Do ustalenia godzina i zawartość porannego digestu (`projekt.md`, pkt 12) oraz co zbudować teraz, skoro moduły jeszcze nie istnieją (tak jak przy 1.6 i 1.7).

**Starsze, bez odpowiedzi (nie blokują 1.8)**
2. **Decyzje techniczne Claude „do oceny użytkownika”:** TypeScript 6 zamiast 7, pakiet `cn`, trasy TanStack Router w kodzie, CSP ze stylami inline, biblioteki UI (`sonner`, `react-day-picker`, `tw-animate-css`, własny arkusz), hasło min. 10 znaków i liczbowe `users.id`, szczegóły szyfrowania z kroku 1.2 (podklucze, identyfikator klucza, dwie komendy rotacji, `basemind:key` bez wypisywania klucza). Szczegóły: `projekt.md`, pkt 13.
3. **Testy API:** zostajemy przy PHPUnit czy przechodzimy na Pest, jak zakładał plan? Czy wdrażamy Larastan?
4. **Testy e2e:** czy dodać Playwright i stałe scenariusze (lista w „Otwarte sprawy” → „Dług techniczny”)?

---

## Stan bieżący (ostatnia sesja: 2026-11-09)

- **Faza:** Etap 0 zamknięty. **Etap 1 w toku: kroki 1.1 (konta, logowanie, przestrzenie), 1.2 (szyfrowanie), 1.3 (warstwa danych offline), 1.4 (synchronizacja), 1.5 (PWA), 1.6 (tagi i powiązania: dane i synchronizacja) i 1.7 (wyszukiwanie) zrobione. Następny jest krok 1.8 (przypomnienia), jeszcze nie zaczęty.**
- **Repozytorium:** lokalnie `C:\Users\Praca\Documents\Kodowanie\BaseMind`, gałąź `main`, zdalne `origin` = https://github.com/mwojcik7/BaseMind.git. Autor commitów: Marcin Wójcik <mgrnewsl@gmail.com>. Cała praca, łącznie z krokiem 1.7, jest wypchnięta.
- **Backend (`api/`):** Laravel 13.40, Sanctum + Fortify (`/api/auth`), utwardzenie PHP/Apache, kontrola luk PHP, nagłówki z CSP, powłoka PWA serwowana przez Laravela, przestrzenie i uprawnienia, ekran sesji, szyfrowanie libsodium (serwis `Crypto`, casty, komendy klucza), synchronizacja (`SyncService`, `config/sync.php`, trait `Syncable`, makro `$table->syncable()`), tagi i powiązania. 173 testy OK.
- **Frontend (`web/`):** React 19, Vite 8, TS 6, Tailwind v4, shadcn/ui, TanStack Router, PWA działająca offline, design system (podgląd: `/design`), wybór motywu, logowanie i rejestracja, sesje i urządzenia, lokalna baza Dexie z repozytorium encji (`web/src/db/`), silnik synchronizacji ze wskaźnikiem stanu (`web/src/sync/`), instalacja i aktualizacje PWA (`web/src/lib/pwa.ts`, `PwaBanner`), repozytoria tagów i powiązań (`web/src/db/tags.ts`), globalne wyszukiwanie (`web/src/search/`, `SearchDialog`). 177 testów OK.
- **Dane lokalne:** w bazie `basemind` jest **prawdziwe konto użytkownika**, założone przez niego na telefonie. Nie usuwać go i nie czyścić tej bazy.
- **Klucz szyfrowania:** lokalny `SODIUM_KEY` (identyfikator `2ca17bb1`) jest w `api/.env`, a użytkownik ma jego kopię w menedżerze haseł. Nic jeszcze nim nie zaszyfrowano. Produkcja dostanie własny klucz.
- **Czeka na użytkownika:** zgoda na krok 1.8 i odpowiedzi na pozostałe „Pytania na start” (wyżej).
- **Uwaga:** ta sama instalacja MariaDB trzyma bazy innego projektu użytkownika (np. `syslead_test`). Nie używać `migrate:fresh` na bazie `basemind` ani poleceń obejmujących cały serwer; testy działają na `basemind_test`.
- **Uwaga:** MariaDB/Apache uruchamia użytkownik (panel XAMPP). Claude uruchamia je tylko na czas pracy (testy, migracje) i zatrzymuje. Przed uruchomieniem sprawdzić, czy już nie działają. W chwili zakończenia sesji są zatrzymane.

### ▶ Wznowienie pracy — od czego zacząć następną sesję
1. Przeczytać `projekt.md` (szczególnie pkt 0, 3, 8, 13 „Rejestr decyzji”, 14 „Konfiguracja poza repozytorium”, 15 „Pułapki”) i ten plik.
2. Sprawdzić stan: `git status`, `git log --oneline -5`, `composer audit` w `api/` (nowe poprawki bezpieczeństwa pojawiają się często; Symfony miało je już 2026-11-04) i `pnpm audit --prod` w `web/`.
3. Uruchomić Apache i MariaDB (panel XAMPP lub poleceniami). Sprawdzić `http://localhost:8080/api/health`, testy `cd api && php artisan test` oraz `cd web && pnpm test`.
4. Powiedzieć użytkownikowi, na czym skończyliśmy, i **zadać „Pytania na start”** (na górze pliku), w tym o zgodę na krok 1.8. Przy okazji przypomnieć o sprawach z listy „Otwarte sprawy” poniżej.
5. **Krok 1.8 (przypomnienia):** szczegóły w sekcji 1.8 poniżej i w `projekt.md`, pkt 4.3. Na stronie `/design` jest lista prawdziwych tagów do testów na żywo między urządzeniami.
6. **Test na telefonie przez USB** (instrukcja w `README.md`): do sprawdzania PWA używać builda, czyli port `8080 → localhost:8080` i na telefonie `http://localhost:8080`. Telefon użytkownika: Samsung S25 Ultra, debugowanie USB już włączone. Jeśli logowanie zgłasza brak połączenia, najpierw sprawdzić `http://localhost:8080/api/health` na telefonie (`projekt.md`, pkt 15). Do testu offline odłączyć kabel: tryb samolotowy nie przerywa przekierowania portu przez USB.
7. Po sesji: zaktualizować ten plik („Stan bieżący”, checklisty, „Dziennik zmian”) i rejestr decyzji w `projekt.md`, a po zgodzie zrobić commit i `git push`.

### Otwarte sprawy (nic z tego nie blokuje kroku 1.8)
**Do wiadomości lub decyzji użytkownika**
- Decyzje techniczne Claude z rejestru w `projekt.md` oznaczone „do oceny użytkownika”, jeszcze niepotwierdzone: TypeScript 6 zamiast 7, pakiet `cn`, trasy TanStack Router w kodzie, CSP ze stylami inline, biblioteki UI (`sonner`, `react-day-picker`, `tw-animate-css`, własny arkusz), hasło min. 10 znaków i liczbowe `users.id`, szczegóły szyfrowania z kroku 1.2.
- Kod rejestracji jest w `api/.env`. Przed wdrożeniem ustawić długi kod na produkcji, a po założeniu kont zostawić go pustym.

**Dług techniczny**
- Pest i Larastan z planu nie są wdrożone (testy w PHPUnit). Do decyzji, czy przechodzić na Pest, czy zostać przy PHPUnit.
- Playwright (e2e) ze specyfikacji nie jest w repozytorium. Dotychczasowe sprawdzenia w Chrome były jednorazowymi skryptami, których nie ma w repo. Warto dodać je jako stałe testy, scenariusze: gość trafia na logowanie; błędne logowanie; błędny i poprawny kod zaproszenia; ciasteczko sesji `HttpOnly` i `SameSite=Lax`; start offline z zapamiętanym kontem; odmowa wylogowania offline; unieważnienie sesji drugiego urządzenia; reset hasła z linku w mailu; motyw przed pierwszym renderem; ściąganie arkusza i przesuwanie wiersza.
- Reguły `.htaccess` w trybie awaryjnym (docroot = cały `api/`) po dodaniu PWA nie zostały sprawdzone (punkt w 0.3).
- `pnpm audit` zgłasza 3 luki tylko w narzędziach deweloperskich (`glob`, `minimatch`, `deepmerge`): 2 umiarkowane, 1 niską; w paczkach produkcyjnych brak. Sprawdzać przy aktualizacjach.
- Paczka startowa ma ok. 180 kB (gzip): sprawdzić przy audycie wydajności w Etapie 7.
- Tabela `sync_ops` rośnie i nic jej nie czyści: dodać do harmonogramu usuwanie wpisów starszych niż np. 90 dni.
- Zmiany odrzucone przez serwer zostają w `outbox` i są tylko liczone we wskaźniku: brak ekranu do ich przeglądania i usuwania.
- Synchronizacja przy dołączeniu do przestrzeni wspólnej: starsze rekordy mają `rev` poniżej kursora, więc nowy członek ich nie pobierze. Rozwiązać razem ze współdzieleniem (Etap 7).

**Czekają na swoje kroki**
- Background Sync: nadal niesprawdzony na żywo (przesyłanie rekordów między urządzeniami już tak).
- Przycisk [+] jest na razie informacyjny: właściwa wersja w 1.10.
- Maile lokalnie trafiają do `api/storage/logs/laravel.log`: prawdziwa wysyłka SMTP do sprawdzenia przy wdrożeniu.
- Usunąć stronę `/design` przed wdrożeniem (Etap 7).
- Śledzić CVE-2026-115560 w PHP (`projekt.md`, pkt 8.1) i `max_allowed_packet` przy synchronizacji (0.2).

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
- [~] ESLint + Prettier + `tsc` + Vitest (web) — zrobione, 177 testów OK. Pint jest; Larastan i Pest (api) — do zrobienia (testy api na razie w PHPUnit, 173 OK).
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
| 2026-11-05 | Koniec sesji na prośbę użytkownika: dokumentacja przygotowana do wznowienia (stan, lista otwartych spraw, konfiguracja poza repozytorium). Kod bez zmian. Serwery zatrzymane. | 1.2 (szyfrowanie) — po zgodzie użytkownika. |
| 2026-11-05 | Krok 1.2: serwis `Crypto`, casty `SodiumEncrypted` i `SodiumEncryptedJson`, komendy `basemind:key` i `basemind:reencrypt`, lokalny `SODIUM_KEY`. Testy: api 141 OK, web 79 OK (bez zmian), oba audyty czyste; plik 50 MB odszyfrowany identycznie. Rotacja plików odłożona do 6.5. Commit i push za zgodą użytkownika. | Kopia klucza w menedżerze haseł, potem 1.3 — po zgodzie użytkownika. |
| 2026-11-05 | Koniec sesji na prośbę użytkownika: pytania bez odpowiedzi zapisane w „Pytania na start”, wnioski w `projekt.md`, pkt 15. Kod bez zmian. Serwery zatrzymane. Commit i push za zgodą użytkownika. | „Pytania na start”, potem 1.3 — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.3: Dexie (`outbox`, `meta`), repozytorium encji, hooki, konto w Dexie, czyszczenie lokalnych danych. Rozstrzygnięte: kopia klucza w menedżerze haseł, ograniczenie `secretbox` zaakceptowane, zakończenie sesji przez serwer kasuje dane urządzenia. Testy: web 99 OK; audyty `pnpm --prod` i `composer` czyste; testów API nie uruchamiano, bo backend bez zmian. Użytkownik potwierdził działanie na telefonie. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.4 (synchronizacja) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.4: push i pull z rejestrem encji, LWW per pole, `sync_ops`, silnik na kliencie, wskaźnik stanu, Background Sync, ostrzeżenie przy wylogowaniu, motyw w `user_settings`. Testy: api 162 OK, web 131 OK; audyt `composer` czysty; migracja `sync_ops` wykonana na `basemind`. Użytkownik potwierdził na telefonie i komputerze: start bez kabla, stan offline, przeniesienie motywu. Korekta: tryb samolotowy nie odcina serwera przy USB. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.5 (PWA) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.5: skróty w manifeście, baner instalacji, instrukcja iOS, aktualizacje na żądanie zamiast automatycznych, sprawdzanie nowej wersji po powrocie do aplikacji. Testy: web 148 OK; backend bez zmian. Użytkownik potwierdził na telefonie instalację, skróty i komunikat o nowej wersji. Ekrany startowe iOS pominięte, cache obrazków przeniesiony do 4.1. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.6 (tagi i powiązania) — po zgodzie użytkownika. |
| 2026-11-09 | Krok 1.6 w ustalonym zakresie: tabele, modele, synchronizacja i tabele lokalne dla tagów i powiązań; lista testowa na `/design`. Testy: api 173 OK, web 151 OK; audyt `composer` czysty; migracja wykonana na `basemind`. Użytkownik potwierdził przesyłanie rekordów między telefonem a komputerem. Zgłoszone opóźnienie: serwer odpowiada w ok. 60 ms, zwłoka wynika z pobierania zmian co 60 s na drugim urządzeniu. Interfejs i parser przeniesione do 2.3. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.7 (wyszukiwanie) — po zgodzie użytkownika. |
| 2026-11-09 | Interwał pobierania zmian zostaje 60 s (decyzja użytkownika). Krok 1.7: indeks MiniSearch w Web Workerze, polskie znaki, literówki i przestawione litery, ekran wyników, ostatnie wyszukiwania, rejestr źródeł (na razie tagi). Testy: web 177 OK; backend bez zmian. Użytkownik potwierdził na telefonie; test wykrył brak tolerancji przestawionych liter, poprawione. Serwery zatrzymane. Commit i push za zgodą użytkownika. | 1.8 (przypomnienia) — po zgodzie użytkownika. |
