<?php

namespace Tests\Unit;

use App\Support\PhpSecurity;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class PhpSecurityTest extends TestCase
{
    private const MIN = [
        '8.2' => '8.2.35',
        '8.3' => '8.3.36',
        '8.4' => '8.4.27',
        '8.5' => '8.5.12',
    ];

    /** @return array<string, array{string, bool}> */
    public static function versions(): array
    {
        return [
            '8.5.11 vulnerable' => ['8.5.11', false],
            '8.5.12 patched' => ['8.5.12', true],
            '8.5.20 patched' => ['8.5.20', true],
            '8.4.26 vulnerable' => ['8.4.26', false],
            '8.4.27 patched' => ['8.4.27', true],
            '8.3.36 patched' => ['8.3.36', true],
            '8.2.34 vulnerable' => ['8.2.34', false],
            '8.1.99 no fix exists' => ['8.1.99', false],
            '7.4.33 no fix exists' => ['7.4.33', false],
            '8.6.0 newer branch' => ['8.6.0', true],
            '9.0.0 newer branch' => ['9.0.0', true],
        ];
    }

    #[DataProvider('versions')]
    public function test_version_detection(string $version, bool $patched): void
    {
        $security = new PhpSecurity(self::MIN, $version, fn () => '0');

        $this->assertSame($patched, $security->isVersionPatched());
        $this->assertSame(! $patched, $security->hasCritical());
    }

    public function test_upload_progress_enabled_is_critical_even_on_patched_php(): void
    {
        $ini = fn (string $key) => $key === 'session.upload_progress.enabled' ? 'On' : '';
        $report = (new PhpSecurity(self::MIN, '8.5.12', $ini))->report();

        $this->assertCount(1, $report['critical']);
        $this->assertStringContainsString('session.upload_progress.enabled', $report['critical'][0]);
    }

    public function test_hardened_runtime_has_no_issues(): void
    {
        $report = (new PhpSecurity(self::MIN, '8.5.12', fn () => 'Off', production: true))->report();

        $this->assertSame(['critical' => [], 'warnings' => []], $report);
    }

    public function test_unsafe_optional_settings_produce_warnings(): void
    {
        $report = (new PhpSecurity(self::MIN, '8.5.12', fn () => '1', production: true))->report();

        // upload_progress is critical; the other three are warnings.
        $this->assertCount(1, $report['critical']);
        $this->assertCount(3, $report['warnings']);
    }

    public function test_display_errors_is_only_flagged_in_production(): void
    {
        $ini = fn (string $key) => $key === 'display_errors' ? '1' : '';

        $this->assertSame([], (new PhpSecurity(self::MIN, '8.5.12', $ini))->report()['warnings']);
        $this->assertCount(1, (new PhpSecurity(self::MIN, '8.5.12', $ini, production: true))->report()['warnings']);
    }
}
