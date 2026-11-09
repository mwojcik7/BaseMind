<?php

use App\Digest\OverdueTasksSection;
use App\Digest\TodayTasksSection;

return [

    /*
    | Sections of the morning digest, in order: classes implementing
    | App\Contracts\DigestSection. Planned: today's events, upcoming payments
    | and birthdays. Modules add themselves here.
    */
    'sections' => [
        TodayTasksSection::class,
        OverdueTasksSection::class,
    ],

];
