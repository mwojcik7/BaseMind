# BaseMind — dokument projektu

> **Cel tego pliku:** jedno źródło prawdy o tym, CZYM jest projekt, co ustaliliśmy i JAK go budujemy.
> Co jest zrobione i co dalej — patrz `plan.md`.
> Po wyczyszczeniu kontekstu: przeczytaj najpierw ten plik, potem `plan.md` (sekcje „Pytania na start”, „Stan bieżący” i „Dziennik zmian”).

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
- Szybkie dodawanie: przycisk „+” na mobile, klawisz `Q` na desktopie (`Ctrl+K` to wyszukiwarka), parser typu `-45 paliwo karta`.
- Automatyczne powiązania: subskrypcja → wydatek, naprawa auta → wydatek, zakup sprzętu → wydatek.
- Bank prezentów powiązany z CRM + przypomnienia przed urodzinami/świętami.
- Grafik pracy wylicza nadgodziny i szacowaną wypłatę.
- Android Share Target (udostępnij link z YouTube/przeglądarki prosto do BaseMind).
- Lokalizator: drzewo lokalizacji + zdjęcia + etykiety z kodem QR.
- Listy mediów z automatycznymi okładkami (TMDB / OpenLibrary / IGDB) — **opcjonalnie, później**.
- Nawyki: heatmapa i licznik serii.
- Szyfrowanie wrażliwych pól (libsodium). **Hasła do kont NIE są przechowywane** (od tego jest menedżer haseł).
- Tryb ciemny, język polski, PLN + obsługa innych walut.

### Pomysły odrzucone / poza zakresem
- ❌ Import wyciągów bankowych (CSV) — odrzucone przez użytkownika.
- ❌ Imieniny (powitanie, CRM, kalendarz, przypomnienia) — odrzucone przez użytkownika.
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
| Wyszukiwanie | MiniSearch w Web Workerze | Normalizacja polskich znaków, literówki i przestawione litery |
| ID | UUIDv7 generowane na kliencie (pakiet `uuid`) | Tworzenie offline bez konfliktów |
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
| Testy | PHPUnit (PHP), Vitest (front), Playwright (e2e, emulacja mobile) | Pest porzucony 2026-11-14 (pkt 13) |
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
  - `field_stamps` (JSON, tylko na serwerze) — czas ostatniej zmiany każdego pola, potrzebny do rozstrzygania konfliktów
  - Kolumny tworzy makro `$table->syncable()`, zachowanie daje trait `Syncable`
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
- `push_subscriptions` — user_id, session_id (koniec sesji zatrzymuje powiadomienia), endpoint, endpoint_hash, p256dh, auth, device_name, created_at.
- `user_settings` — user_id, JSON ustawień (motyw, widżety dashboardu, godzina digestu, kanały powiadomień, ustawienia kalendarza `calendar`: `hidden_layers` i `show_done` (od 2026-11-16), waluta domyślna, start tygodnia).
- `sync_counter` — jeden wiersz z globalnym licznikiem `rev` i `purge_horizon` (najnowszy `rev` wśród zapomnianych informacji o usunięciu).
- `sync_purges` — entity, record_id, space_id, rev, purged_at: informacja o rekordzie usuniętym na zawsze (bez treści), trzymana rok (`config/trash.php`).

### 4.3 Wspólne mechanizmy
- `tags` — id, space_id, name, color.
- `entity_tags` — entity_type, entity_id, tag_id.
- `entity_links` — source_type, source_id, target_type, target_id, origin (`manual` | `parsed`). Podstawa backlinków między WSZYSTKIMI modułami.
- `reminders` — id, space_id, entity_type, entity_id, title 🔐, remind_at (najbliższe wysłanie), rrule (bez COUNT i DTSTART), offset_minutes (np. „3 dni przed datą X”), remind_time (od 2026-11-16, migracja `2026_11_16_200000_add_remind_time_to_reminders_table`: własna godzina przypomnienia na pełne dni, HH:MM; puste = 7:00), channels (`push`, `email`), status (`scheduled` | `sent` | `dismissed` | `snoozed`), snoozed_until, last_sent_at (ustawia tylko serwer).
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
- `task_lists` — name (na razie tylko to; icon, color, sort_order w części 2).
- `tasks` — list_id (puste = Skrzynka; lista w koszu traktowana tak samo, a po jej trwałym usunięciu serwer czyści pole), parent_id, deleted_with_parent (podzadanie usunięte razem z rodzicem wraca z nim z kosza), title 🔐, notes 🔐, priority (1–4), status (`todo` | `done` | `cancelled`), due_date, due_time, rrule, repeat_from (`due` | `completion`), repeat_anchor, repeat_remaining, recurring_task_id, completed_at, sort_order.
  - Cykliczność od 2026-11-14 (migracja `2026_11_14_180000_add_recurrence_to_tasks_table`): `rrule` bez `DTSTART` i `COUNT`, `UNTIL` jako data (`UNTIL=20261231`); seria startuje od `repeat_anchor` (data wg wzorca; różni się od `due_date`, gdy przesunięto tylko jedno wystąpienie); `repeat_remaining` = ile wystąpień zostało łącznie z bieżącym (puste = bez limitu); `recurring_task_id` ma kopia w historii (status `done` albo `cancelled` = pominięte). Następny termin liczą `TaskSeries` (serwer) i `recurrence.ts` (aplikacja) według tych samych przypadków `web/src/modules/tasks/recurrence.cases.json`: od terminu = pierwsze wystąpienie po bieżącym i po dzisiejszym dniu; od ukończenia = pierwsze po dniu ukończenia. Zadania sprzed tej daty nie mają tych pól w Dexie (`undefined`).
  - Przypomnienie o zadaniu z datą, ale bez godziny, jest liczone od **7:00** tego dnia (decyzja 2026-11-15; wcześniej 9:00, zmiana razem z częścią 1 kalendarza). Przypomnienie „1 dzień przed” przychodzi dzień wcześniej o 7:00, także przy zadaniu z godziną.
  - `parent_id` jest od 2026-11-14 (migracja `2026_11_14_120000_add_parent_id_to_tasks_table`): podzadania jednopoziomowe, bez klucza obcego; podzadanie, którego rodzic jest usunięty, aplikacja pokazuje jako zadanie główne. sort_order powstanie z sortowaniem przeciąganiem (odłożone). due_time to tekst `HH:MM` na zegarze użytkownika.
  - Zadania zapisane na urządzeniach przed 2026-11-14 nie mają w Dexie pola `parent_id` (`undefined`, nie `null`), dopóki się nie zmienią: w kodzie sprawdzać je przez prawdziwość (`task.parent_id ? …`).

**Grafik pracy**
- `work_profiles` — employer, schedule_type (`fixed` | `shifts`), pay_type (`hourly` | `monthly`), hourly_rate_minor 🔐, monthly_salary_minor 🔐, daily_norm_minutes, weekly_norm_minutes, overtime_rules (JSON), default_start, default_end, default_break_minutes, active_from, active_to.
- `shift_templates` — work_profile_id, name, start, end, break_minutes, color.
- `work_entries` — work_profile_id, date, type (`work` | `vacation` | `sick` | `holiday` | `day_off`), start_at, end_at, break_minutes, shift_template_id, note.
- Polskie święta ustawowe liczone lokalnie (w tym ruchome).

**Trener: godziny i wynagrodzenie** (propozycja, szczegóły przy kroku 5.2)
- `coaching_contracts` — club_name, contract_type (`mandate` (zlecenie) | `specific_work` (dzieło) | `employment` | `other`), valid_from, valid_to, default_rates 🔐 (JSON: kwota domyślna dla każdego rodzaju wydarzenia, stawka za trening), tax_settings (JSON: zbieg tytułów ZUS, PIT-2, koszty uzyskania przychodu), notes.
- `coaching_schedule_slots` — contract_id, weekday, start, end, valid_from, valid_to (stały grafik tygodniowy).
- `coaching_events` — contract_id, kind (`training` | `match` | `tournament` | `tournament_organization` | `trip`), date, start, end, minutes, amount_minor 🔐 (puste = kwota domyślna), status (`planned` | `done` | `cancelled` | `moved`), substitution (`none` | `i_cover` | `covered_by_other`), schedule_slot_id, moved_to_event_id, note.
  - Trening ze stałego grafiku zapisywany dopiero przy wyjątku lub potwierdzeniu; zastępstwo, w którym ktoś zastępuje użytkownika, nie jest płatne.
