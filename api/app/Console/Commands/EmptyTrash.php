<?php

namespace App\Console\Commands;

use App\Services\Trash;
use Illuminate\Console\Command;

class EmptyTrash extends Command
{
    protected $signature = 'basemind:empty-trash';

    protected $description = 'Remove records that have been in the trash longer than config/trash.php allows';

    public function handle(Trash $trash): int
    {
        $this->info('Records removed: '.$trash->emptyExpired());

        return self::SUCCESS;
    }
}
