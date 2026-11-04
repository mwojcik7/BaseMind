# BaseMind — dokument projektu

> **Cel tego pliku:** jedno źródło prawdy o tym, CZYM jest projekt, co ustaliliśmy i JAK go budujemy.
> Co jest zrobione i co dalej — patrz `plan.md`.
> Po wyczyszczeniu kontekstu: przeczytaj najpierw ten plik, potem `plan.md` (sekcja „Stan bieżący” i „Dziennik zmian”).

---

## 0. Zasady współpracy (bardzo ważne)

- **Niczego nie robimy samodzielnie bez ustalenia z użytkownikiem.** Claude proponuje, użytkownik decyduje. Przed każdym etapem / większą zmianą — pytanie i akceptacja.
- Komunikacja po polsku. Kod, nazwy w kodzie, commity — po angielsku. Interfejs aplikacji — po polsku (z przygotowaniem pod i18n).
- Każda podjęta decyzja trafia do sekcji **„Rejestr decyzji”** (pkt 13) w tym pliku.
- Po każdej sesji pracy aktualizujemy `plan.md` (checklisty + dziennik zmian).
- Użytkownik zna: React, Node.js, PHP, trochę Vue. Kod ma być czytelny, z komentarzami tam, gdzie logika jest nieoczywista (sync, przypomnienia, szyfrowanie).
- Wygląd: Claude proponuje i wdraża, użytkownik ocenia na bieżąco i zgłasza poprawki.

---

## 1. Wizja

**BaseMind** (nazwa finalna) to osobiste „centrum dowodzenia” — aplikacja webowa PWA, która zastępuje kilkanaście osobnych aplikacji: finanse, subskrypcje, zadania, kalendarz, notatki, zakładki, gwarancje, auto, nawyki, bliscy, prezenty i inne. Cel: **nie muszę zaglądać do żadnej innej aplikacji, żeby coś znaleźć lub skontrolować.**

Kluczowe cechy:
1. **Mobile-first, PWA, Android jako priorytet** (instalowalna, pełnoekranowa, udostępnianie do aplikacji, push).
2. **Offline-first** — wszystko działa bez internetu, synchronizuje się po odzyskaniu połączenia.
3. **Wszystko połączone** — każdy element może linkować do każdego (backlinki), wspólne tagi, wspólne przypomnienia, jeden kalendarz agregujący daty ze wszystkich modułów.
4. **Globalne wyszukiwanie** działające offline, błyskawiczne.
5. **Bezpieczeństwo i gotowość na współdzielenie** — na start jeden użytkownik, model danych od pierwszego dnia wspiera wielu użytkowników i współdzielenie; wrażliwe dane szyfrowane w bazie.
6. **Niski koszt utrzymania** — zwykły hosting współdzielony z PHP (bez VPS, bez administrowania serwerem).

---

## 2. Ustalenia z użytkownikiem (wymagania)

| # | Temat | Ustalenie |
|---|---|---|
| U1 | Platforma | Aplikacja webowa PWA, **skupienie na urządzeniach mobilnych**. Desktop ma działać poprawnie, ale projektujemy najpierw pod telefon. |
| U2 | System mobilny | **Głównie Android.** iPhone przygotowany „w tle” (meta tagi, safe-area, push na iOS 16.4+ po instalacji, obejścia braku Share Target). |
| U3 | Użytkownicy | **Na razie tylko jeden użytkownik (właściciel).** Dane od razu bezpieczne i gotowe na udostępnianie/współdzielenie w przyszłości. |
| U4 | Hosting | **Zwykły hosting współdzielony z PHP — NIE VPS** (użytkownik nie chce administrować serwerem i łatać systemu). Wybór konkretnej firmy — przy wdrożeniu. |
| U5 | Rozwój lokalny | **XAMPP** (Apache + PHP + MariaDB) — odwzorowuje typowy hosting. |
| U6 | Offline | **Ma działać offline** (odczyt i zapis), z synchronizacją. |
| U7 | Przypomnienia | **Push w PWA + e-mail.** |
| U8 | Finanse | **Wprowadzanie ręczne. BEZ importu wyciągów bankowych** (nie robimy, nie proponujemy ponownie). |
| U9 | Grafik pracy | Na razie **stałe godziny**, system musi obsługiwać też **pracę zmianową**. |
| U10 | Wygląd | Nowocześnie i minimalistycznie — propozycja Claude (pkt 7), użytkownik oceni po zobaczeniu. |
| U11 | Kolejność etapów | Zaakceptowana kolejność etapów (patrz `plan.md`). |
| U12 | Backend | **PHP + Laravel + MySQL/MariaDB.** |
| U13 | Szyfrowanie | **libsodium po stronie serwera dla wrażliwych pól** (nie pełne E2E). |
| U14 | 2FA | **Na końcu projektu** (Etap 7). |
| U15 | Testy na telefonie | **Przez kabel USB** (Chrome `chrome://inspect` → Port forwarding). |
| U16 | Nazwa | **BaseMind** (finalna). |

### Pełna lista modułów (z pierwotnego zgłoszenia)
1. Manager finansów — kategorie wpływów i wydatków, wiele portfeli/kont, szybkie dodawanie, raporty i wykresy.
2. Agregator subskrypcji — lista subskrypcji, daty pobrania opłat, kwoty, przypomnienia.
3. Todo — priorytety, cykliczność, przypomnienia.
4. Grafik pracy — rejestr godzin, nadgodziny.
5. Kalendarz.
6. Notatki w Markdown.
7. Schowek na linki — rich links (miniatura, tytuł, opis pobierane automatycznie), artykuły i filmy.
8. Strażnik dat ważności.
9. Lokalizator rzeczy rzadko używanych.
10. Paszport pojazdu — historia oleju/napraw/wymian, rozmiar opon, VIN, polisa, przypomnienia o przeglądach.
11. Rejestr sprzętów i gwarancji — zdjęcie paragonu, data zakupu, koniec gwarancji.
12. Strażnik nawyków — odhaczanie codziennych rytuałów.
13. CRM dla bliskich — rozmiary ubrań, ulubione alkohole/potrawy, czego nie lubią, imiona dzieci/zwierząt.
14. Bank pomysłów na prezenty.
15. Udostępnianie pliku przez publiczny link ważny przez krótki czas.
16. Baza kodów i szybkich danych.
17. Listy do obejrzenia / przeczytania / zagrania.
18. Backlinki — łączenie notatek (i innych elementów) jak w Obsidianie/Notion.
19. Globalne wyszukiwanie — notatki, linki, wydatki, zadania itd. w jednym pasku.
20. Dashboard główny — widok dnia: dzisiejsze zadania i wydarzenia, ostatnie wydatki, szybka notatka.

