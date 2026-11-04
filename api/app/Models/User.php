<?php

namespace App\Models;

use App\Enums\SpaceRole;
use App\Enums\SpaceType;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

#[Fillable(['display_name', 'email', 'password', 'timezone', 'locale'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * Every user starts with a private space and settings, however the account was created.
     */
    protected static function booted(): void
    {
        static::created(function (User $user) {
            $space = Space::create([
                'name' => 'Moja przestrzeń',
                'type' => SpaceType::Personal,
                'owner_id' => $user->id,
            ]);
            $space->members()->attach($user->id, ['role' => SpaceRole::Owner->value]);

            $user->settings()->create(['settings' => []]);
        });
    }

    /**
     * @return BelongsToMany<Space, $this>
     */
    public function spaces(): BelongsToMany
    {
        return $this->belongsToMany(Space::class, 'space_members')
            ->withPivot('role')
            ->withTimestamps();
    }

    /**
     * @return HasOne<UserSettings, $this>
     */
    public function settings(): HasOne
    {
        return $this->hasOne(UserSettings::class);
    }

    /**
     * The user's role in a space, or null when they are not a member.
     */
    public function roleIn(string $spaceId): ?SpaceRole
    {
        $role = $this->spaces()->whereKey($spaceId)->first()?->pivot->role;

        return $role === null ? null : SpaceRole::from($role);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
