<?php

namespace App\Services;

use App\Models\Note;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Support\Str;

/**
 * When two devices change the text of a note without seeing each other's change, the
 * version that loses is kept as a separate note, "Title (konflikt 20.11, 22:15)"
 * (decision 2026-11-20, `projekt.md`, pkt 13). SyncService decides who wins; this
 * class knows what counts as such a conflict and what the copy is called.
 */
final class NoteConflicts
{
    /** @var list<string> */
    public const TEXT_FIELDS = ['title', 'content'];

    /** A copy's name stays readable in a list. */
    private const NAME_LENGTH = 80;

    /**
     * The text fields among the changes.
     *
     * @param  array<string, mixed>  $fields
     * @return list<string>
     */
    public static function textFields(array $fields): array
    {
        return array_values(array_intersect(self::TEXT_FIELDS, array_keys($fields)));
    }

    /**
     * Whether another device changed the title or content after the version the change was
     * made on. A device's own earlier changes don't count: it may keep typing while the
     * server's answer to the previous save is on its way.
     */
    public static function textChangedElsewhere(Note $note, int $baseVersion, ?string $device): bool
    {
        return $note->text_version > $baseVersion && ($device === null || $note->text_device !== $device);
    }

    /**
     * The note as the device has it: its changes on top of what it didn't touch.
     *
     * @param  array<string, mixed>  $fields
     * @return array{title: ?string, content: ?string}
     */
    public static function deviceText(Note $note, array $fields): array
    {
        return [
            'title' => array_key_exists('title', $fields) ? $fields['title'] : $note->title,
            'content' => array_key_exists('content', $fields) ? $fields['content'] : $note->content,
        ];
    }

    /**
     * @return array{title: ?string, content: ?string}
     */
    public static function serverText(Note $note): array
    {
        return ['title' => $note->title, 'content' => $note->content];
    }

    /**
     * @param  array{title: ?string, content: ?string}  $a
     * @param  array{title: ?string, content: ?string}  $b
     */
    public static function same(array $a, array $b): bool
    {
        return trim($a['title'] ?? '') === trim($b['title'] ?? '')
            && trim($a['content'] ?? '') === trim($b['content'] ?? '');
    }

    /**
     * "Zakupy (konflikt 20.11, 22:15)": the note's title, or else its first line, with the
     * moment of the change that lost, in the user's time zone.
     *
     * @param  array{title: ?string, content: ?string}  $text
     */
    public static function copyTitle(array $text, CarbonImmutable $changedAt, User $user): string
    {
        $name = trim($text['title'] ?? '');
        if ($name === '') {
            $name = self::firstLine($text['content'] ?? '');
        }
        if ($name === '') {
            $name = __('notes.untitled', locale: $user->locale ?? 'pl');
        }

        return __('notes.conflict_copy', [
            'title' => Str::limit($name, self::NAME_LENGTH, '…'),
            'date' => $changedAt->setTimezone($user->timezone ?? 'UTC')->format('d.m, H:i'),
        ], $user->locale ?? 'pl');
    }

    /** The first line with words in it, without Markdown marks (as `noteHeading` in the app). */
    private static function firstLine(string $content): string
    {
        foreach (preg_split('/\R/u', $content) ?: [] as $line) {
            $plain = trim((string) preg_replace(
                ['/^\s{0,3}#{1,6}\s+/u', '/^\s*>\s?/u', '/^\s*(?:[-*+–—]|\d+[.)])?\s*(?:\[[ xX]?\]\s*)?/u', '/(\*\*|__|~~|`|\[\[|\]\])/u'],
                '',
                $line,
            ));
            if ($plain !== '') {
                return $plain;
            }
        }

        return '';
    }
}
