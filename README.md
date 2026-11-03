# BaseMind

Osobiste „centrum dowodzenia” — aplikacja PWA (mobile-first, offline-first): finanse, subskrypcje, zadania, kalendarz, notatki z backlinkami, zakładki, gwarancje, auto, nawyki, bliscy, prezenty i więcej.

- **Specyfikacja i decyzje:** [`projekt.md`](projekt.md)
- **Plan, postęp i następne kroki:** [`plan.md`](plan.md)

## Stack

- **Backend:** PHP 8.5 + Laravel 13 + MySQL/MariaDB (`api/`) — docelowo zwykły hosting współdzielony.
- **Frontend:** React + Vite + TypeScript PWA (`web/` — w przygotowaniu).
- **Lokalnie:** XAMPP (Apache + PHP + MariaDB) na Windows.

## Uruchomienie lokalne (backend)

Wymagania: XAMPP (PHP **8.5.12+** lub 8.4.27+), Composer, Node.js + pnpm. Jednorazowa konfiguracja XAMPP (port 8080, vhost, `php.ini`, `my.ini`) — patrz `projekt.md`, pkt 14.

```bash
git clone https://github.com/mwojcik7/BaseMind.git
cd BaseMind/api
composer install
cp .env.example .env        # PowerShell: copy .env.example .env
php artisan key:generate
# uruchom w panelu XAMPP: Apache + MySQL
php artisan migrate
```

- API: <http://localhost:8080/api/health> → `{"status":"ok", ...}`
- Testy: `php artisan test` (wymaga działającej MariaDB, baza `basemind_test`)
- Kontrola bezpieczeństwa PHP: `php artisan basemind:security-check`
- Harmonogram (przypomnienia itp.): `php artisan schedule:work`

## Frontend

W przygotowaniu (krok 0.3 w `plan.md`).
