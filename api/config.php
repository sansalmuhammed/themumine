<?php
declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
define('DATA_PATH', ROOT_PATH . '/data');
define('CONTENT_FILE', DATA_PATH . '/content.json');
define('UPLOADS_PATH', ROOT_PATH . '/assets/uploads');
define('UPLOADS_URL', 'assets/uploads');

/** Varsayılan şifre: mumine2026 — değiştirmek için yeni hash üretin: php -r "echo password_hash('YENI_SIFRE', PASSWORD_DEFAULT);" */
define('ADMIN_PASSWORD_HASH', '$2y$10$6YvCCuCgJo0exsF7D9W6AOAj84SlQSo6.KPirpbWdAqp3kPHIUKzS');

define('SESSION_NAME', 'themumine_admin');
