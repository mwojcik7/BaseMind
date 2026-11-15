<?php

return [

    /*
    | Notification channels per kind of reminder, keyed by the reminder's
    | entity_type, with the defaults a user starts with. The user's general
    | switches still come first: e-mail off there means off for every type.
    | Reminders of a type not listed here use the general switches alone.
    | Modules add themselves here (and to the app's notification type list).
    */
    'types' => [
        'tasks' => ['push' => true, 'email' => false],
    ],

];
