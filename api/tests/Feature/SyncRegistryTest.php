<?php

namespace Tests\Feature;

use App\Models\Concerns\Syncable;
use App\Models\Contracts\SyncableModel;
use Tests\TestCase;

/**
 * SyncService only accepts SyncableModel, so a module registered in config/sync.php
 * without it would fail on its first synchronised change.
 */
class SyncRegistryTest extends TestCase
{
    public function test_every_synchronised_model_implements_the_contract(): void
    {
        foreach (config('sync.entities') as $entity => $model) {
            $this->assertContains(SyncableModel::class, class_implements($model), "{$entity}: {$model}");
            $this->assertContains(Syncable::class, class_uses_recursive($model), "{$entity}: {$model}");
        }
    }
}