### Pomysły Claude przyjęte do projektu
- Uniwersalne powiązania między dowolnymi elementami (`[[...]]`, `@osoba`, `#tag`).
- Jeden wspólny silnik przypomnień + poranny „daily digest” (push/e-mail).
- Kalendarz jako agregator dat z modułów (grafik, subskrypcje, urodziny, gwarancje, przeglądy, daty ważności).
- Szybkie dodawanie: przycisk „+” na mobile, `Ctrl+K` na desktopie, parser typu `-45 paliwo karta`.
- Automatyczne powiązania: subskrypcja → wydatek, naprawa auta → wydatek, zakup sprzętu → wydatek.
- Bank prezentów powiązany z CRM + przypomnienia przed urodzinami/imieninami/świętami.
- Grafik pracy wylicza nadgodziny i szacowaną wypłatę.
- Android Share Target (udostępnij link z YouTube/przeglądarki prosto do BaseMind).
- Lokalizator: drzewo lokalizacji + zdjęcia + etykiety z kodem QR.
- Listy mediów z automatycznymi okładkami (TMDB / OpenLibrary / IGDB) — **opcjonalnie, później**.
- Nawyki: heatmapa i licznik serii.
- Szyfrowanie wrażliwych pól (libsodium). **Hasła do kont NIE są przechowywane** (od tego jest menedżer haseł).
- Tryb ciemny, język polski, PLN + obsługa innych walut.

### Pomysły odrzucone / poza zakresem
- ❌ Import wyciągów bankowych (CSV) — odrzucone przez użytkownika.
- ❌ VPS / Node.js na serwerze / Docker — odrzucone (hosting współdzielony PHP).
- ❌ Pełne szyfrowanie E2E — odrzucone na rzecz szyfrowania wybranych pól po stronie serwera.
- ⏸ OCR paragonów — nie planujemy.
- ⏸ Bot Telegram — nie wybrany kanał.

---

## 3. Architektura i technologie (ZATWIERDZONE)

### 3.1 Architektura ogólna

```
┌────────────────────────── Telefon / przeglądarka ──────────────────────────┐
│  PWA (React + Vite, pliki statyczne)                                       │
│   ├─ UI (komponenty, widoki modułów)                                       │
│   ├─ Warstwa danych: IndexedDB (Dexie) ← jedyne źródło danych dla UI       │
│   ├─ Outbox (kolejka zmian offline)                                        │
│   ├─ Silnik synchronizacji (push/pull)                                     │
│   ├─ Indeks wyszukiwania (MiniSearch w Web Workerze)                       │
│   └─ Service Worker (Workbox): cache aplikacji, push, share target, sync   │
└───────────────────────────────▲────────────────────────────────────────────┘
                                │ HTTPS (JSON), ta sama domena, cookie sesyjne
┌───────────────────────────────┴────────────────────────────────────────────┐
│  Hosting współdzielony: Apache + PHP 8.4/8.5 + MySQL/MariaDB               │
│  Laravel (API)                                                             │
│   ├─ Auth: Sanctum (SPA, cookie) + Fortify (logowanie, reset hasła, 2FA)   │
│   ├─ /api/sync (push/pull zmian, kontrola uprawnień do przestrzeni)        │
│   ├─ /api/files (upload/download załączników — szyfrowane na dysku)        │
│   ├─ /s/{token} (publiczne linki czasowe do plików)                        │
│   ├─ /api/link-preview (OG: tytuł, opis, miniatura; ochrona SSRF)          │
│   ├─ Przypomnienia: Scheduler + kolejka w bazie, uruchamiane CRONEM        │
│   │   co minutę → Web Push (minishlink/web-push) + e-mail (SMTP)           │
│   ├─ Szyfrowanie wrażliwych pól: libsodium (własny Cast Eloquent)          │
│   └─ MySQL/MariaDB + katalog storage/ (poza public/)                       │
└────────────────────────────────────────────────────────────────────────────┘
```

**Zasada offline-first:** UI zawsze czyta i zapisuje do lokalnej bazy IndexedDB. Serwer jest „kopią główną” i punktem synchronizacji między urządzeniami/osobami, a także wykonuje to, czego przeglądarka nie potrafi (push, e-mail, podgląd linków, publiczne linki do plików).

**Ta sama domena:** zbudowana PWA jest serwowana z folderu `public/` Laravela (np. `public/index.html` + `public/assets/`), API pod `/api`. Dzięki temu cookie sesyjne działa bez CORS, a wdrożenie to wgranie jednego katalogu.

**Ograniczenia hostingu współdzielonego i jak je obchodzimy:**
| Ograniczenie | Rozwiązanie |
|---|---|
| Brak procesów działających w tle | Cron co minutę: `php artisan schedule:run`; kolejka przetwarzana przez `queue:work --stop-when-empty` z harmonogramu |
| Brak Node.js na serwerze | Frontend budowany lokalnie (`pnpm build`), wgrywane gotowe pliki |
| Limity czasu wykonania / pamięci | Synchronizacja i uploady w partiach; miniatury generowane na kliencie |
| Brak Dockera | Lokalnie XAMPP |
| Aktualizacje PHP robi hostingodawca | Kontrola wersji PHP w aplikacji + utwardzenie konfiguracji (pkt 8) |

### 3.2 Stack

| Obszar | Wybór | Uwagi |
|---|---|---|
| **Frontend** | | |
| Język | TypeScript 6.0 | Nie 7: `typescript-eslint` wymaga TS < 6.1 |
| Framework | React 19 + Vite | |
| Menedżer pakietów | pnpm | |
| Routing | TanStack Router | Typowane trasy, lazy loading modułów |
| PWA | vite-plugin-pwa (Workbox), strategia `injectManifest` | Własny Service Worker |
| Lokalna baza | Dexie.js (IndexedDB) + `dexie-react-hooks` | |
| Stan UI | Zustand | Tylko stan UI |
| Formularze/walidacja | react-hook-form + zod | Walidacja na kliencie (serwer waliduje osobno) |
| Style | Tailwind CSS v4 + shadcn/ui (Radix) + `cn`, `tw-animate-css` | Komponenty dostosowane do dotyku: `web/src/components/ui/` |
| Powiadomienia, kalendarz | `sonner`, `react-day-picker` | |
| Ikony | lucide-react | |
| Animacje | motion | |
| Wykresy | Recharts | |
| Daty | date-fns (locale `pl`), rrule | Strefa `Europe/Warsaw` |
| Markdown | CodeMirror 6 (edytor), react-markdown + remark-gfm (podgląd) | |
| Wyszukiwanie | MiniSearch w Web Workerze | Normalizacja polskich znaków |
| ID | UUIDv7 generowane na kliencie | Tworzenie offline bez konfliktów |
| **Backend** | | |
| Język | PHP **≥ 8.4.27 lub ≥ 8.5.12** (wersje z poprawką PHP2Shell) | Lokalnie XAMPP: PHP 8.5.12 |
| Framework | **Laravel** (aktualna stabilna wersja — sprawdzimy przy instalacji) | |
| Auth | Laravel Sanctum (SPA cookie) + Laravel Fortify (headless) | Sesje Laravela w bazie (nie natywne `session_start()`) |
| Baza | MySQL 8 / MariaDB 10.11+ | Lokalnie MariaDB 10.11 z XAMPP |
| Kolejka/harmonogram | Laravel Queue (driver `database`) + Scheduler (cron) | |
| Push | `minishlink/web-push` (VAPID) | Wymaga bcmath lub gmp — bcmath jest w XAMPP |
| E-mail | Laravel Mail (SMTP); lokalnie **Mailpit** (lub driver `log` jako zapas) | |
| HTTP (podgląd linków) | Laravel HTTP Client (Guzzle) + własny parser OG + ochrona SSRF | |
| Szyfrowanie | ext-sodium: `sodium_crypto_secretbox` (pola), `secretstream` (pliki) | Osobny klucz `SODIUM_KEY` w `.env` |
| Testy | Pest (PHP), Vitest (front), Playwright (e2e, emulacja mobile) | |
| Jakość | Laravel Pint, Larastan (PHPStan); ESLint + Prettier + `tsc` | |

