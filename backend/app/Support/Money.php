<?php

namespace App\Support;

use InvalidArgumentException;

final class Money
{
    public static function cents(string|int $amount): int
    {
        $value = trim((string) $amount);
        if (! preg_match('/^(-?)(\d+)(?:\.(\d{1,2}))?$/', $value, $matches)) {
            throw new InvalidArgumentException("Invalid money amount: {$value}");
        }
        $cents = ((int) $matches[2] * 100) + (int) str_pad($matches[3] ?? '', 2, '0');

        return ($matches[1] ?? '') === '-' ? -$cents : $cents;
    }

    public static function decimal(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $absolute = abs($cents);

        return $sign.intdiv($absolute, 100).'.'.str_pad((string) ($absolute % 100), 2, '0', STR_PAD_LEFT);
    }

    public static function percentage(string $amount, string $percentage): string
    {
        $scaledRate = self::scaledRate($percentage);
        $numerator = self::cents($amount) * $scaledRate;
        $rounded = intdiv(abs($numerator) + 500000, 1000000);

        return self::decimal($numerator < 0 ? -$rounded : $rounded);
    }

    private static function scaledRate(string $percentage): int
    {
        if (! preg_match('/^(\d+)(?:\.(\d{1,4}))?$/', trim($percentage), $matches)) {
            throw new InvalidArgumentException('Invalid percentage rate.');
        }

        return ((int) $matches[1] * 10000) + (int) str_pad($matches[2] ?? '', 4, '0');
    }
}
