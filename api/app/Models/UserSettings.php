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
     * @return array{push: bool, email: bool, quiet_hours: array{start: string, end: string}|null, digest: array{enabled: bool, time: string}, types: array<string, array{push: bool, email: bool}>}
     */
    public function notifications(): array
    {
        $defaults = config('notifications.types');
        $preferences = array_replace_recursive([
            'push' => true,
            'email' => true,
            'quiet_hours' => null,
            'digest' => ['enabled' => true, 'time' => '07:00'],
            'types' => $defaults,
        ], $this->settings['notifications'] ?? []);

        // A type a module no longer has is not reported back.
        $preferences['types'] = array_intersect_key($preferences['types'], $defaults);

        return $preferences;
    }

    /**
     * Whether a reminder of this type may go out on this channel.
     */
    public function allowsChannel(?string $type, string $channel): bool
    {
        $preferences = $this->notifications();

        return ($preferences[$channel] ?? false)
            && ($type === null || ($preferences['types'][$type][$channel] ?? true));
    }

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return ['settings' => 'array'];
    }
}