### 3.3 Środowisko lokalne (Windows 11) — stan na 2026-11-05

| Narzędzie | Stan | Ścieżka / uwagi |
|---|---|---|
| Node.js | ✅ v24.21.0 | `C:\Program Files\nodejs` |
| pnpm | ✅ 12.16.1 | zainstalowany globalnie przez npm |
| Git | ✅ 2.56 | |
| XAMPP | ✅ | `C:\xampp` — Apache, PHP 8.5.12, MariaDB 10.11.16 |
| PHP w PATH | ✅ dodane | `C:\xampp\php` w PATH użytkownika |
| Rozszerzenia PHP | ✅ | bcmath, curl, fileinfo, gd, intl, mbstring, openssl, pdo_mysql, sodium, zip — komplet dla Laravela i web-push |
| Composer | ✅ 2.11.1 | `%LOCALAPPDATA%\Programs\composer\composer.bat` (w PATH), instalator zweryfikowany sumą SHA-384 |
| Mailpit | — | na razie nie; lokalnie `MAIL_MAILER=log` (decyzja użytkownika) |
| php.ini XAMPP | ✅ utwardzony | `expose_php=Off`, `fatal_error_backtraces = Off`, `session.upload_progress.enabled = Off`; kopia `php.ini.bak-basemind-20261103` |
| Bazy danych | ✅ | `basemind`, `basemind_test` (utf8mb4_unicode_ci); lokalnie użytkownik `root` bez hasła |
| MariaDB `my.ini` | ✅ | `bind-address="127.0.0.1"` (tylko lokalnie); kopia `my.ini.bak-basemind-20261103` |
| Apache | ✅ 2.4.65 | VirtualHost `127.0.0.1:8080` → `api/public`, `Require local`; PHP jako `php_module` (mod_php) |
| Laravel | ✅ 13.40.0 | w `api/`; Sanctum 4.3, Fortify 1.41, Symfony 8.1.11 |
| Frontend | ✅ | w `web/`; React 19, Vite 8, TS 6, Tailwind 4 (`pnpm install`, `pnpm build`) |
| Telefon testowy | ✅ | Samsung S25 Ultra, debugowanie USB włączone, Chrome Port forwarding `8080` |
| Docker | — | niepotrzebny |
| adb | — | niepotrzebny (Chrome ma wbudowane przekierowanie portów) |

> Uwaga: nowe wpisy w PATH działają w **nowo otwartych** terminalach.

**Konfiguracja lokalna:**
- Apache (XAMPP): VirtualHost **`127.0.0.1:8080`** → `BaseMind/api/public` ✅ (szczegóły i treść konfiguracji: pkt 14).
- Vite dev server na `localhost:5173` z proxy `/api`, `/sanctum`, `/s` → `localhost:8080`.
- Telefon: USB + debugowanie USB na telefonie + Chrome na PC `chrome://inspect` → Port forwarding `5173 → localhost:5173` (i `8080` jeśli potrzebne). Na telefonie `http://localhost:5173` — to „bezpieczny kontekst”, więc Service Worker i push działają bez certyfikatu.
- Harmonogram lokalnie: `php artisan schedule:work` w osobnym terminalu.

---

## 4. Model danych (MySQL/MariaDB)

### 4.1 Zasady wspólne
- Każda tabela domenowa ma pola wspólne:
  - `id` — UUIDv7 jako `CHAR(36)` (tworzony na kliencie)
  - `space_id` — przestrzeń, do której należy rekord (**klucz do współdzielenia**)
  - `created_by` (user_id), `created_at`, `updated_at` (UTC)
  - `deleted_at` (soft delete — „nagrobki” potrzebne do synchronizacji)
  - `rev` (`BIGINT UNSIGNED`) — numer zmiany nadawany przez serwer z globalnego licznika (tabela `sync_counter`, atomowy `UPDATE … SET value = LAST_INSERT_ID(value + 1)` w transakcji) — kursor synchronizacji
  - `version` (int) — inkrementowany przy każdej edycji — wykrywanie konfliktów
- **Kwoty** jako liczby całkowite w groszach (`amount_minor`, `BIGINT`) + `currency` (`CHAR(3)`, domyślnie `PLN`). Nigdy float.
- **Daty bez czasu** jako `DATE`, momenty w czasie jako `DATETIME` w UTC. Strefa użytkownika domyślnie `Europe/Warsaw`.
- **Cykliczność** jako reguła RRULE (RFC 5545), np. `FREQ=MONTHLY;BYMONTHDAY=10`.
- Pola elastyczne jako kolumny `JSON`, walidowane (zod na kliencie, Laravel Validation na serwerze).
- Kodowanie `utf8mb4`, collation `utf8mb4_unicode_ci` (polskie znaki, emoji).
- Pola oznaczone 🔐 są **szyfrowane libsodium** (kolumna `TEXT`/`BLOB` z szyfrogramem, base64). Nie da się po nich wyszukiwać na serwerze — wyszukiwanie i tak odbywa się na kliencie.

### 4.2 Użytkownicy, przestrzenie, współdzielenie
- `users` — id, email, password (argon2id), display_name, timezone, locale, two_factor_* (Fortify, Etap 7).
- `sessions` — sesje Laravela (driver `database`).
- `personal_access_tokens` — tylko jeśli kiedyś potrzebne (Sanctum).
- `spaces` — id, name, type (`personal` | `shared`), owner_id.
  - Każdy użytkownik przy rejestracji dostaje **przestrzeń prywatną** (`personal`).
- `space_members` — space_id, user_id, role (`owner` | `editor` | `viewer`).
- `item_shares` (przyszłość) — udostępnienie pojedynczego rekordu: entity_type, entity_id, user_id, permission.
- **Zasada:** każde zapytanie API i każdy rekord synchronizacji przechodzi przez Laravel Policy/Gate „czy użytkownik jest członkiem `space_id` z odpowiednią rolą”. CRM i bank prezentów zawsze w przestrzeni prywatnej.
- `push_subscriptions` — user_id, endpoint, p256dh, auth, device_name, created_at.
- `user_settings` — user_id, JSON ustawień (motyw, widżety dashboardu, godzina digestu, kanały powiadomień, waluta domyślna, start tygodnia).
- `sync_counter` — jeden wiersz z globalnym licznikiem `rev`.

### 4.3 Wspólne mechanizmy
- `tags` — id, space_id, name, color.
- `entity_tags` — entity_type, entity_id, tag_id.
- `entity_links` — source_type, source_id, target_type, target_id, origin (`manual` | `parsed`). Podstawa backlinków między WSZYSTKIMI modułami.
- `reminders` — id, space_id, entity_type, entity_id, title, remind_at, rrule, offset_rule (np. „3 dni przed datą X”), channels (`push`, `email`), status (`scheduled` | `sent` | `dismissed` | `snoozed`), last_sent_at.
- `attachments` — id, space_id, entity_type, entity_id, file_name 🔐, mime, size, storage_key, thumbnail_key, sha256, upload_status. **Pliki na dysku szyfrowane** (sodium secretstream), przechowywane w `storage/app/private`.
- `file_shares` — id, attachment_id, token_hash (token 32+ bajtów, w bazie tylko hash), expires_at, max_downloads, download_count, password (hash, opcjonalnie), revoked_at.
- `jobs`, `failed_jobs`, `cache` — tabele techniczne Laravela.

