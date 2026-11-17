<?php

use App\Digest\OverdueTasksSection;
use App\Digest\TodayEventsSection;
use App\Digest\TodayTasksSection;

return [

    /*
    | Sections of the morning digest, in order: classes implementing
    | App\Contracts\DigestSection. Planned: upcoming payments and birthdays.
    | Modules add themselves here.
    */
    'sections' => [
        TodayEventsSection::class,
        TodayTasksSection::class,
        OverdueTasksSection::class,
    ],

];