- `coaching_reimbursements` — contract_id, date, kind (`fuel` | `other`), amount_minor 🔐, distance_km, event_id, note. Poza wynagrodzeniem i podatkiem (do potwierdzenia przy wdrożeniu).
- `coaching_payouts` — contract_id, month, gross_minor 🔐, net_calculated_minor 🔐, net_received_minor 🔐, transaction_id (wpływ w finansach).
- Stawki podatku i ZUS na każdy rok w konfiguracji serwera i klienta (obliczenia działają offline).

**Kalendarz**
- `events` — title 🔐, location 🔐, description 🔐 (Markdown), start_date, start_time, end_date, end_time (czas „na zegarze” użytkownika jak w zadaniach; bez godzin = całodniowe, `end_date` włącznie), rrule (bez `DTSTART`, seria od `start_date`; `COUNT` dozwolone), exdates (JSON: daty pominiętych wystąpień), color (`blue` | `cyan` | `green` | `yellow` | `orange` | `red` | `purple` | `gray`; puste = akcent; 2026-11-16 `teal`→`cyan`, `pink` zastąpiony `gray` po uwadze użytkownika). Migracja `2026_11_15_220000_create_events_table`. Serwer sprawdza, że koniec nie wypada przed początkiem, tylko gdy obie daty przychodzą w tej samej zmianie (synchronizacja wysyła tylko zmienione pola, a scalanie per pole i tak nie gwarantuje spójności); pilnuje tego formularz w aplikacji. Przypomnienie o wydarzeniu nie ma własnej reguły (`rrule` puste): wskazuje najbliższe wystąpienie, a po wysłaniu serwer wylicza następne z samego wydarzenia (`EventSeries`, z pominięciem `exdates`); wystąpienia i przypomnienia liczą `EventSeries` (serwer) i `modules/calendar/series.ts` (aplikacja) według wspólnych przypadków `series.cases.json`.
  - Wystąpienia serii wyliczane z `rrule` w strefie użytkownika (godzina stała przy zmianie czasu). Przypomnienia: domyślnie „1 dzień przed” = dzień wcześniej o 7:00 (także dla wydarzeń z godziną); całodniowe liczone od 7:00.
- Widok łączy `events` + wirtualne zdarzenia z innych modułów (rejestr „dostawców dat”, czyli warstwy: od 2026-11-16 wydarzenia, zadania z terminem i polskie święta; `web/src/modules/calendar/days.ts` + `settings.ts`). Widoki Agenda i Miesiąc w części 1, Dzień i Tydzień w części 2.

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
- `contacts` — name, nickname, relation, photo, birthday, phone 🔐, email 🔐, address 🔐, sizes 🔐 (JSON), likes 🔐, dislikes 🔐, favorite_food 🔐, favorite_drinks 🔐, allergies 🔐, family 🔐 (JSON: partner, dzieci, zwierzęta), important_dates (JSON), notes 🔐.
  - `birthday` nieszyfrowane, bo serwer musi wysyłać przypomnienia.

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
   - jeśli konflikt → **last-write-wins na poziomie pól** według czasu zmiany na urządzeniu (nie późniejszego niż czas serwera); pola nietknięte przez urządzenie zostają bez zmian; dla **notatek** dodatkowo „kopia konfliktu” (krok 2.3),
   - zmiana odrzucona na stałe (np. niepoprawne dane, brak uprawnień) zostaje na urządzeniu, nie jest ponownie wysyłana i jest pokazywana we wskaźniku,
   - idempotentność: `op_id` zapamiętywany (tabela `sync_ops`), ponowne wysłanie nie dubluje zmian,
   - zwraca wynik per operacja; klient usuwa z outboxa potwierdzone.
3. **Pull:** `GET /api/sync/pull?cursor=<rev>&limit=500` — zmiany o `rev > cursor` w przestrzeniach użytkownika (z nagrobkami), stronicowane. Pola 🔐 są odszyfrowywane na serwerze przed wysłaniem (przez HTTPS).
4. **Kiedy:** start aplikacji, zdarzenie `online`, powrót do aplikacji, po lokalnej zmianie (debounce ~2 s), co ~60 s gdy aplikacja widoczna, **Background Sync API** (Android Chrome). Serwer nie może sam powiadomić urządzenia (hosting współdzielony, bez WebSocketów), więc otwarte drugie urządzenie widzi zmianę z opóźnieniem do ~60 s albo od razu po powrocie do aplikacji.
5. **Pliki:** załączniki zapisywane lokalnie jako Blob w IndexedDB, wysyłane osobną kolejką (w kawałkach, jeśli duże — limity hostingu); miniatury generowane na kliencie.
6. **Wylogowanie** czyści lokalną bazę. Najpierw próba wysłania zmian z `outbox`, a gdy się nie uda, ostrzeżenie „Wyloguj mimo to / Anuluj” (od kroku 1.4). Zakończenie sesji przez serwer (401 potwierdzony powtórzeniem żądania po 300 ms: odwołane urządzenie, wygaśnięcie) czyści bazę bez pytania, także z niewysłanymi zmianami, żeby odwołanie zgubionego telefonu usuwało z niego odszyfrowane dane. Zalogowanie na inne konto też czyści bazę.
7. Wskaźnik w UI: „zsynchronizowano / X zmian czeka / offline / błąd”.
8. Operacje push to `create`, `update`, `delete`, `restore` (przywrócenie usuniętego rekordu: „Cofnij” i kosz) i `purge` (trwałe usunięcie elementu z kosza). Pull zwraca rekordy usunięte na zawsze jako `{entity, record: {id, rev}, purged: true}`; gdy kursor urządzenia jest starszy niż zapomniane informacje o usunięciu (`sync_counter.purge_horizon`), odpowiedź ma `reset: true` i urządzenie pobiera wszystko od nowa.
9. Rejestr encji synchronizowanych po obu stronach (front: nowy wpis w `SCHEMA_VERSIONS` w `web/src/db/db.ts`; back: model z traitem `Syncable` i `syncRules()` + wpis w `config/sync.php`, uprawnienia z `SpaceItemPolicy`) — dodanie modułu = wpis w rejestrze. Nazwa encji musi być taka sama po obu stronach.

---

## 6. PWA i mobile (Android priorytet, iOS przygotowany)

