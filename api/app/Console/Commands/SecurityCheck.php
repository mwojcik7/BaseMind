<?php

namespace App\Console\Commands;

use App\Support\PhpSecurity;
use App\Support\SecurityAlert;
use Illuminate\Console\Command;

class SecurityCheck extends Command
{
    protected $signature = 'basemind:security-check {--notify : E-mail the owner when critical issues are found}';

    protected $description = 'Check the PHP runtime for known critical vulnerabilities and unsafe settings';

    public function handle(): int
    {
        $report = PhpSecurity::fromConfig()->report();

        $this->line('PHP '.PHP_VERSION.' ('.PHP_SAPI.')');

        foreach ($report['critical'] as $issue) {
            $this->error('CRITICAL: '.$issue);
        }
        foreach ($report['warnings'] as $issue) {
            $this->warn('WARNING: '.$issue);
        }

        if ($report['critical'] === [] && $report['warnings'] === []) {
            $this->info('OK: no known issues.');
        }

        if ($report['critical'] !== [] && $this->option('notify')) {
            SecurityAlert::notifyOwner($report['critical']);
        }

        return $report['critical'] === [] ? self::SUCCESS : self::FAILURE;
    }
}
