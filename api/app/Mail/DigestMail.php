<?php

namespace App\Mail;

use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class DigestMail extends Mailable
{
    /**
     * @param  list<array{title: string, items: list<string>}>  $sections
     */
    public function __construct(public readonly array $sections) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('notifications.digest_title'));
    }

    public function content(): Content
    {
        return new Content(text: 'mail.digest');
    }
}
