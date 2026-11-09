<?php

namespace App\Console\Commands\Concerns;

trait EditsEnvFile
{
    private function readValue(string $env, string $name): string
    {
        return preg_match('/^'.$name.'=([^\r\n]*)/m', $env, $match)
            ? trim($match[1], " \t\"'")
            : '';
    }

    private function writeValue(string $env, string $name, string $value): string
    {
        $line = $name.'='.$value;
        $count = 0;

        // A callback, because keys could otherwise be read as regex replacement references.
        $updated = preg_replace_callback('/^'.$name.'=[^\r\n]*/m', fn () => $line, $env, 1, $count);

        return $count > 0 ? $updated : rtrim($env)."\n".$line."\n";
    }

    /** Via a temporary file: an interrupted write must not damage the only copy of the keys. */
    private function replaceFile(string $path, string $contents): void
    {
        $temporary = $path.'.tmp';

        if (file_put_contents($temporary, $contents) !== strlen($contents) || ! rename($temporary, $path)) {
            @unlink($temporary);

            throw new \RuntimeException('Could not write the .env file.');
        }
    }
}