### 4.4 Moduły (encje)
**Finanse**
- `wallets` — name, type (`cash` | `bank` | `card` | `savings` | `other`), currency, initial_balance_minor, color, icon, archived, sort_order.
- `categories` — name, kind (`income` | `expense`), parent_id, icon, color, sort_order.
- `transactions` — wallet_id, category_id, kind (`income` | `expense` | `transfer`), amount_minor, currency, date, note 🔐, counterparty, transfer_pair_id, source (`manual` | `subscription` | `vehicle` | `asset`), source_id.
- `budgets` — category_id, period (`month`), amount_minor, start_month.

**Subskrypcje**
- `subscriptions` — name, amount_minor, currency, rrule, next_charge_date, wallet_id, category_id, status (`active` | `trial` | `paused` | `cancelled`), trial_ends_on, url, cancel_url, notes, remind_days_before, auto_create_transaction, logo_url.

**Zadania**
- `task_lists` — name, icon, color, sort_order.
- `tasks` — list_id, parent_id, title, notes, priority (1–4), status (`todo` | `done` | `cancelled`), due_date, due_time, rrule, repeat_from (`due` | `completion`), completed_at, sort_order.

**Grafik pracy**
- `work_profiles` — employer, schedule_type (`fixed` | `shifts`), pay_type (`hourly` | `monthly`), hourly_rate_minor 🔐, monthly_salary_minor 🔐, daily_norm_minutes, weekly_norm_minutes, overtime_rules (JSON), default_start, default_end, default_break_minutes, active_from, active_to.
- `shift_templates` — work_profile_id, name, start, end, break_minutes, color.
- `work_entries` — work_profile_id, date, type (`work` | `vacation` | `sick` | `holiday` | `day_off`), start_at, end_at, break_minutes, shift_template_id, note.
- Polskie święta ustawowe liczone lokalnie (w tym ruchome).

**Kalendarz**
- `events` — title, description, location, start_at, end_at, all_day, rrule, color.
- Widok łączy `events` + wirtualne zdarzenia z innych modułów (rejestr „dostawców dat”).

**Notatki**
- `notes` — title, content 🔐 (markdown), folder_id, pinned, archived.
- `note_folders` — name, parent_id.

**Schowek linków**
- `bookmarks` — url, title, description, image_key, favicon_url, site_name, media_type (`article` | `video` | `other`), status (`inbox` | `read` | `archived`), favorite, note, preview_status (`pending` | `ok` | `failed`).

**Listy mediów**
- `media_items` — kind (`movie` | `series` | `book` | `game`), title, year, creator, cover_url, status (`planned` | `in_progress` | `done` | `dropped`), rating, note, external_ref.

**Strażnik dat ważności**
- `expiry_items` — name, category (`document` | `food` | `medicine` | `cosmetics` | `other`), document_number 🔐, expires_on, location_id, remind_days_before, note.

**Lokalizator**
- `locations` — name, parent_id, qr_code, photo (attachment).
- `stored_items` — name, location_id, quantity, description, photo, last_seen_at.

**Paszport pojazdu**
- `vehicles` — name, make, model, year, plate 🔐, vin 🔐, engine, fuel, tire_size_summer, tire_size_winter, tire_pressure, oil_spec, notes.
- `vehicle_records` — vehicle_id, type (`oil` | `service` | `repair` | `tires` | `inspection` | `fuel` | `other`), date, mileage, cost_minor, workshop, description, next_due_date, next_due_mileage, transaction_id.
- `vehicle_documents` — vehicle_id, type (`oc` | `ac` | `assistance` | `inspection` | `registration`), number 🔐, insurer, valid_from, valid_to, cost_minor, attachment.

**Sprzęty i gwarancje**
- `assets` — name, brand, model, serial_number 🔐, purchase_date, price_minor, store, warranty_months, warranty_until, extended_warranty_until, receipt (attachment), manual_url, location_id, transaction_id, notes.

**Nawyki**
- `habits` — name, icon, color, schedule (JSON), target_value, unit, reminder_time, archived.
- `habit_logs` — habit_id, date, value, note.

**CRM bliskich** (całość prywatna)
- `contacts` — name, nickname, relation, photo, birthday, nameday, phone 🔐, email 🔐, address 🔐, sizes 🔐 (JSON), likes 🔐, dislikes 🔐, favorite_food 🔐, favorite_drinks 🔐, allergies 🔐, family 🔐 (JSON: partner, dzieci, zwierzęta), important_dates (JSON), notes 🔐.
  - `birthday`/`nameday` nieszyfrowane, bo serwer musi wysyłać przypomnienia.

**Bank prezentów**
- `gift_ideas` — contact_id, title 🔐, url 🔐, price_minor, occasion, status (`idea` | `bought` | `given`), heard_on, note 🔐.

**Baza kodów i szybkich danych**
- `quick_codes` — label, category (`wifi` | `pin` | `bank_account` | `id_number` | `membership` | `other`), value 🔐, is_sensitive, note 🔐.

> Lista pól 🔐 to propozycja startowa — może być rozszerzana przy implementacji modułów (zawsze za zgodą użytkownika).

---

## 5. Synchronizacja offline (projekt)

1. **Zapis lokalny:** każda zmiana zapisuje rekord w Dexie i dodaje wpis do `outbox` (`{op_id, entity, record_id, op, payload, base_version, client_ts}`).
2. **Push:** `POST /api/sync/push` — partia operacji (np. do 100). Serwer dla każdej:
   - waliduje (Laravel Validation — reguły per encja), sprawdza uprawnienia do `space_id` (Policy),
   - jeśli `base_version` == aktualna wersja → zapisuje, `version+1`, nowy `rev`,
   - jeśli konflikt → **last-write-wins na poziomie pól**; dla **notatek** dodatkowo „kopia konfliktu”,
   - idempotentność: `op_id` zapamiętywany (tabela `sync_ops`), ponowne wysłanie nie dubluje zmian,
   - zwraca wynik per operacja; klient usuwa z outboxa potwierdzone.
3. **Pull:** `GET /api/sync/pull?cursor=<rev>&limit=500` — zmiany o `rev > cursor` w przestrzeniach użytkownika (z nagrobkami), stronicowane. Pola 🔐 są odszyfrowywane na serwerze przed wysłaniem (przez HTTPS).
4. **Kiedy:** start aplikacji, zdarzenie `online`, po lokalnej zmianie (debounce ~2 s), co ~60 s gdy aplikacja widoczna, **Background Sync API** (Android Chrome).
5. **Pliki:** załączniki zapisywane lokalnie jako Blob w IndexedDB, wysyłane osobną kolejką (w kawałkach, jeśli duże — limity hostingu); miniatury generowane na kliencie.
6. **Wylogowanie** czyści lokalną bazę.
7. Wskaźnik w UI: „zsynchronizowano / X zmian czeka / offline / błąd”.
8. Rejestr encji synchronizowanych po obu stronach (front: definicja tabeli Dexie; back: model + reguły walidacji + policy) — dodanie modułu = wpis w rejestrze.

