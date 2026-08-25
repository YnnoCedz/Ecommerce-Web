#!/bin/sh
set -eu

maketo_port="${PORT:-10000}"

sed -ri "s/^Listen .*/Listen ${maketo_port}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${maketo_port}>/" /etc/apache2/sites-available/000-default.conf

php artisan config:cache

exec apache2-foreground
