<?php

namespace App\Services;

use App\Casts\SodiumEncrypted;
use App\Exceptions\CryptoException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;

/**
 * Moves stored values to the current key after `basemind:key --rotate`.
 *
 * Works on raw columns through the query builder, on purpose: it must include
 * soft-deleted rows and must not touch updated_at, version or rev, because the
 * plaintext doesn't change and clients have nothing to sync. It is safe to stop
 * and run again, since values already under the current key are skipped.
 */
final class EncryptedFieldRotator
{
    private const CHUNK_SIZE = 200;

    public function __construct(private readonly Crypto $crypto) {}

    /**
     * Found by scanning, so a new module can't be forgotten during rotation.
     *
     * @return list<class-string<Model>>
     */
    public function discoverModels(?string $directory = null, string $namespace = 'App\\Models\\'): array
    {
        $models = [];

        foreach (File::allFiles($directory ?? app_path('Models')) as $file) {
            $class = $namespace.str_replace('/', '\\', Str::beforeLast($file->getRelativePathname(), '.php'));

            if (is_subclass_of($class, Model::class)
                && ! (new ReflectionClass($class))->isAbstract()
                && $this->encryptedColumns($class) !== []) {
                $models[] = $class;
            }
        }

        return $models;
    }

    /**
     * @param  class-string<Model>  $class
     * @return list<string>
     */
    public function encryptedColumns(string $class): array
    {
        $columns = [];

        foreach ((new $class)->getCasts() as $column => $cast) {
            if (is_a(Str::before($cast, ':'), SodiumEncrypted::class, true)) {
                $columns[] = $column;
            }
        }

        return $columns;
    }

    /**
     * @param  class-string<Model>  $class
     * @return array{updated: int, skipped: int, failed: list<string>} failed lists "<primary key>.<column>", never values
     */
    public function rotate(string $class): array
    {
        $model = new $class;
        $primaryKey = $model->getKeyName();
        $columns = $this->encryptedColumns($class);
        $result = ['updated' => 0, 'skipped' => 0, 'failed' => []];

        $table = fn () => $model->getConnection()->table($model->getTable());

        $table()->select([$primaryKey, ...$columns])->chunkById(
            self::CHUNK_SIZE,
            function ($rows) use ($table, $primaryKey, $columns, &$result) {
                foreach ($rows as $row) {
                    foreach ($columns as $column) {
                        $value = $row->{$column};

                        if ($value === null || $this->crypto->usesCurrentKey($value)) {
                            $result['skipped']++;

                            continue;
                        }

                        try {
                            $encrypted = $this->crypto->reencrypt($value);
                        } catch (CryptoException) {
                            // Keep going: one damaged value shouldn't block the rest.
                            $result['failed'][] = $row->{$primaryKey}.'.'.$column;

                            continue;
                        }

                        // Matching the old value keeps an edit made in the meantime, which
                        // is already under the current key.
                        $table()
                            ->where($primaryKey, $row->{$primaryKey})
                            ->where($column, $value)
                            ->update([$column => $encrypted]) > 0
                                ? $result['updated']++
                                : $result['skipped']++;
                    }
                }
            },
            $primaryKey,
        );

        return $result;
    }
}