---

## 6. PWA i mobile (Android priorytet, iOS przygotowany)

- **Manifest:** nazwa „BaseMind”, ikony (w tym maskable), `display: standalone`, `theme_color`, `background_color`, `shortcuts` (Szybki wydatek, Nowe zadanie, Szybka notatka, Dodaj link), `share_target` (Android).
- **Service Worker:** precache powłoki aplikacji, cache obrazków, `push` i `notificationclick` (akcje „Zrobione”, „Odłóż 1h”), `sync`, obsługa share target.
- **Instalacja:** własny baner (`beforeinstallprompt`), na iOS instrukcja „Udostępnij → Do ekranu początkowego”.
- **iOS:** `apple-touch-icon`, meta tagi, splash screeny, `env(safe-area-inset-*)`, push tylko po instalacji (iOS 16.4+).
- **Odczucie natywne:** dolna nawigacja, gesty swipe, pull-to-refresh, haptyka (`navigator.vibrate`), duże pola dotyku (min. 44 px), bottom sheets zamiast modali, `inputmode="decimal"` przy kwotach.
- **Badging API** — licznik zaległych na ikonie.
- **Wydajność:** lazy loading modułów, wirtualizacja list, cel Lighthouse ≥ 90 na mobile.

---

## 7. Design (propozycja Claude — użytkownik oceni po zobaczeniu)

- **Styl:** minimalistyczny, „spokojny”, inspirowany Linear / Things 3 / Notion. Dużo przestrzeni, mało ramek, hierarchia przez typografię.
- **Kolory:** neutralna skala szarości (zinc) + **jeden kolor akcentu: niebieski `#2563EB`** (tekst i ikony: `#1D4ED8` w jasnym, `#93C5FD` w ciemnym). Semantyczne: zielony = wpływy/zrobione, czerwony = wydatki/zaległe, bursztynowy = ostrzeżenia.
- **Każdy moduł ma własną ikonę**; kolor akcentu jest wspólny (bez osobnych kolorów modułów, żeby nie myliły się ze statusami).
- **Tryb jasny i ciemny** (domyślnie zgodny z systemem), ciemny bliski czerni (OLED).
- **Typografia:** Inter, cyfry tabelaryczne w kwotach.
- **Kształty:** zaokrąglenia 12–16 px, delikatne cienie tylko na elementach wyniesionych.
- **Nawigacja mobile:** dolny pasek: **Dziś** · **Zadania** · **[+]** · **Kalendarz** · **Więcej**. Wyszukiwarka zawsze u góry.
- **Desktop:** boczny pasek + `Ctrl+K`.
- **Mikroanimacje:** 150–250 ms, z poszanowaniem `prefers-reduced-motion`.

---

## 8. Bezpieczeństwo (hosting współdzielony PHP)

### 8.1 Luki w PHP — stan na 2026-11-03
| Luka | Opis | Ochrona w BaseMind |
|---|---|---|
| **PHP2Shell** — CVE-2026-109618, CVE-2026-109619 (CVSS 9.2, aktywnie wykorzystywane, w katalogu KEV CISA) | Zdalne wykonanie kodu bez logowania; PHP 5.4–8.5.11, wszystkie SAPI (mod_php, FPM, CGI, LiteSpeed). Poprawione w **8.5.12 / 8.4.27 / 8.3.36 / 8.2.35**; 8.1 i starsze — brak poprawki. | Wymagana wersja PHP z poprawką (kontrola w aplikacji), `session.upload_progress.enabled=0`, `fatal_error_backtraces=0` (PHP 8.5) |
| **CVE-2026-115560** (bez poprawki w dniu 2026-11-03) | RCE związane z obsługą sesji; wg doniesień dotyczy aplikacji zmieniających `serialize_handler` w trakcie działania. | `session.upload_progress.enabled=0`; aplikacja **nigdy** nie zmienia `serialize_handler`, nie używa natywnych sesji PHP; śledzić advisory PHP i zaktualizować, gdy wyjdzie poprawka |

> Przy każdym wdrożeniu i co jakiś czas: sprawdzić nowe advisory PHP/Laravel i zaktualizować tę tabelę.

### 8.2 Utwardzenie konfiguracji
- **`public/.user.ini`** (i `php.ini` lokalnie): `session.upload_progress.enabled=0`, `fatal_error_backtraces=0`, `expose_php=Off`, `display_errors=Off`, `log_errors=On`, `allow_url_include=Off`, `session.use_strict_mode=1`, rozsądne `upload_max_filesize`/`post_max_size`.
- **Kontrola wersji PHP:** komenda/health-check porównuje `PHP_VERSION` z minimalnymi bezpiecznymi wersjami per gałąź (lista w konfiguracji); przy wersji podatnej aplikacja przechodzi w tryb awaryjny (odmawia obsługi żądań poza stroną informacyjną) i wysyła e-mail do właściciela.
- **Tylko `public/` jest dostępne z internetu.** `.env`, kod, `storage/`, logi — poza katalogiem publicznym. Jeśli hosting nie pozwala ustawić document root na `public/` → `.htaccess` blokujące wszystko poza `public/` + test przy wdrożeniu, że `/.env` zwraca 403/404.
- `.htaccess`: blokada plików ukrytych (`.env`, `.git`), wyłączenie listowania katalogów, brak wykonywania PHP w katalogach uploadu.
- `APP_DEBUG=false` w produkcji, `APP_ENV=production`.

### 8.3 Aplikacja
- **Bez natywnych sesji PHP** (`session_start()`), bez `unserialize()` na danych od użytkownika, bez zmiany `serialize_handler`. Sesje Laravela w bazie, cookie szyfrowane.
- Hasła: **argon2id** (`HASHING_DRIVER=argon2id` — jeśli hosting wspiera, inaczej bcrypt). Rate limiting logowania (Fortify) i API.
- Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`; CSRF przez Sanctum (XSRF-TOKEN).
- Nagłówki: CSP (bez inline skryptów), HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`.
- Eloquent / zapytania z parametrami — nigdy SQL z konkatenacji.
- Autoryzacja Policy na poziomie przestrzeni w każdym endpoincie; **testy „użytkownik A nie widzi danych B”**.
- Podgląd linków — **ochrona SSRF**: tylko http/https, porty 80/443, rozwiązanie DNS i blokada adresów prywatnych/loopback/link-local (IPv4 i IPv6), sprawdzanie każdego przekierowania, limit czasu i rozmiaru odpowiedzi, rate limit.
- Upload: limit rozmiaru, weryfikacja MIME (finfo), losowe nazwy, przechowywanie poza `public/`, serwowanie wyłącznie przez kontroler po sprawdzeniu uprawnień z `Content-Disposition: attachment` (lub `inline` tylko dla bezpiecznych typów obrazów).
- Publiczne linki do plików: token 32+ bajtów (w bazie hash), czas wygaśnięcia, opcjonalne hasło, limit pobrań, unieważnianie, rate limit.