- **Manifest:** nazwa „BaseMind”, ikony (w tym maskable), `display: standalone`, `theme_color`, `background_color`, `shortcuts` (Szybki wydatek, Nowe zadanie, Szybka notatka, Dodaj link), `share_target` (Android).
- **Service Worker:** precache powłoki aplikacji, cache obrazków (od Etapu 4), `push` i `notificationclick` (akcje „Zrobione”, „Odłóż 1h”), `sync`, obsługa share target.
- **Instalacja:** własny baner (`beforeinstallprompt`), na iOS instrukcja „Udostępnij → Do ekranu początkowego”.
- **Aktualizacje:** nowa wersja czeka na „Odśwież”, żeby strona nie przeładowała się w trakcie pisania.
- **iOS:** `apple-touch-icon`, meta tagi, `env(safe-area-inset-*)`, bez ekranów startowych (dodać, gdy ktoś zacznie używać iPhone'a), push tylko po instalacji (iOS 16.4+).
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
- **Desktop:** boczny pasek, `Ctrl+K` (wyszukiwarka), `Q` (szybkie dodawanie).
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
- **Pola 🔐**: `sodium_crypto_secretbox` (XSalsa20-Poly1305) z losowym nonce per wartość; własny Cast Eloquent `SodiumEncrypted` (+ `SodiumEncryptedJson`). Format: `bm1:<id klucza>:<base64>`.
- **Pliki**: `sodium_crypto_secretstream_xchacha20poly1305` (strumieniowo, kawałki po 64 KiB, wykrywa zmianę, ucięcie i zamianę kawałków). Metody `Crypto::encryptStream` i `decryptStream`.
- **Klucz** `SODIUM_KEY` (32 bajty, base64) w `.env`, osobny od `APP_KEY`. Pola i pliki używają osobnych podkluczy (`sodium_crypto_kdf`). Identyfikator klucza to 4 bajty wyprowadzone z klucza, zapisane w szyfrogramie.
- **Rotacja:** `php artisan basemind:key --rotate` (stary klucz trafia do `SODIUM_PREVIOUS_KEYS`), potem `php artisan basemind:reencrypt`. Pliki: dopiero przy tabeli `attachments` (Etap 6.5), do tego czasu czytane starymi kluczami. Stare klucze zostają w menedżerze haseł, bo potrzebują ich starsze kopie bazy.
- **Ograniczenie (zaakceptowane przez użytkownika 2026-11-09, wrócić do tematu przy kolejnych użytkownikach):** `secretbox` nie wiąże szyfrogramu z wierszem ani kolumną. Atakujący z prawem zapisu do bazy nie odczyta danych, ale mógłby niezauważenie przenieść szyfrogram w inne miejsce.
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

> **Stan na 2026-11-10 — co już istnieje poza poniższym planem:** `api/app/Digest/` (sekcje porannego podsumowania), `web/src/modules/quickAddRegistry.ts` (rejestr arkusza [+]), `web/src/lib/quick-parser.ts`, `web/src/modules/today/widgets.ts` (rejestr widżetów), `api/app/Actions/Fortify/`, `api/app/Enums/`, `api/app/Models/Concerns/BelongsToSpace.php`, `api/app/Http/Responses/`, `api/lang/pl/`, `web/src/lib/` (`api`, `auth`, `money`, `theme`, `device`, `form-errors`), `web/src/i18n/pl.ts`, `web/src/modules/` (`auth`, `today`, `tasks`, `calendar`, `more`, `settings`, `design`, `registry.ts`), `web/public/app-icons/`, `web/public/theme-init.js`, `api/app/Casts/`, `api/app/Services/` (`Crypto`, `EncryptedFieldRotator`), `api/app/Exceptions/`. Rejestr synchronizacji jest w `api/config/sync.php`, logika w `api/app/Services/SyncService.php` (zamiast planowanego `app/Sync/`). Build zapisuje do `api/public/`: `assets/`, `app-icons/`, `index.html`, `sw.js`, `theme-init.js`, `manifest.webmanifest` (pliki w `.gitignore`).

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
│  └─ tests/               ← PHPUnit
└─ web/                    ← PWA (React + Vite)
   ├─ e2e/                 ← Playwright (własny serwer na porcie 8091, baza basemind_e2e)
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
3. (rozstrzygnięte: 7:00 ze zmianą w ustawieniach; zadania i wydarzenia na dziś, zaległe, płatności, urodziny; wysyłany tylko z treścią)
4. Reguły nadgodzin u obecnego pracodawcy, wynagrodzenie godzinowe czy miesięczne (Etap 5).
5. Waluty obce — z kursami NBP czy bez (Etap 3).
6. Automatyczne okładki z TMDB/OpenLibrary/IGDB (Etap 4).
7. Ewentualne rozszerzenie listy pól 🔐 (przy każdym module).
8. (rozstrzygnięte: ograniczenie zaakceptowane, pkt 8.4)
9. Czy `+liczba` w arkuszu [+] to wpływ (przyjęte przez Claude, do potwierdzenia przy 3.1).
10. (rozstrzygnięte 2026-11-15: wiersz znika, zostaje wpis w `sync_purges` bez treści, trzymany rok; pkt 13)
11. Trener (`plan.md`, 5.2): zwrot paliwa jako kwota z rachunku czy stawka za kilometr, opodatkowany czy nie (użytkownik jeszcze nie korzystał).

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
| 2026-11-04 | TypeScript 6.0 zamiast 7, bo `typescript-eslint` wymaga TS < 6.1; zostajemy przy ESLint z planu (szablon Vite proponował oxlint) | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-04 | `cn` (oficjalny pakiet autora shadcn, instalowany przez CLI) zamiast `clsx` + `tailwind-merge` | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-04 | Adresy URL po angielsku i bez przedrostka `/more` (`/tasks`, `/notes`, `/finance`) | Użytkownik |
| 2026-11-04 | Wybór motywu w ustawieniach: zgodny z systemem / jasny / ciemny; na razie zapamiętany na urządzeniu (`localStorage`), synchronizacja z `user_settings` w Etapie 1 | Użytkownik / Claude |
| 2026-11-05 | Konta zakładane z kodem zaproszenia (`BASEMIND_REGISTRATION_CODE`); pusty kod wyłącza rejestrację | Użytkownik |
| 2026-11-05 | Sesja wygasa po 30 dniach bezczynności (`SESSION_LIFETIME=43200`), bez opcji „zapamiętaj mnie”, żeby PWA nie wylogowywała na telefonie, a unieważnienie sesji działało od razu | Użytkownik |
| 2026-11-05 | Hasło: co najmniej 10 znaków; `users.id` pozostaje liczbą (konta tworzy serwer), `spaces.id` to UUID | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-04 | Dodatkowe biblioteki UI: `sonner` (powiadomienia), `react-day-picker` (kalendarz, przez shadcn), `tw-animate-css` (animacje shadcn); arkusz od dołu własny (Radix + `motion`) zamiast `vaul` | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-04 | Jeden kolor akcentu dla całej aplikacji, bez osobnych kolorów modułów | Użytkownik |
| 2026-11-04 | Kolor akcentu: niebieski `#2563EB` zamiast indygo (nie myli się z kolorami statusów) | Użytkownik |
| 2026-11-04 | Moduł lokalizatora w UI nazywa się „Lokalizator rzeczy” (samo „Lokalizator” mogło mylić) | Użytkownik |
| 2026-11-04 | Usunięte nieużywane pliki frontendu Laravela (`api/package.json`, `api/vite.config.js`, `api/resources/js`, `api/resources/css`) — frontend jest w `web/` | Użytkownik |
| 2026-11-04 | TanStack Router z trasami w kodzie (bez generatora plików) | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-04 | CSP: style inline dozwolone (Radix UI), skrypty tylko z `'self'`; `img-src` bez zewnętrznych domen do czasu Etapu 4 | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-05 | Szyfrowanie: osobne podklucze dla pól i plików; identyfikator klucza wyprowadzany z klucza zamiast ręcznej numeracji; rotacja jako dwie komendy (`basemind:key --rotate`, `basemind:reencrypt`), rotacja plików odłożona do Etapu 6.5 | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-05 | `basemind:key` nie wypisuje klucza (tylko z `--show`) i nie nadpisuje istniejącego, żeby klucz nie trafił do historii terminala i żeby nie stracić danych przez pomyłkę | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-09 | Szyfrowanie pól zostaje przy `secretbox` bez wiązania szyfrogramu z wierszem i kolumną (na razie jeden użytkownik) | Użytkownik |
| 2026-11-09 | Wylogowanie z niewysłanymi zmianami: próba wysłania, potem ostrzeżenie „Wyloguj mimo to / Anuluj” (krok 1.4) | Użytkownik |
| 2026-11-09 | Zakończenie sesji przez serwer kasuje lokalne dane bez pytania, także niewysłane zmiany (ochrona zgubionego telefonu) | Użytkownik |
| 2026-11-09 | Przypomnienia: teraz silnik i wysyłka (test z `/design`), przypomnienia z modułów i kanały dla typu razem z modułami | Użytkownik |
| 2026-11-09 | Poranne podsumowanie: 7:00 ze zmianą w ustawieniach, zawartość jak w pkt 12, wysyłane tylko z treścią | Użytkownik |
| 2026-11-09 | Tytuły przypomnień szyfrowane (nowe pole 🔐) | Użytkownik |
| 2026-11-09 | Godziny ciszy wstrzymują oba kanały do ich końca; `offset_minutes` zamiast `offset_rule`; odkładanie przez `snoozed_until`, żeby nie przesuwać terminów cyklicznych; powiadomienia wiązane z sesją | Claude (działanie zaakceptowane przez użytkownika po teście) |
| 2026-11-09 | Pakiety: `minishlink/web-push` 11, `rlanvin/php-rrule` 3 (backend), `minisearch` 7 (frontend) | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-09 | Pobieranie zmian co 60 s, gdy aplikacja jest widoczna, bez skracania interwału | Użytkownik |
| 2026-11-09 | Wyszukiwanie: najpierw silnik i ekran na tagach, kolejne moduły dopisują się do rejestru. Indeks tylko w pamięci, ostatnie wyszukiwania w lokalnej bazie (kasowane przy wylogowaniu) i tylko te, które coś znalazły | Użytkownik / Claude |
| 2026-11-09 | Tagi i powiązania: teraz dane i synchronizacja, interfejs i parser razem z notatkami (2.3) | Użytkownik |
| 2026-11-09 | Tag i źródło powiązania w tej samej przestrzeni, cel powiązania może być w innej; duplikaty z pracy offline dozwolone na serwerze, ukrywane w interfejsie | Claude (zaakceptowane przez użytkownika) |
| 2026-11-09 | Ekrany startowe iOS pominięte, cache obrazków przeniesiony do Etapu 4 | Claude (zaakceptowane przez użytkownika) |
| 2026-11-09 | Aktualizacje PWA na żądanie („Odśwież”) zamiast automatycznych; baner instalacji po zamknięciu wraca po 30 dniach | Claude (działanie zaakceptowane przez użytkownika po teście) |
| 2026-11-09 | Konflikty synchronizacji: wygrywa późniejsza zmiana każdego pola (`field_stamps`), czas urządzenia ograniczony czasem serwera | Claude (zaakceptowane przez użytkownika) |
| 2026-11-09 | Kopia konfliktu notatek przeniesiona z 1.4 do 2.3 | Claude (zaakceptowane przez użytkownika) |
| 2026-11-09 | Zmiany odrzucone przez serwer zostają w `outbox`, nie są ponownie wysyłane i są pokazywane we wskaźniku | Claude (zaakceptowane przez użytkownika) |
| 2026-11-09 | Pakiet `uuid` do UUIDv7, `fake-indexeddb` w testach; repozytorium odrzuca lokalnie zapis do przestrzeni bez prawa edycji, zanim zmiana utknie w `outbox` | Claude (zaakceptowane przez użytkownika 2026-11-14) |
| 2026-11-10 | Pojedynczy 401 nie wylogowuje: decyduje powtórzone żądanie po 300 ms; przy sprawdzaniu konta inne błędy (403, 404, 429) nie kasują danych | Użytkownik / Claude |
| 2026-11-10 | Lokalnie `ThreadsPerChild 1` i `KeepAlive Off` zamiast `config:cache` (ryzyko testów na prawdziwej bazie) | Użytkownik / Claude |
| 2026-11-09 | Zadania w dwóch częściach; 1.10 połączone z 2.1; przypomnienia przeniesione do części 1, bo mają być w arkuszu [+] | Użytkownik |
| 2026-11-09 | Tytuł i notatka zadania szyfrowane (nowe pola 🔐) | Użytkownik |
| 2026-11-09 | Zaległe jako sekcja na górze zakładki Dziś zamiast osobnego widoku; zadania bez listy widoczne jako Skrzynka (`list_id` puste), bez tworzonej automatycznie listy | Użytkownik |
| 2026-11-09 | Odhaczanie polem wyboru, swipe w prawo: na jutro, w lewo: usuń z „Cofnij” | Użytkownik |
| 2026-11-09 | Kosz z przywracaniem przez 30 dni (w planie 1.12) | Użytkownik |
| 2026-11-09 | Arkusz [+] rozpozna typ po treści: `-liczba` to wydatek, `+liczba` to wpływ (3.1; „wpływ” potwierdzony przez użytkownika 2026-11-14) | Użytkownik |
| 2026-11-09 | „Zrobione” na powiadomieniu odhacza zadanie; samo dotknięcie treści tylko otwiera aplikację | Użytkownik / Claude |
| 2026-11-09 | Skrót szybkiego dodawania: klawisz Q (jak w Todoist), nie działa podczas pisania ani przy otwartym oknie; „Cofnij” przez operację `restore`, a nie kopię rekordu | Claude (zaakceptowane przez użytkownika po teście) |
| 2026-11-09 | Przypomnienie o zadaniu z datą bez godziny liczone od 9:00 tego dnia | Użytkownik |
| 2026-11-09 | Ręczna synchronizacja po dotknięciu ikony stanu, jako dodatek do pobierania co 60 s | Użytkownik |
| 2026-11-09 | Bez imienin w całej aplikacji; urodziny zostają | Użytkownik |
| 2026-11-09 | Szybka notatka na dashboardzie przeniesiona do 2.3 | Użytkownik |
| 2026-11-09 | Dashboard: zaślepki Zadania, Wydarzenia i Ostatnie wydatki jako widżety do czasu powstania modułów; powitanie z `display_name`, przy pustym samo pozdrowienie | Użytkownik |
| 2026-11-09 | Układ dashboardu w `user_settings` (`dashboard`: `order`, `hidden`), lokalnie w `meta`, synchronizowany jak motyw; kolejność przyciskami góra/dół zamiast przeciągania; identyfikatory widżetów niesprawdzane listą na serwerze, bo urządzenia mogą mieć różne wersje aplikacji | Claude (zaakceptowane przez użytkownika) |
| 2026-11-14 | Nowy moduł „Trener: godziny i wynagrodzenie” (`plan.md`, 5.2), robiony zaraz po grafiku pracy (5.1): treningi ze stałego grafiku z wyjątkami (przeniesienie, odwołanie, zastępstwo w obie strony), mecze, turnieje, organizacja turnieju, wyjazdy, zwrot paliwa osobno; stawka na godzinę dla każdej pozycji oraz podsumowania miesięczne i roczne; wypłata jako wpływ w finansach, wydarzenia w kalendarzu z przypomnieniami, widżet | Użytkownik |
| 2026-11-14 | Kalkulator brutto → netto z wyborem rodzaju umowy, na start umowa zlecenia (umowa użytkownika), z przełącznikami zbiegu tytułów ZUS, PIT-2 i kosztów uzyskania oraz polem „faktycznie otrzymane netto”; kwoty od klubu wpisywane brutto, rozliczenie miesięczne | Użytkownik / Claude |
| 2026-11-14 | Dalej: część 2 zadań, zaraz po niej kosz (1.12); sortowanie przeciąganiem odłożone | Użytkownik |
| 2026-11-14 | Kolejność części 2 zadań: podzadania z notatką w Markdown → cykliczność razem z resztą parsera → kanały powiadomień dla typu; tagi i powiązania zadań przeniesione do 2.3 | Użytkownik (propozycja Claude) |
| 2026-11-14 | Podzadania: pełne zadania (własny termin, priorytet, przypomnienie), jeden poziom; podzadanie z terminem widoczne w „Dziś”/„Nadchodzące” z nazwą rodzica, bez terminu tylko w środku rodzica; zakładka „Listy” pokazuje tylko zadania główne | Użytkownik |
| 2026-11-14 | Odhaczenie zadania z otwartymi podzadaniami pyta za każdym razem („Odhacz wszystkie” z „Cofnij” / „Tylko to zadanie” / „Anuluj”); odhaczenie wszystkich podzadań nie zamyka rodzica | Użytkownik |
| 2026-11-14 | „Zrobione” na powiadomieniu przy otwartych podzadaniach niczego nie zmienia na serwerze (409), tylko otwiera aplikację na zadaniu z pytaniem | Użytkownik |
| 2026-11-14 | Usunięcie zadania usuwa jego podzadania; „Cofnij” przywraca tylko te usunięte razem z nim (lista trzymana w pamięci przez czas „Cofnij”; kosz 1.12 musi to rozwiązać trwale) | Użytkownik / Claude |
| 2026-11-14 | Notatka zadania: zwykłe pole tekstowe + przełącznik „Podgląd” (`react-markdown` + `remark-gfm`, ładowane na żądanie); bez surowego HTML, obrazki jako linki; CodeMirror dopiero przy notatkach (2.3) | Użytkownik |
| 2026-11-14 | Przejścia rodzic ↔ podzadanie w oknie zadania podmieniają wpis historii (`replace`), więc zamknięcie lub „wstecz” zawsze wraca do listy | Claude (wykryte testem e2e) |
| 2026-11-14 | Testy API zostają w PHPUnit (Pest porzucony: inna składnia, bez dodatkowej korzyści, przepisywanie 247 testów nic nie daje) | Użytkownik |
| 2026-11-14 | Larastan 3 w `api/` (poziom 5, `parseModelCastsMethod: true`, `composer analyse`); uwagi poprawiane u źródła, bez wyciszeń i bez pliku baseline | Użytkownik / Claude |
| 2026-11-14 | Interfejsy `SpaceScoped` i `SyncableModel` (`app/Models/Contracts/`) opisują kolumny z makra `syncable()`; `SyncService` i `SpaceItemPolicy` przyjmują tylko takie modele (typy PHP), test pilnuje, że każdy model z `config/sync.php` je implementuje; tabela `space_members` przez klasę `SpaceMember` | Claude (w ramach zgody na Larastan) |
| 2026-11-14 | Cykliczność zadań: pełny zestaw wzorców (codziennie, wybrane dni tygodnia, dzień miesiąca lub „ostatni piątek”, co rok, co N dni/tygodni/miesięcy) jako rrule; domyślnie „od terminu” z przełącznikiem „od ukończenia”; koniec po dacie (`UNTIL`) lub po N razach; odhaczenie przesuwa zadanie na następny termin, a w „Ukończonych” zostaje kopia; podzadania wracają nieodhaczone; przypomnienie idzie za terminem; „na jutro” przesuwa tylko to wystąpienie; „Pomiń” w oknie zadania (kopia ze statusem `cancelled`) | Użytkownik |
| 2026-11-14 | Parser szybkiego dodawania, część 2: powtarzanie, godzina, daty (`15.11`, `15 listopada`, „pojutrze”, „za 3 dni”, „w przyszły wtorek”), `#lista`, „przypomnij 30 min” | Użytkownik |
| 2026-11-14 | Następny termin serii liczony po obu stronach: na kliencie paczka `rrule` (npm; działa offline), na serwerze `rlanvin/php-rrule` („Zrobione” na powiadomieniu); wspólne przypadki testowe pilnują zgodności | Claude (zaakceptowane przez użytkownika) |
| 2026-11-14 | Podzadania nie mogą się powtarzać (pole „Powtarzaj” ukryte); odhaczenie zadania cyklicznego z otwartymi podzadaniami nie pyta, także „Zrobione” na powiadomieniu (podzadania wracają otwarte z następnym wystąpieniem); terminy podzadań przesuwają się o tyle dni co rodzic; zadanie z „godziną” lub powtarzaniem z arkusza [+] bez daty dostaje dziś lub pierwsze wystąpienie; „co tydzień/miesiąc/rok” bez dnia bierze dzień z terminu | Claude (potwierdzone przez użytkownika 2026-11-15) |
| 2026-11-14 | Playwright w `web/` (`pnpm e2e`): zbudowana aplikacja na serwerze PHP (`php -S`, port 8091) z bazą `basemind_e2e`, ustawienia przez zmienne środowiskowe zamiast `api/.env`, testowy klucz szyfrowania; przed czyszczeniem bazy skrypt sprawdza jej nazwę; emulacja Pixel 7, własny Chromium Playwrighta, nowe konto w każdym teście | Użytkownik / Claude |
| 2026-11-15 | Powiadomienie push bez stałej treści „Przypomnienie z BaseMind” (sam tytuł; mail: temat bez zmian, w treści sam tytuł). Wariant z terminem i listą w treści odłożony na później | Użytkownik || 2026-11-15 | Kanały powiadomień dla typu: w `/settings/notifications` sekcja „Według typu” (przełączniki Telefon i E-mail); zadania domyślnie tylko telefon; przełączniki ogólne nadrzędne; bez wyboru kanału dla pojedynczego przypomnienia i bez opcji „tylko w podsumowaniu”. Typy w `api/config/notifications.php` (klucz = `entity_type` przypomnienia) i `web/src/modules/notificationTypes.ts`; zapis bez `types` (starsza wersja aplikacji) zachowuje zapisane typy | Użytkownik (zakres) / Claude (szczegóły) |
| 2026-11-15 | Kosz: zadania (z podzadaniami jako jedna pozycja) i listy zadań; przypomnienia, tagi i powiązania idą za elementem; przywrócenie podzadania przywraca rodzica bez jego innych podzadań; usunięta lista zostawia zadaniom `list_id` (widoczne w Skrzynce do przywrócenia listy); „Usuń na zawsze” i „Opróżnij kosz” z potwierdzeniem; 30 dni; wejście tylko z „Więcej” | Użytkownik |
| 2026-11-15 | Kosz technicznie: pole `tasks.deleted_with_parent`, operacja `purge`, po trwałym usunięciu wpis w `sync_purges` bez treści przez rok, potem pełne pobranie dla starszych urządzeń; czyszczenie codziennie o 3:30; „Usuń na zawsze” jako ikona ✕ w wierszu (brak komponentu menu); kopia wystąpienia cofnięta przez „Cofnij” usuwana od razu | Claude (zaakceptowane przez użytkownika po teście) |
| 2026-11-15 | Arkusz [+]: pole „Lista”; domyślnie lista otwarta na ekranie zadań, `#lista` w tekście ją zmienia, wybór ręczny wygrywa | Użytkownik |
| 2026-11-15 | Limity logowania i rejestracji konfigurowalne (`BASEMIND_THROTTLE_AUTH_ROUTES`, `BASEMIND_THROTTLE_LOGIN_PER_IP`, domyślnie 30 i 20/min), podniesione tylko dla testów e2e | Claude |
| 2026-11-15 | Kalendarz (2.2) w dwóch częściach. Część 1: wydarzenia (tytuł, miejsce, notatka 🔐; cały dzień / godziny; wielodniowe; kolor z palety; cykliczność z edytora zadań, wystąpienia wyliczane z reguły), widoki Agenda (domyślny na telefonie) i Miesiąc, warstwy (wydarzenia, zadania z terminem, polskie święta), widżet dziś i jutro, sekcja podsumowania, zakładka w arkuszu [+], wyszukiwanie, kosz, typ w kanałach powiadomień. Część 2: widoki Dzień i Tydzień, zmiana pojedynczego wystąpienia („tylko to”, „to i następne”, „wszystkie”), przeciąganie, duplikowanie. iCal później (🔒); bez synchronizacji z Google Calendar i bez zaproszeń | Claude (zaakceptowane przez użytkownika) |
| 2026-11-15 | Zadania w kalendarzu: warstwa domyślnie włączona; zaległe w swoim dniu i dziś w sekcji „Zaległe”; zrobione domyślnie ukryte, z przełącznikiem w ustawieniach kalendarza | Użytkownik |
| 2026-11-15 | Przypomnienie o wydarzeniu domyślnie 1 dzień przed; „1 dzień przed” zawsze dzień wcześniej o 7:00 (wydarzenia i zadania, także z godziną); zadania bez godziny liczone od 7:00 zamiast 9:00 | Użytkownik |
| 2026-11-15 | Dotknięcie powiadomienia otwiera samo wydarzenie lub zadanie (nie ekran główny) | Użytkownik |
| 2026-11-15 | Wydarzenia przechowują daty i godziny „na zegarze” użytkownika (`start_date`, `start_time`, `end_date`, `end_time`) zamiast `start_at`/`end_at`/`all_day`, jak zadania: seria zachowuje godzinę przy zmianie czasu, a całodniowe = brak godzin; pominięte wystąpienia w `exdates`; kolor jako nazwa z palety 8 kolorów | Claude (potwierdzone przez użytkownika 2026-11-16) |
| 2026-11-15 | Przypomnienie o wydarzeniu bez własnej reguły: wskazuje najbliższe wystąpienie, serwer po wysłaniu wylicza następne z wydarzenia (z pominiętymi wystąpieniami i `COUNT`); na powiadomieniu o wydarzeniu przycisk „OK” zamiast „Zrobione” (zamyka tylko to przypomnienie, seria idzie dalej) | Claude (potwierdzone przez użytkownika 2026-11-16) |
| 2026-11-16 | Wydarzenie może mieć kilka przypomnień (każde osobnym rekordem `reminders`); całodniowe: w dniu, 1, 2, 3 dni, tydzień i miesiąc (30 dni) wcześniej, zawsze o 7:00; z godziną: w chwili rozpoczęcia, 15, 30 min, 1 godz., dzień wcześniej o 7:00; przy przełączeniu „Cały dzień” zostają pasujące, a gdy żadne nie pasuje — dzień wcześniej. Kolory: zieleń, czerwień i róż były zbyt podobne — nowa paleta różni się odcieniem i jasnością (różowy zastąpiony szarym, morski turkusowym) | Użytkownik |
| 2026-11-16 | „Miesiąc wcześniej” = 30 dni (np. dla 31.03 przypomnienie 1.03); bez zmiany zapisu przypomnień | Użytkownik |
| 2026-11-16 | Przypomnienie „Własne…” przy wydarzeniach i zadaniach: liczba + jednostka (min / godz. / dni / tyg.), przy dniach i tygodniach własna godzina (domyślnie 7:00). Zapis: nowa kolumna `reminders.remind_time` (HH:MM, puste = 7:00), liczy się tylko dla pełnych dni; reguła we wspólnym `ReminderMoment` / `reminder-moment.ts` | Użytkownik |
| 2026-11-16 | Własna godzina w wydarzeniu z godziną i w zadaniu dopiero od 1 dnia wcześniej (w tym samym dniu mogłaby wypaść po rozpoczęciu; do tego są minuty i godziny); w wydarzeniu całodniowym także „w dniu” (od 0 dni). Przy przełączeniu „Cały dzień” zostają przypomnienia, które pasują do nowego rodzaju (całodniowe: pełne dni) | Claude (2026-11-16 zmienione przez użytkownika, wiersz niżej) |
| 2026-11-16 | Zadanie bez godziny traktowane jak wydarzenie całodniowe: własna godzina także „w dniu terminu” (od 0 dni, np. „W dniu, 9:30”). Zadanie z godziną: od 1 dnia; gdy zadanie z takim przypomnieniem dostanie godzinę, przypomnienie zamienia się na „W chwili terminu” (`fitTaskTiming` w `modules/tasks/reminder.ts`) | Użytkownik (wariant B) |
| 2026-11-16 | Widoki kalendarza (krok 5, szkic zaakceptowany): w Agendzie puste dni pomijane (poza dziś), przeszłość przyciskiem „Pokaż wcześniejsze dni”; „Pokazuj zrobione zadania” w arkuszu warstw (nie w osobnych ustawieniach); domyślny widok: telefon Agenda, komputer Miesiąc, potem ostatni wybór na urządzeniu; w Miesiącu wydarzenia kolorową kropką, zadania pustym kółkiem, święta czerwonym numerem. Ustawienia w `user_settings.calendar` (`hidden_layers`: ukryte warstwy, więc nowa warstwa startuje widoczna; `show_done`) | Użytkownik |
| 2026-11-16 | Odrzucone zmiany synchronizacji serwer zapisuje w logu (`Sync operation rejected`: encja, operacja, id, powód, nazwy pól bez wartości). Zawężenie dozwolonych wartości wymaga poprawki danych na urządzeniach (`SCHEMA_UPGRADES` w `web/src/db/db.ts`); pierwsza: stare kolory wydarzeń `pink`/`teal` | Użytkownik |
| 2026-11-17 | Krok 6 kalendarza: widżet „Wydarzenia” pokazuje dziś i jutro, zakończone wydarzenia wyszarzone (nie chowane), bez świąt i zadań; sekcja „Wydarzenia dziś” jako pierwsza w porannym podsumowaniu; zakładka „Wydarzenie” w [+] bez miejsca w parserze (pole na pełnym ekranie wydarzenia); [+] otwarty z ekranu Kalendarz wybiera „Wydarzenie”, a w widoku Miesiąc podstawia zaznaczony dzień | Użytkownik |
| 2026-11-17 | Parser wydarzeń: wspólne reguły dat z zadaniami (`lib/date-rules.ts`) + zakresy godzin (`10-12`, `9:30-11`, `od 10 do 12`), minuty tylko po dwukropku; bez godziny = całodniowe, domyślnie 1 godz. i przypomnienie dzień wcześniej; „2-3” w tytule czytane jako godziny — zostaje, bo widać to w polach | Claude (zaakceptowane przez użytkownika) |
| 2026-11-17 | Wydarzenie kończące się dokładnie o 00:00 nie należy do dnia końca (kalendarz, widżet, podsumowanie); ostatni dzień długiego wydarzenia czyta się „do 24:00” | Claude (zaakceptowane przez użytkownika) |
| 2026-11-17 | Część 2 kalendarza w 5 krokach (Dzień/Tydzień, zmiana jednego wystąpienia, przeciąganie, duplikowanie, testy). Tydzień: na telefonie 3 dni od wybranego dnia, zakładka nazywa się wtedy „3 dni”; na komputerze pon–nd. Duplikat wystąpienia serii = pojedyncze wydarzenie w dniu tego wystąpienia. Przeciąganie także zadań z godziną; przeciąganie w Miesiącu odłożone | Użytkownik |
| 2026-11-17 | Zmiana jednego wystąpienia: wyjątek jako osobne wydarzenie powiązane z serią (`events.series_id`, `series_date`) z datą w `exdates` serii; „to i następne” dzieli serię (`UNTIL` / nowa seria z resztą `COUNT`); „wszystkie” ze zmianą daty przesuwa całą serię | Claude (zaakceptowane przez użytkownika) |

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

**4a. Jeden wątek Apache'a** (kopie: `httpd-mpm.conf.bak-basemind-20261110`, `httpd-vhosts.conf.bak-basemind-20261110`): w `extra/httpd-mpm.conf`, sekcja `mpm_winnt_module`, `ThreadsPerChild 1` (było 150); w bloku BaseMind w `extra/httpd-vhosts.conf` `KeepAlive Off`. Powód w pkt 15. Dotyczy całego XAMPP, także innych projektów.

**5. Bazy danych** (MariaDB, root bez hasła):
```sql
CREATE DATABASE basemind CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE basemind_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**6. Narzędzia i PATH użytkownika:** Composer w `%LOCALAPPDATA%\Programs\composer\` (`composer.phar` + `composer.bat` wywołujący `C:\xampp\php\php.exe`); pnpm: `npm install -g pnpm`; do PATH użytkownika dodane `%LOCALAPPDATA%\Programs\composer` i `C:\xampp\php`.

**7. Pliki tylko lokalne w projekcie (w `.gitignore`):** `api/.env` (zawiera `APP_KEY` — **bez niego nie odczytamy zaszyfrowanych sesji/cookies**; oraz `SODIUM_KEY`, lokalny identyfikator `2ca17bb1` — **utrata = utrata zaszyfrowanych danych**, trzymać kopię w menedżerze haseł), `api/vendor/`, `node_modules/`.
Po świeżym `git clone`: `cd api && composer install && copy .env.example .env && php artisan key:generate && php artisan basemind:key && php artisan migrate` (gdy w bazie są już zaszyfrowane dane, zamiast `basemind:key` wpisać `SODIUM_KEY` z menedżera haseł) (+ uzupełnić `BASEMIND_OWNER_EMAIL` i `BASEMIND_REGISTRATION_CODE`), potem `cd ../web && pnpm install && pnpm build`.

`api/.env` zawiera też `BASEMIND_REGISTRATION_CODE` (losowy kod do zakładania kont, tylko lokalny) i `SESSION_LIFETIME=43200`. Bez kodu rejestracja jest wyłączona; aby założyć kolejne konto, wystarczy odczytać lub ustawić kod w tym pliku.

`api/.env` zawiera też `VAPID_PUBLIC_KEY` i `VAPID_PRIVATE_KEY` (`php artisan basemind:vapid`). Przy nowych kluczach telefon trzeba podłączyć do powiadomień od nowa. Po świeżym `git clone` uruchomić tę komendę z `OPENSSL_CONF` (niżej).

**7c. `OPENSSL_CONF` (tylko Windows z XAMPP):** PHP nie generuje kluczy EC bez wskazania konfiguracji OpenSSL, a musi to być zmienna środowiskowa ustawiona przed startem procesu (wpis w `.env` nie działa). Potrzebne do `basemind:vapid` i wysyłki powiadomień, więc także do harmonogramu. W PowerShell:
```powershell
$env:OPENSSL_CONF='C:\xampp\apache\conf\openssl.cnf'
php artisan schedule:work   # z katalogu api/
```

**7a. Dane tylko lokalne:** baza `basemind` trzyma prawdziwe konto użytkownika (nie ma go w git). Przy reinstalacji XAMPP lub nowym komputerze trzeba zrobić kopię bazy lub założyć konto od nowa kodem zaproszenia. Na razie konto ma tylko dane z testów (tagi, przypomnienia, subskrypcję push telefonu) i ustawienia.

**7d. Testy e2e:** baza `basemind_e2e` (utf8mb4_unicode_ci) na lokalnym MariaDB, czyszczona przy każdym uruchomieniu `pnpm e2e`. Przeglądarka Playwrighta (Chromium) w `%LOCALAPPDATA%\ms-playwright` — po świeżym `git clone` lub aktualizacji `@playwright/test`: `cd web && pnpm exec playwright install chromium`.

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
- **Composer może nie zapisać paczek do `vendor/` (`Permission denied`) przy pobieraniu równoległym.** Pomaga `$env:COMPOSER_MAX_PARALLEL_HTTP='1'` i ponowne uruchomienie. Po nieudanym `composer require` sprawdzić, czy w `composer.json` nie zostało `"*"` zamiast wersji.
- **Harmonogram i powiadomienia lokalnie wymagają `OPENSSL_CONF`** (pkt 14, 7c). Bez tego przypomnienia zapiszą się jako wysłane, a push się nie uda.
- **Pola zapisywane tylko przez serwer (`last_sent_at`) nie mogą trafić do `create` z klienta,** bo serwer odrzuci zmianę jako nieznane pole. Dlatego są opcjonalne w typie TS i wymienione w `syncReadOnlyFields()`.
- **Nowe pole 🔐 w istniejącej tabeli wymaga zaszyfrowania starych wierszy,** inaczej ich odczyt się nie uda (`basemind:reencrypt` obsługuje tylko wartości już zaszyfrowane).
- **Web Worker wyszukiwarki nie działa w Vitest (jsdom).** Logika jest w `search/engine.ts` i tam ją testować; sam worker sprawdzać w prawdziwym buildzie.
- **`web/src/search/sources.ts` trafia do workera:** tylko importy typów, bez Reacta i ikon (ikony są w `presentation.ts`).
- **Tolerancja literówek w MiniSearch nie obejmuje przestawionych liter** (liczą się jako dwa błędy), dlatego `engine.ts` szuka też wariantów z zamienionymi sąsiednimi literami.
- **Tryb samolotowy nie odcina serwera przy teście przez USB** — przekierowanie portu idzie po kablu. Do testu offline odłączyć kabel. Po ponownym podłączeniu zdarzenie `online` nie występuje: synchronizacja rusza po powrocie do aplikacji albo w ciągu minuty.
- **Laravel domyślnie przycina tekst i zamienia puste napisy na `null`.** Dla `api/sync/*` jest to wyłączone w `bootstrap/app.php`, żeby dane zapisywały się dokładnie tak, jak je wpisano.
- **Kod importowany przez Service Workera (`web/src/sync/push.ts`, `web/src/db/db.ts`) nie może używać aliasu `@/` ani DOM.** Worker nie ma też `document.cookie`, token CSRF czyta z `cookieStore`.
- **Tabela testowa z `Schema::create` wymaga `DatabaseMigrations`, nie `RefreshDatabase`** (DDL kończy transakcję); wzór w `tests/Feature/SyncTest.php`.
- **Test na telefonie: działający ekran nie znaczy, że jest połączenie.** Service Worker pokazuje aplikację także przy przerwanym przekierowaniu portu (zamknięty Chrome lub `chrome://inspect`, kabel). Sprawdzenie: `http://localhost:8080/api/health` na telefonie omija Service Workera; nowe wpisy w `basemind-access.log` pokazują, czy żądanie dotarło.
- **Nie używać ścieżki `/icons/`:** domyślna konfiguracja Apache (XAMPP i wiele hostingów) ma `Alias /icons/` na własny katalog, więc pliki z `public/icons` zwracają 404. Ikony PWA są w `/app-icons/`.
- **`shadcn add` czyta alias `@/*` z głównego `web/tsconfig.json`** — bez wpisu `paths` tworzy dosłowny katalog `web/@/`.
- **`shadcn add` przerywa się bez komunikatu, gdy pyta o nadpisanie istniejącego pliku** (flaga `--yes` tego nie obejmuje) i pomija kolejne komponenty. Po dodaniu sprawdzić listę plików; odpowiedź można podać przez potok: `'n' | pnpm dlx shadcn@latest add ...`.
- **Nowe komponenty shadcn mają rozmiary pod myszkę (`h-9`)** — dostosować do 44 px, a teksty (np. „Close”) przenieść do `src/i18n/pl.ts`.
- **Git w PowerShell 5.1 gubi cudzysłowy w treści commita** — nie używać `"` w opisach.
- **`Set-Location` w PowerShell zostaje między poleceniami** — po `cd api` kolejne polecenie startuje w `api/`. Używać pełnych ścieżek i wracać do katalogu głównego.
- **Nigdy nie wypisywać `SODIUM_KEY` w terminalu ani w sesji Claude** (trafiłby do historii i logów). `basemind:key` zapisuje go tylko do `.env`; użytkownik kopiuje go stamtąd sam. Do sprawdzania służy identyfikator klucza.
- **Testy nie używają prawdziwego klucza ani `.env`:** `phpunit.xml` ustawia jawny klucz testowy, a test komendy `basemind:key` działa na tymczasowym `.env`. Nowe testy tej komendy muszą robić tak samo (`useEnvironmentPath`).
- **Model z polami 🔐 nie wymaga rejestracji w rotacji:** `basemind:reencrypt` sam skanuje `app/Models` i wykrywa casty `SodiumEncrypted`. Kolumny takich pól: `TEXT`, a dla długich treści `MEDIUMTEXT`.
- **Opublikowanych wpisów w `SCHEMA_VERSIONS` (`web/src/db/db.ts`) nie wolno zmieniać** — działają jak migracje na każdym urządzeniu; zmiana schematu to nowy wpis na końcu listy.
- **Zawężenie dozwolonych wartości (np. zmiana nazwy koloru, usunięcie opcji) wymaga poprawki danych na urządzeniach.** Urządzenie może mieć jeszcze rekordy i niewysłane zmiany ze starą wartością; serwer odrzuci je na zawsze (`invalid`), a telefon pokaże czerwony trójkąt. Przypadek z 2026-11-16: wydarzenie `pink` utworzone tuż przed zmianą palety. Rozwiązanie: nowy pusty wpis w `SCHEMA_VERSIONS` z funkcją w `SCHEMA_UPGRADES` (`web/src/db/upgrades.ts`), która poprawia tabelę i kolejkę `outbox` i zdejmuje `rejected_reason` z naprawionych zmian; na serwerze migracja danych, jeśli tam też są stare wartości. Odrzucenia serwer zapisuje w logu (`Sync operation rejected`: encja, operacja, powód, nazwy pól bez wartości).
- **Testy frontendu używają `fake-indexeddb`** (`src/test/setup.ts`): sprawdzają logikę, ale nie zastępują testu w prawdziwej przeglądarce.
- **Po nowym buildzie PWA działa na starej wersji, dopóki nie klikniesz „Odśwież”** w banerze (Service Worker pobiera nową w tle). Baner pojawia się kilka sekund po otwarciu. Żeby sprawdzić go bez zmian w kodzie, wystarczy dopisać komentarz na końcu zbudowanego `api/public/sw.js`.
- **Android pokazuje zwykle cztery pozycje po przytrzymaniu ikony, a jedną zajmuje „Ustawienia witryn” Chrome'a.** Z czterech skrótów w manifeście widać trzy pierwsze, więc najważniejsze muszą być na początku listy.
- **Dotknięcie treści powiadomienia też wysyła `dismiss`.** Przycisk „Zrobione” odróżnia od tego pole `done` w treści żądania (`web/src/sw.ts`). Nie opierać skutków ubocznych na samym `dismiss`.
- **Serwer może stracić rejestrację push, a przełącznik na telefonie dalej pokazuje „włączone”** (stan czytany z przeglądarki). Dlatego aplikacja zgłasza subskrypcję przy każdym połączeniu. Pusta tabela `push_subscriptions` to pierwsze, co sprawdzić, gdy powiadomień brak.
- **`window.visualViewport` to jedyny sposób na pozycję klawiatury ekranowej:** Chrome na Androidzie nakłada ją na stronę, więc elementy `fixed bottom-0` lądują pod nią (`use-keyboard-inset.ts`).
- **Pole z przypomnieniem zmieniać tylko przez funkcje z `modules/tasks/repo.ts`** (`completeTask`, `moveTask`, `removableTasks`…): zwykłe `tasks.update` nie zaktualizuje przypomnienia.
- **jsdom nie ma `setPointerCapture`,** którego używają komunikaty `sonner` (uzupełnione w `src/test/setup.ts`). Dla Radix Select w testach brakuje więcej API, dlatego wybór z listy jest testowany przez funkcje, a nie kliknięcia.
- **Apache na Windows obsługuje żądania wątkami, a odczyt `.env` nie jest bezpieczny wątkowo.** Przy równoległych żądaniach Laravel gubił konfigurację: błąd 500 z bazą SQLite (dowód w logu) i fałszywe 401. Lokalnie: `ThreadsPerChild 1` (pkt 14, 4a). Nie używać lokalnie `config:cache`: testy mogłyby wtedy trafić w prawdziwą bazę `basemind`. Objaw nawrotu: `seq 1 25 | xargs -P 12 -I{} curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/health` zwraca 500.
- **Na produkcji `php artisan config:cache` przy każdym wdrożeniu** i sprawdzić ten sam test równoległych żądań, zwłaszcza gdyby PHP na hostingu działał wątkowo.
- **Baza IndexedDB jest wspólna dla kart:** wylogowanie w jednej kasuje dane wszystkim, więc `applyPage` sprawdza zapamiętane konto w tej samej transakcji. Gdyby strona z synchronizacji zapisała się po wyczyszczeniu, kursor stanąłby za skasowanymi rekordami i dane nie wróciłyby same. Naprawa niekompletnych danych na urządzeniu (dane na serwerze są całe): przy pustym `outbox` usunąć klucz `sync_cursor` z tabeli `meta` w IndexedDB `basemind` i przeładować aplikację; pobierze wszystko od nowa. Wylogowanie i zalogowanie daje ten sam efekt.
- **Nowy model synchronizowany musi implementować `App\Models\Contracts\SyncableModel`** (oprócz traitu `Syncable` i wpisu w `config/sync.php`). Bez tego `SyncService` rzuci `TypeError` przy pierwszej zmianie; pilnuje tego `SyncRegistryTest`. Model z `space_id` sprawdzany przez `SpaceItemPolicy` implementuje `SpaceScoped`.
- **Larastan domyślnie nie czyta metody `casts()`** (od Laravela 11 casty są w metodzie, a Larastan tworzy model bez konstruktora). Bez `parseModelCastsMethod: true` w `phpstan.neon` wszystkie pola z castami widzi jako tekst i zgłasza dziesiątki fałszywych błędów.
- **`pluck()` na zaszyfrowanym polu musi iść przez model**, nie w SQL: zapytanie zwróciłoby szyfrogram. Larastan sugeruje `pluck` w zapytaniu (`noUnnecessaryCollectionCall`), dlatego takie miejsca używają `->get()->map(fn ($m) => $m->pole)` z komentarzem.
- **Testy e2e nigdy na Apache z portu 8080** (ten używa `api/.env` i bazy `basemind` z prawdziwym kontem). `web/e2e/server.ts` startuje `php -S` z katalogu `api/public` (router Laravela szuka `index.php` względem katalogu roboczego) i ustawia bazę przez zmienne środowiskowe, które mają pierwszeństwo przed `.env`. Działa to tylko bez `config:cache` — dlatego skrypt pyta Laravela o nazwę bazy przed `migrate:fresh`.
- **`pnpm e2e` robi build do `api/public/`**, czyli ten sam, który serwuje Apache: po testach telefon pokaże baner „Odśwież”, jeśli kod się zmienił.
- **Bez uruchomionego harmonogramu (`schedule:work` z `OPENSSL_CONF`) żadne przypomnienie nie wychodzi.** Gdy użytkownik zgłasza „nie działają powiadomienia”, najpierw sprawdzić, czy harmonogram działa (przypomnienia w `reminders` wiszą wtedy jako `scheduled` po czasie), potem `push_subscriptions`. Automatyczny tryb Claude Code może zablokować start harmonogramu (wysyła prawdziwe powiadomienia i e-maile) — uruchamiać po wyraźnej zgodzie użytkownika.
- **Logika serii zadań jest w dwóch miejscach** (`api/app/Services/TaskSeries.php` i `web/src/modules/tasks/recurrence.ts` + `finishOccurrence` w `repo.ts`). Zmiana po jednej stronie wymaga zmiany po drugiej i nowego przypadku w `recurrence.cases.json` (czytają go oba zestawy testów).
- **php-rrule odrzuca `UNTIL` jako samą datę, gdy start ma strefę czasową** („UNTIL … MUST be specified as a date with UTC time”). Zadania zapisują `UNTIL=20261231`, a `TaskSeries::rule()` zamienia to na `…T000000Z` przed obliczeniem; paczka `rrule` w JS przyjmuje samą datę.
- **Reguła parsera, która zwraca `{}`, nie wycina tekstu** (`parseQuickText`): tak odrzuca się np. „31.02” czy „o 25”, które zostają w tytule.
- **Zadanie z podzadaniami odhaczać tylko przez `requestCompleteTask`** (`modules/tasks/completion.ts`), nie bezpośrednio `completeTask`, bo pominie pytanie o podzadania. Usuwać przez `removableTasks` (usuwa też podzadania).
- **PowerShell: `[IO.File]::ReadAllText` liczy ścieżki względne od katalogu procesu, nie od `Set-Location`.** Podawać pełne ścieżki albo używać narzędzia Edit (inaczej zmiana trafia w złe miejsce lub się nie zapisuje).
- **Git Bash i `sed` gubią ukośniki odwrotne w przestrzeniach nazw PHP** (`App\Models\...` zamienia się w `AppModels...`). Do takich zamian używać narzędzia Edit albo PowerShell `[IO.File]::ReadAllText/WriteAllText` i sprawdzić wynik.
- **Apache z XAMPP startuje u nas około 30 sekund.** Przy sprawdzaniu `/api/health` zaraz po starcie dać mu tyle czasu, zanim uzna się start za nieudany.
- **Nie czyścić `api/public/` przy buildzie w całości** (są tam `index.php`, `.htaccess`) — tylko `web/scripts/clean-build.mjs` z jawną listą.
- **`pnpm exec playwright test` (lub `pnpm e2e:only`) nie buduje aplikacji** — testuje ostatni build z `api/public/`. Po zmianach w `web/` uruchamiać `pnpm e2e` (build + testy), inaczej testy widzą starą wersję (2026-11-15: nowe testy kalendarza „nie widziały” ekranu, bo build był sprzed zmian). `pnpm e2e` przy okazji odświeża też aplikację serwowaną przez Apache na `:8080`.
- **Ukryte pola wyboru (`sr-only`) w Playwright:** klikać widoczną etykietę (np. `getByTitle`), nie sam `radio` — jest poza widokiem i `check()` kończy się błędem.
- **MariaDB nasłuchuje tylko na 127.0.0.1** — łączyć się przez `127.0.0.1`, nie `::1`/`localhost` z IPv6.
- `max_allowed_packet=1M` w `my.ini` — może trzeba podnieść przy synchronizacji (Etap 1.4).
- Na hostingu: zweryfikować wariant document root (najlepiej `api/public`; awaryjnie cały `api/` — przetestowany lokalnie, bezpieczny).
- **Przesuwanie palcem w elemencie z własnym przewijaniem** (2026-11-17, oś godzin w Dniu/Tygodniu): o `touch-action` decyduje element pod palcem i jego przodkowie **tylko do najbliższego kontenera przewijania**. `touch-pan-y` na rodzicu nie wystarcza, gdy gest zaczyna się w środku `overflow-y-auto`: przeglądarka bierze ruch w bok dla siebie i wysyła `pointercancel`. Klasa `touch-pan-y` musi być też na samym przewijanym elemencie. Test e2e z prawdziwym dotykiem: CDP `Input.dispatchTouchEvent` (`swipeLeft` w `web/e2e/calendar.spec.ts`); `page.mouse` tego nie wykryje.
- **`pnpm e2e:only` po nieudanym buildzie testuje stary build** (2026-11-17): gdy `tsc -b` zgłosi błąd (także w plikach `e2e/`), `vite build` się nie wykona, a testy przejdą na poprzedniej wersji z `api/public/`. Przy sprawdzaniu, czy test wykrywa błąd (wersja bez poprawki), zawsze patrzeć na wynik `pnpm build`.
