#!/bin/sh
set -eu

maketo_port="${PORT:-10000}"

. /etc/apache2/envvars

install -d -m 0770 -o "${APACHE_RUN_USER}" -g "${APACHE_RUN_GROUP}" \
    storage \
    storage/framework \
    storage/framework/cache \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache

chown -R "${APACHE_RUN_USER}:${APACHE_RUN_GROUP}" storage bootstrap/cache
chmod -R ug+rwX,o-rwx storage bootstrap/cache

sed -ri "s/^Listen .*/Listen ${maketo_port}/" /etc/apache2/ports.conf
sed -ri "s/<VirtualHost \*:[0-9]+>/<VirtualHost *:${maketo_port}>/" /etc/apache2/sites-available/000-default.conf

php artisan config:clear
php artisan view:clear
php artisan config:cache

chown -R "${APACHE_RUN_USER}:${APACHE_RUN_GROUP}" storage bootstrap/cache
chmod -R ug+rwX,o-rwx storage bootstrap/cache

exec apache2-foreground