### 8.4 Szyfrowanie (libsodium)
- **Pola 🔐**: `sodium_crypto_secretbox` (XSalsa20-Poly1305) z losowym nonce per wartość; własny Cast Eloquent `SodiumEncrypted` (+ `SodiumEncryptedJson`).
- **Pliki**: `sodium_crypto_secretstream_xchacha20poly1305` (strumieniowo, duże pliki).
- **Klucz** `SODIUM_KEY` (32 bajty, base64) w `.env`, osobny od `APP_KEY`. Przygotowana **rotacja kluczy** (identyfikator klucza zapisany w szyfrogramie).
- **Kopia klucza** musi być przechowywana bezpiecznie poza serwerem (np. w menedżerze haseł) — utrata klucza = utrata danych 🔐.
- **Uczciwe ograniczenie:** szyfrowanie chroni przed wyciekiem samej bazy (np. zrzut, backup, SQL injection). Jeśli atakujący przejmie wykonanie kodu na serwerze (RCE), może odczytać klucz z `.env`. Dlatego kluczowe są pkt 8.1–8.3.
- Dane na urządzeniu (IndexedDB) są odszyfrowane → opcjonalna blokada PIN-em (Etap 7) + czyszczenie danych przy wylogowaniu.

### 8.5 Zależności i utrzymanie
- `composer audit` i `pnpm audit` przed każdym wdrożeniem.
- Aktualizacje Laravela (wydania bezpieczeństwa) — przypomnienie/checklista.
- Kopie zapasowe: eksport danych z aplikacji (JSON + ZIP plików) + backup bazy z panelu hostingu.
- Sekrety tylko w `.env` (nie w repo), w repo `.env.example`.

---

## 9. Struktura repozytorium (plan docelowy)

> **Stan na 2026-11-05 — co już istnieje poza poniższym planem:** `api/app/Actions/Fortify/`, `api/app/Enums/`, `api/app/Models/Concerns/BelongsToSpace.php`, `api/app/Http/Responses/`, `api/lang/pl/`, `web/src/lib/` (`api`, `auth`, `money`, `theme`, `device`, `form-errors`), `web/src/i18n/pl.ts`, `web/src/modules/` (`auth`, `today`, `tasks`, `calendar`, `more`, `settings`, `design`, `registry.ts`), `web/public/app-icons/`, `web/public/theme-init.js`. Jeszcze nie ma: `Casts/`, `Services/`, `Sync/`, `web/src/db/`, `web/src/sync/`, `web/src/search/`. Build zapisuje do `api/public/`: `assets/`, `app-icons/`, `index.html`, `sw.js`, `theme-init.js`, `manifest.webmanifest` (pliki w `.gitignore`).

```
BaseMind/
├─ projekt.md              ← ten plik
├─ plan.md                 ← plan i postęp
├─ README.md               ← jak uruchomić lokalnie i wdrożyć
├─ CLAUDE.md               ← wskaźnik dla Claude (zasady + czytaj projekt.md/plan.md)
├─ .gitignore, .gitattributes
├─ api/                    ← Laravel (backend; na hostingu: katalog aplikacji)
│  ├─ app/
│  │  ├─ Casts/            ← SodiumEncrypted, SodiumEncryptedJson
│  │  ├─ Http/Controllers/ ← Sync, Files, FileShare, LinkPreview, PushSubscription…
│  │  ├─ Models/           ← encje
│  │  ├─ Policies/         ← autoryzacja przestrzeni
│  │  ├─ Services/         ← Sync, Reminders, WebPush, LinkPreview (SSRF guard), Crypto
│  │  └─ Sync/             ← rejestr encji synchronizowanych + reguły walidacji
│  ├─ database/migrations/
│  ├─ routes/ (api.php, web.php, console.php ← harmonogram)
│  ├─ public/              ← index.php Laravela + zbudowana PWA + .htaccess + .user.ini
│  ├─ storage/             ← pliki prywatne (szyfrowane), logi
│  └─ tests/               ← Pest
└─ web/                    ← PWA (React + Vite)
   ├─ public/              ← ikony
   └─ src/
      ├─ app/              ← router, layout, providers
      ├─ components/ui/    ← shadcn/ui
      ├─ components/       ← BottomNav, QuickAdd, SearchBar…
      ├─ db/               ← Dexie: schemat, repozytoria, outbox
      ├─ sync/             ← silnik synchronizacji
      ├─ search/           ← worker MiniSearch
      ├─ modules/          ← finance/, subscriptions/, tasks/, calendar/, notes/, …
      ├─ lib/              ← daty, kwoty, rrule, parser szybkiego dodawania, schematy zod
      └─ sw.ts             ← Service Worker
```

Build frontendu (`pnpm build` w `web/`) zapisuje pliki do `api/public/` (np. `index.html` + `assets/`), a Laravel serwuje `index.html` dla wszystkich tras niebędących `/api`, `/sanctum`, `/s`.

---

## 10. Konwencje

- Kod, nazwy, commity: **angielski**. UI: **polski** (teksty w plikach tłumaczeń).
- Tabele `snake_case` liczba mnoga; PHP: PSR-12 (Pint); TS: `camelCase`, typy `PascalCase`.
- Commity: Conventional Commits (`feat(finance): …`, `fix(sync): …`).
- Każdy moduł we froncie: `web/src/modules/<nazwa>/` (routes, components, `repo.ts`, schematy zod); w backendzie: model + migracja + policy + reguły walidacji + wpis w rejestrze sync.
- **Nowy moduł musi:** zarejestrować encje w sync (front i back), w wyszukiwarce, w systemie powiązań/tagów, (jeśli ma daty) w kalendarzu i przypomnieniach, (opcjonalnie) widżet dashboardu, oznaczyć pola 🔐.
- Git: gałąź `main`, `origin` na GitHubie. Opisy commitów bez znaków `"` (pkt 15).
- Adresy URL po angielsku, na najwyższym poziomie (`/notes`, `/finance`); ścieżki `/icons/` nie używać (pkt 15).
- Teksty UI w `web/src/i18n/pl.ts`, komunikaty serwera w `api/lang/pl/`.

---

## 11. Wybór hostingu — checklista (na etap wdrożenia)

