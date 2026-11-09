# BaseMind

Osobiste „centrum dowodzenia” — aplikacja PWA (mobile-first, offline-first): finanse, subskrypcje, zadania, kalendarz, notatki z backlinkami, zakładki, gwarancje, auto, nawyki, bliscy, prezenty i więcej.

- **Specyfikacja i decyzje:** [`projekt.md`](projekt.md)
- **Plan, postęp i następne kroki:** [`plan.md`](plan.md)

## Stack

- **Backend:** PHP 8.5 + Laravel 13 + MySQL/MariaDB (`api/`) — docelowo zwykły hosting współdzielony.
- **Frontend:** React + Vite + TypeScript PWA (`web/`).
- **Lokalnie:** XAMPP (Apache + PHP + MariaDB) na Windows.

## Uruchomienie lokalne (backend)

Wymagania: XAMPP (PHP **8.5.12+** lub 8.4.27+), Composer, Node.js + pnpm. Jednorazowa konfiguracja XAMPP (port 8080, vhost, `php.ini`, `my.ini`) — patrz `projekt.md`, pkt 14.

```bash
git clone https://github.com/mwojcik7/BaseMind.git
cd BaseMind/api
composer install
cp .env.example .env        # PowerShell: copy .env.example .env
php artisan key:generate
php artisan basemind:key    # klucz szyfrowania, patrz niżej
# uruchom w panelu XAMPP: Apache + MySQL
php artisan migrate
```

W `.env` uzupełnij `BASEMIND_OWNER_EMAIL` oraz `BASEMIND_REGISTRATION_CODE` (kod do zakładania kont; pusty wyłącza rejestrację). Kod można wygenerować poleceniem `php -r "echo bin2hex(random_bytes(16));"`.

- API: <http://localhost:8080/api/health> → `{"status":"ok", ...}`
- Testy: `php artisan test` (wymaga działającej MariaDB, baza `basemind_test`)
- Kontrola bezpieczeństwa PHP: `php artisan basemind:security-check`
- Harmonogram (przypomnienia itp.): `php artisan schedule:work`, z ustawionym `OPENSSL_CONF` (`projekt.md`, pkt 14, 7c)
- Apache na Windows musi działać z `ThreadsPerChild 1` (`projekt.md`, pkt 14, 4a), inaczej równoległe żądania gubią konfigurację z `.env`

### Klucz szyfrowania (`SODIUM_KEY`)

Wrażliwe pola i pliki są szyfrowane tym kluczem. **Utrata klucza oznacza utratę zaszyfrowanych danych; nie da się ich odzyskać.**

- **Kopia:** po wygenerowaniu otwórz `api/.env` i skopiuj wartość `SODIUM_KEY` do menedżera haseł. Komenda celowo nie wypisuje klucza na ekran (`--show` wypisuje nowy klucz bez zapisywania).
- **Sprawdzenie kopii:** komenda podaje identyfikator klucza. Zapisz go razem z kopią, bo ten sam identyfikator jest w każdym szyfrogramie.
- **Produkcja:** osobny klucz, nie ten z komputera lokalnego. Kopia bazy bez klucza jest bezużyteczna, a klucz nie powinien leżeć obok kopii bazy.
- **Nowy komputer lub serwer z istniejącymi danymi:** wpisz w `.env` klucz z menedżera haseł, nie generuj nowego.

**Wymiana klucza** (np. po podejrzeniu wycieku):

```bash
php artisan basemind:key --rotate   # nowy klucz; stary trafia do SODIUM_PREVIOUS_KEYS
# skopiuj nowy klucz do menedżera haseł
php artisan basemind:reencrypt      # przenosi pola na nowy klucz; można przerwać i powtórzyć
```

Zaszyfrowane pliki nie są jeszcze przenoszone na nowy klucz, dlatego nie usuwaj wpisów z `SODIUM_PREVIOUS_KEYS`. Stare klucze zachowaj też w menedżerze haseł, bo potrzebują ich starsze kopie bazy.

## Frontend

```bash
cd web
pnpm install
pnpm dev            # http://localhost:5173, proxy /api, /sanctum, /s do Apache (:8080)
```

- Kontrola jakości: `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`
- Build: `pnpm build` zapisuje PWA do `api/public/`; aplikacja działa wtedy pod <http://localhost:8080>. Bez builda Laravel zwraca 503 na `/`.
- Service Worker działa tylko w buildzie, nie w `pnpm dev`.
- Pierwsze konto: na ekranie logowania wybierz **Mam kod zaproszenia** i wpisz kod z `api/.env`.
- Podgląd komponentów (po zalogowaniu): `/design`.
- Ikony: po zmianie `web/public/app-icons/logo.svg` uruchom `pnpm icons`.

### Test na telefonie (Android, kabel USB)

1. Na telefonie włącz opcje programistyczne i debugowanie USB, podłącz kabel, zaakceptuj komputer.
2. Uruchom `pnpm dev` (lub zbuduj aplikację i uruchom Apache).
3. W Chrome na komputerze: `chrome://inspect` → **Port forwarding** → dodaj `5173 → localhost:5173` (dla builda `8080 → localhost:8080`) i zaznacz **Enable port forwarding**.
4. Na telefonie otwórz `http://localhost:5173` (lub `http://localhost:8080`).

Przekierowanie działa tylko przy otwartym Chrome na komputerze. Aplikacja wyświetla się wtedy też bez połączenia, z pamięci telefonu. Jeśli pojawia się „Brak połączenia z serwerem”, otwórz na telefonie `http://localhost:8080/api/health`: bez odpowiedzi `"status":"ok"` sprawdź kabel i **Enable port forwarding**.
