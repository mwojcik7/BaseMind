<?php

use App\Models\EntityLink;
use App\Models\EntityTag;
use App\Models\Reminder;
use App\Models\Tag;

return [

    /*
    | Entities exchanged with the PWA: name used by the client => model using the
    | App\Models\Concerns\Syncable trait. The same name must be a Dexie table on
    | the client (web/src/db/db.ts). Modules add themselves here.
    */
    'entities' => [
        'tags' => Tag::class,
        'entity_tags' => EntityTag::class,
        'entity_links' => EntityLink::class,
        'reminders' => Reminder::class,
    ],

];