Hosting musi zapewniać:
- [ ] PHP **8.4.27+ lub 8.5.12+** (i szybkie wgrywanie łatek bezpieczeństwa — sprawdzić historię reakcji na PHP2Shell),
- [ ] wybór wersji PHP w panelu, możliwość `.user.ini` / własnych ustawień PHP,
- [ ] rozszerzenia: sodium, bcmath lub gmp, openssl, curl, mbstring, pdo_mysql, fileinfo, intl, zip, gd,
- [ ] MySQL 8 lub MariaDB 10.11+,
- [ ] **cron co 1 minutę**,
- [ ] **SSH** (Composer, `artisan migrate`) — mocno zalecane,
- [ ] możliwość ustawienia document root na podkatalog (`public/`),
- [ ] darmowy SSL (Let's Encrypt) i HTTP/2,
- [ ] połączenia wychodzące HTTP(S) (push, podgląd linków) i SMTP,
- [ ] kopie zapasowe po stronie hostingu,
- [ ] serwery w UE (RODO).

---

## 12. Otwarte pytania (do ustalenia przy odpowiednich etapach)

1. (rozstrzygnięte: `localhost:8080`)
2. (rozstrzygnięte: rejestracja z kodem zaproszenia)
3. Godzina porannego digestu i jego zawartość (Etap 1).
4. Reguły nadgodzin u obecnego pracodawcy, wynagrodzenie godzinowe czy miesięczne (Etap 5).
5. Waluty obce — z kursami NBP czy bez (Etap 3).
6. Automatyczne okładki z TMDB/OpenLibrary/IGDB (Etap 4).
7. Ewentualne rozszerzenie listy pól 🔐 (przy każdym module).

---

## 13. Rejestr decyzji

| Data | Decyzja | Kto |
|---|---|---|
| 2026-11-03 | Aplikacja webowa PWA, mobile-first, priorytet Android, iOS przygotowany | Użytkownik |
| 2026-11-03 | Jeden użytkownik na start, model danych gotowy na współdzielenie (przestrzenie) | Użytkownik |
| 2026-11-03 | Offline-first | Użytkownik |
| 2026-11-03 | Przypomnienia: push PWA + e-mail | Użytkownik |
| 2026-11-03 | Finanse tylko ręcznie, bez importu z banków | Użytkownik |
| 2026-11-03 | Grafik: stałe godziny teraz, obsługa zmian w modelu | Użytkownik |
| 2026-11-03 | Kolejność etapów zaakceptowana | Użytkownik |
| 2026-11-03 | **Hosting współdzielony PHP, bez VPS** (brak czasu na administrację serwerem) | Użytkownik |
| 2026-11-03 | **Backend: PHP + Laravel + MySQL/MariaDB**; lokalnie **XAMPP** | Użytkownik |
| 2026-11-03 | Frontend: React + Vite + TS (PWA), szczegóły stacku z pkt 3.2 | Użytkownik / Claude |
| 2026-11-03 | **Szyfrowanie libsodium po stronie serwera dla wrażliwych pól** (nie E2E) | Użytkownik |
| 2026-11-03 | Testy na telefonie przez kabel USB (Chrome port forwarding) | Użytkownik |
| 2026-11-03 | Design: propozycja Claude (indygo + Inter), ocena po zobaczeniu | Użytkownik |
| 2026-11-03 | 2FA na końcu projektu (Etap 7) | Użytkownik |
| 2026-11-03 | Nazwa finalna: **BaseMind** | Użytkownik |
| 2026-11-03 | Zainstalowano: Composer 2.11.1, pnpm 12.16.1; PHP z XAMPP i Composer dodane do PATH | Claude (za zgodą) |
| 2026-11-03 | Lokalnie maile do logu (bez Mailpit) | Użytkownik |
| 2026-11-03 | Lokalny backend: `localhost:8080` | Użytkownik |
| 2026-11-03 | Lokalna baza: root bez hasła (tylko dev); produkcja — dedykowany użytkownik z hasłem | Użytkownik |
| 2026-11-03 | Utwardzenie php.ini XAMPP (zgodność z produkcją) | Użytkownik / Claude |
| 2026-11-03 | MariaDB `bind-address=127.0.0.1` | Użytkownik |
| 2026-11-03 | Usunięte `api/CLAUDE.md` i `api/AGENTS.md` z instalatora Laravela (Laravel Boost) — nie instalujemy Boost; wytyczne w `projekt.md`/`plan.md` | Użytkownik |
| 2026-11-03 | Autor commitów: Marcin Wójcik <mgrnewsl@gmail.com>; e-mail alertów bezpieczeństwa: ten sam | Użytkownik |
| 2026-11-04 | Apache VirtualHost `127.0.0.1:8080` → `api/public` | Użytkownik |
| 2026-11-04 | Repozytorium zdalne: https://github.com/mwojcik7/BaseMind.git (gałąź `main`) | Użytkownik |
| 2026-11-04 | Frontend (`web/`) zaczynamy w następnej sesji | Użytkownik |
| 2026-11-04 | TypeScript 6.0 zamiast 7, bo `typescript-eslint` wymaga TS < 6.1; zostajemy przy ESLint z planu (szablon Vite proponował oxlint) | Claude (do oceny użytkownika) |
| 2026-11-04 | `cn` (oficjalny pakiet autora shadcn, instalowany przez CLI) zamiast `clsx` + `tailwind-merge` | Claude (do oceny użytkownika) |
| 2026-11-04 | Adresy URL po angielsku i bez przedrostka `/more` (`/tasks`, `/notes`, `/finance`) | Użytkownik |
| 2026-11-04 | Wybór motywu w ustawieniach: zgodny z systemem / jasny / ciemny; na razie zapamiętany na urządzeniu (`localStorage`), synchronizacja z `user_settings` w Etapie 1 | Użytkownik / Claude |
| 2026-11-05 | Konta zakładane z kodem zaproszenia (`BASEMIND_REGISTRATION_CODE`); pusty kod wyłącza rejestrację | Użytkownik |
| 2026-11-05 | Sesja wygasa po 30 dniach bezczynności (`SESSION_LIFETIME=43200`), bez opcji „zapamiętaj mnie”, żeby PWA nie wylogowywała na telefonie, a unieważnienie sesji działało od razu | Użytkownik |
| 2026-11-05 | Hasło: co najmniej 10 znaków; `users.id` pozostaje liczbą (konta tworzy serwer), `spaces.id` to UUID | Claude (do oceny użytkownika) |
| 2026-11-04 | Dodatkowe biblioteki UI: `sonner` (powiadomienia), `react-day-picker` (kalendarz, przez shadcn), `tw-animate-css` (animacje shadcn); arkusz od dołu własny (Radix + `motion`) zamiast `vaul` | Claude (do oceny użytkownika) |
| 2026-11-04 | Jeden kolor akcentu dla całej aplikacji, bez osobnych kolorów modułów | Użytkownik |
| 2026-11-04 | Kolor akcentu: niebieski `#2563EB` zamiast indygo (nie myli się z kolorami statusów) | Użytkownik |
| 2026-11-04 | Moduł lokalizatora w UI nazywa się „Lokalizator rzeczy” (samo „Lokalizator” mogło mylić) | Użytkownik |
| 2026-11-04 | Usunięte nieużywane pliki frontendu Laravela (`api/package.json`, `api/vite.config.js`, `api/resources/js`, `api/resources/css`) — frontend jest w `web/` | Użytkownik |
| 2026-11-04 | TanStack Router z trasami w kodzie (bez generatora plików) | Claude (do oceny użytkownika) |
| 2026-11-04 | CSP: style inline dozwolone (Radix UI), skrypty tylko z `'self'`; `img-src` bez zewnętrznych domen do czasu Etapu 4 | Claude (do oceny użytkownika) |

---

## 14. Konfiguracja poza repozytorium (do odtworzenia na nowym komputerze)

Te zmiany są w plikach XAMPP i systemu, **nie ma ich w git**. Przy reinstalacji XAMPP / nowym komputerze trzeba je powtórzyć.

**1. `C:\xampp\php\php.ini`** (kopia oryginału: `php.ini.bak-basemind-20261103`):
```ini
expose_php=Off
fatal_error_backtraces = Off
session.upload_progress.enabled = Off   ; XAMPP miał to już ustawione
```

**2. `C:\xampp\mysql\bin\my.ini`** (kopia: `my.ini.bak-basemind-20261103`), sekcja `[mysqld]`:
```ini
bind-address="127.0.0.1"
```

**3. `C:\xampp\apache\conf\httpd.conf`** (kopia: `httpd.conf.bak-basemind-20261104`), zaraz po `Listen 80`:
```apache
# BaseMind (local only)
Listen 127.0.0.1:8080
```

**4. `C:\xampp\apache\conf\extra\httpd-vhosts.conf`** (kopia: `httpd-vhosts.conf.bak-basemind-20261104`), na końcu:
```apache
<VirtualHost 127.0.0.1:8080>
    ServerName localhost
    DocumentRoot "C:/Users/Praca/Documents/Kodowanie/BaseMind/api/public"
    <Directory "C:/Users/Praca/Documents/Kodowanie/BaseMind/api/public">
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require local
    </Directory>
    ErrorLog "logs/basemind-error.log"
    CustomLog "logs/basemind-access.log" common
</VirtualHost>
```

**5. Bazy danych** (MariaDB, root bez hasła):
```sql
CREATE DATABASE basemind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE basemind_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**6. Narzędzia i PATH użytkownika:** Composer w `%LOCALAPPDATA%\Programs\composer\` (`composer.phar` + `composer.bat` wywołujący `C:\xampp\php\php.exe`); pnpm: `npm install -g pnpm`; do PATH użytkownika dodane `%LOCALAPPDATA%\Programs\composer` i `C:\xampp\php`.

**7. Pliki tylko lokalne w projekcie (w `.gitignore`):** `api/.env` (zawiera `APP_KEY` — **bez niego nie odczytamy zaszyfrowanych sesji/cookies**; później także `SODIUM_KEY` — **utrata = utrata zaszyfrowanych danych**, trzymać kopię w menedżerze haseł), `api/vendor/`, `node_modules/`.
Po świeżym `git clone`: `cd api && composer install && copy .env.example .env && php artisan key:generate && php artisan migrate` (+ uzupełnić `BASEMIND_OWNER_EMAIL` i `BASEMIND_REGISTRATION_CODE`), potem `cd ../web && pnpm install && pnpm build`.

`api/.env` zawiera też `BASEMIND_REGISTRATION_CODE` (losowy kod do zakładania kont, tylko lokalny) i `SESSION_LIFETIME=43200`. Bez kodu rejestracja jest wyłączona; aby założyć kolejne konto, wystarczy odczytać lub ustawić kod w tym pliku.

**7a. Dane tylko lokalne:** baza `basemind` trzyma prawdziwe konto użytkownika (nie ma go w git). Przy reinstalacji XAMPP lub nowym komputerze trzeba zrobić kopię bazy lub założyć konto od nowa kodem zaproszenia. Do czasu Etapu 1.4 konto nie ma jeszcze żadnych innych danych.

**7b. Inne projekty na tym serwerze:** MariaDB z XAMPP trzyma też bazy innego projektu użytkownika (np. `syslead_test`). Nie wolno ich ruszać ani używać poleceń obejmujących cały serwer.

**8. Git (lokalnie w repo):** `user.name = Marcin Wójcik`, `user.email = mgrnewsl@gmail.com`; `origin` = https://github.com/mwojcik7/BaseMind.git.

---

## 15. Pułapki i wnioski z dotychczasowej pracy

- **`php artisan install:api` (i inne komendy artisan wywołujące Composera) nie działają na tym Windows** — artisan szuka Composera pod złą ścieżką. Obejście: wykonać krok ręcznie (`composer require …` + `php artisan vendor:publish …`).
- **Composer w PowerShell:** wywoływać `composer` (z PATH, w nowym terminalu) lub pełną ścieżką `& "$env:LOCALAPPDATA\Programs\composer\composer.bat"`. W Git Bash `php` z XAMPP jest w PATH.
- **Testy (`php artisan test`) wymagają uruchomionej MariaDB** (baza `basemind_test`, nie SQLite — dla zgodności z produkcją).
- **Moduł PHP w Apache XAMPP to `php_module`** — w `.htaccess` używać `<IfModule php_module>`, nie `mod_php.c`. `.user.ini` działa tylko pod CGI/FPM, `php_flag` w `.htaccess` tylko pod mod_php — dlatego mamy oba.
- **`Header always set` w `.htaccess` dubluje nagłówki ustawione przez PHP** — używać `Header set`.
- **Instalator Laravela tworzy `CLAUDE.md`/`AGENTS.md` (Laravel Boost)** — usunięte; nie odtwarzać bez zgody użytkownika.
- **Pobieranie programów z internetu (np. Mailpit) może zostać zablokowane** przez zabezpieczenia sesji Claude — wtedy poprosić użytkownika o ręczne pobranie lub zgodę.
- **Sanctum uruchamia sesję tylko dla żądań z nagłówkiem `Referer`/`Origin` z `SANCTUM_STATEFUL_DOMAINS`.** Bez tego kontroler dostaje `Session store not set` (także w testach: `withHeader('Referer', …)`). Na produkcji trzeba tam wpisać domenę.
- **Na serwerze MariaDB są też bazy innego projektu** (np. `syslead_test`) — nie używać `migrate:fresh` na `basemind` i sprawdzać `DB::getDatabaseName()` przed operacjami na danych.
- **Test na telefonie: działający ekran nie znaczy, że jest połączenie.** Service Worker pokazuje aplikację także przy przerwanym przekierowaniu portu (zamknięty Chrome lub `chrome://inspect`, kabel). Sprawdzenie: `http://localhost:8080/api/health` na telefonie omija Service Workera; nowe wpisy w `basemind-access.log` pokazują, czy żądanie dotarło.
- **Nie używać ścieżki `/icons/`:** domyślna konfiguracja Apache (XAMPP i wiele hostingów) ma `Alias /icons/` na własny katalog, więc pliki z `public/icons` zwracają 404. Ikony PWA są w `/app-icons/`.
- **`shadcn add` czyta alias `@/*` z głównego `web/tsconfig.json`** — bez wpisu `paths` tworzy dosłowny katalog `web/@/`.
- **`shadcn add` przerywa się bez komunikatu, gdy pyta o nadpisanie istniejącego pliku** (flaga `--yes` tego nie obejmuje) i pomija kolejne komponenty. Po dodaniu sprawdzić listę plików; odpowiedź można podać przez potok: `'n' | pnpm dlx shadcn@latest add ...`.
- **Nowe komponenty shadcn mają rozmiary pod myszkę (`h-9`)** — dostosować do 44 px, a teksty (np. „Close”) przenieść do `src/i18n/pl.ts`.
- **Git w PowerShell 5.1 gubi cudzysłowy w treści commita** — nie używać `"` w opisach.
- **Nie czyścić `api/public/` przy buildzie w całości** (są tam `index.php`, `.htaccess`) — tylko `web/scripts/clean-build.mjs` z jawną listą.
- **MariaDB nasłuchuje tylko na 127.0.0.1** — łączyć się przez `127.0.0.1`, nie `::1`/`localhost` z IPv6.
- `max_allowed_packet=1M` w `my.ini` — może trzeba podnieść przy synchronizacji (Etap 1.4).
- Na hostingu: zweryfikować wariant document root (najlepiej `api/public`; awaryjnie cały `api/` — przetestowany lokalnie, bezpieczny).
