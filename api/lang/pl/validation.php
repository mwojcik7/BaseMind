<?php

// Only the rules the app uses so far; add more together with new forms.
return [
    'confirmed' => 'Hasła muszą być takie same.',
    'email' => 'Podaj poprawny adres e-mail.',
    'max' => [
        'string' => 'Pole :attribute może mieć najwyżej :max znaków.',
    ],
    'min' => [
        'string' => 'Pole :attribute musi mieć co najmniej :min znaków.',
    ],
    'required' => 'Pole :attribute jest wymagane.',
    'string' => 'Pole :attribute musi być tekstem.',
    'unique' => 'Ta wartość pola :attribute jest już zajęta.',

    'attributes' => [
        'display_name' => 'imię',
        'email' => 'e-mail',
        'password' => 'hasło',
        'token' => 'token',
    ],
];
