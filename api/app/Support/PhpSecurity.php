<?php

namespace App\Support;

use Closure;

/**
 * Inspects the PHP runtime for known critical vulnerabilities and unsafe
 * ini settings. Pure logic (version + ini reader are injectable) so it can
 * be unit-tested without changing the real runtime.
 */
final class PhpSecurity
{
    /** @var Closure(string): (string|false) */
    private Closure $ini;

    /**
     * @param  array<string, string>  $minPatched  branch => minimum patched version, e.g. ['8.5' => '8.5.12']
     * @param  (Closure(string): (string|false))|null  $ini
     */
    public function __construct(
        private readonly array $minPatched,
        private readonly string $version = PHP_VERSION,
        ?Closure $ini = null,
        private readonly bool $production = false,
    ) {
        $this->ini = $ini ?? static fn (string $key): string|false => ini_get($key);
    }

    public static function fromConfig(): self
    {
        return new self(
            minPatched: config('basemind.php_min_patched', []),
            production: app()->isProduction(),
        );
    }

    public function isVersionPatched(): bool
    {
        if ($this->minPatched === []) {
            return true;
        }

        $branch = $this->branch($this->version);
        $branches = array_keys($this->minPatched);
        usort($branches, 'version_compare');

        if (isset($this->minPatched[$branch])) {
            return version_compare($this->version, $this->minPatched[$branch], '>=');
        }

        // Newer branch than any listed one: released after the fix, assume patched.
        return version_compare($branch, end($branches), '>');
    }

    /**
     * @return array{critical: list<string>, warnings: list<string>}
     */
    public function report(): array
    {
        $critical = [];
        $warnings = [];

        if (! $this->isVersionPatched()) {
            $critical[] = "PHP {$this->version} is vulnerable to PHP2Shell (CVE-2026-109618/109619). Upgrade PHP.";
        }

        // Official mitigation for CVE-2026-109619 and the unpatched CVE-2026-115560.
        if ($this->flag('session.upload_progress.enabled')) {
            $critical[] = 'session.upload_progress.enabled must be Off (mitigation for CVE-2026-109619 / CVE-2026-115560).';
        }

        if (version_compare($this->branch($this->version), '8.5', '>=') && $this->flag('fatal_error_backtraces')) {
            $warnings[] = 'fatal_error_backtraces should be Off on PHP 8.5+.';
        }

        if ($this->flag('expose_php')) {
            $warnings[] = 'expose_php should be Off.';
        }

        if ($this->production && $this->flag('display_errors')) {
            $warnings[] = 'display_errors must be Off in production.';
        }

        return ['critical' => $critical, 'warnings' => $warnings];
    }

    public function hasCritical(): bool
    {
        return $this->report()['critical'] !== [];
    }

    private function flag(string $key): bool
    {
        $value = ($this->ini)($key);

        if ($value === false || $value === '') {
            return false;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN);
    }

    private function branch(string $version): string
    {
        [$major, $minor] = array_pad(explode('.', $version), 2, '0');

        return $major.'.'.(int) $minor;
    }
}
