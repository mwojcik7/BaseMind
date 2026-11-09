<?php

namespace App\Console\Commands;

use App\Services\ReminderDispatcher;
use Illuminate\Console\Command;

class SendDueReminders extends Command
{
    protected $signature = 'basemind:send-reminders';

    protected $description = 'Queue the delivery of reminders that are due';

    public function handle(ReminderDispatcher $dispatcher): int
    {
        $this->info('Reminders sent: '.$dispatcher->dispatchDue());

        return self::SUCCESS;
    }
}
