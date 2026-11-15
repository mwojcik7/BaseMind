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

    /*
    | Where tapping a reminder's notification opens the app, keyed by the
    | reminder's entity_type; {id} is the entity's id. Reminders of a type not
    | listed here (or not tied to anything) open the home screen.
    */
    'paths' => [
        'tasks' => '/tasks/{id}',
    ],

];
