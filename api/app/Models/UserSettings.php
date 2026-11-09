<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['settings'])]
class UserSettings extends Model
{
    protected $table = 'user_settings';

    protected $primaryKey = 'user_id';

    public $incrementing = false;

    /**
     * @return array{push: bool, email: bool, quiet_hours: array{start: string, end: string}|null, digest: array{enabled: bool, time: string}}
     */
    public function notifications(): array
    {
        return array_replace_recursive([
            'push' => true,
            'email' => true,
            'quiet_hours' => null,
            'digest' => ['enabled' => true, 'time' => '07:00'],
        ], $this->settings['notifications'] ?? []);
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['settings' => 'array'];
    }
}
