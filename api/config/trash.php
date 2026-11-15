<?php

return [

    /*
    | Deleted records stay in the trash this many days, then are removed for good.
    */
    'retention_days' => 30,

    /*
    | How long devices are told about records removed for good. A device that has
    | not synced for longer downloads all its data again.
    */
    'purge_notice_days' => 365,

];
