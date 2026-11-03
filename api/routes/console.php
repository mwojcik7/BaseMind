<?php

use Illuminate\Support\Facades\Schedule;

/*
| Scheduler. On shared hosting a single cron entry runs it every minute:
|   * * * * * php /path/to/api/artisan schedule:run >> /dev/null 2>&1
| Locally: `php artisan schedule:work`.
*/

// Daily runtime security check; e-mails the owner on critical issues.
Schedule::command('basemind:security-check --notify')->dailyAt('06:00');
