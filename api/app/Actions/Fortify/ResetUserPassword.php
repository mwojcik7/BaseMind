<?php

namespace App\Actions\Fortify;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rules\Password;
use Laravel\Fortify\Contracts\ResetsUserPasswords;

class ResetUserPassword implements ResetsUserPasswords
{
    /**
     * @param  array<string, mixed>  $input
     */
    public function reset(User $user, array $input): void
    {
        Validator::make($input, [
            'password' => ['required', 'string', Password::min(10), 'confirmed'],
        ])->validate();

        $user->forceFill(['password' => $input['password']])->save();

        // A reset often means the password leaked: sign out every device.
        DB::table('sessions')->where('user_id', $user->id)->delete();
    }
}
