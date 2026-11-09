<?php

namespace App\Mail;

use App\Models\Reminder;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class ReminderMail extends Mailable
{
    public function __construct(public readonly Reminder $reminder) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: __('notifications.reminder_subject', ['title' => $this->reminder->title]));
    }

    public function content(): Content
    {
        return new Content(text: 'mail.reminder');
    }
}
