FROM php:8.2-apache

RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    libicu-dev \
    libonig-dev \
    default-mysql-client \
    && docker-php-ext-install \
    pdo_mysql \
    mbstring \
    intl \
    zip \
    bcmath \
    opcache \
    && a2enmod rewrite headers expires \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --prefer-dist \
    --optimize-autoloader \
    --no-scripts

COPY . .

COPY docker/apache-maketo.conf /etc/apache2/conf-available/maketo.conf
COPY docker/php-performance.ini /usr/local/etc/php/conf.d/zz-maketo-performance.ini
RUN a2enconf maketo \
    && sed -ri 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf \
    && chmod +x docker/start-apache.sh

RUN set -eux; \
    . /etc/apache2/envvars; \
    mkdir -p \
        bootstrap/cache \
        storage/framework/cache \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs; \
    chown -R "${APACHE_RUN_USER}:${APACHE_RUN_GROUP}" storage bootstrap/cache; \
    chmod -R ug+rwX,o-rwx storage bootstrap/cache

RUN set -eux; \
    rm -f bootstrap/cache/*.php; \
    composer dump-autoload --optimize --no-dev; \
    . /etc/apache2/envvars; \
    chown -R "${APACHE_RUN_USER}:${APACHE_RUN_GROUP}" storage bootstrap/cache; \
    chmod -R ug+rwX,o-rwx storage bootstrap/cache

EXPOSE 10000
CMD ["docker/start-apache.sh"]
