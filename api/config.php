<?php
declare(strict_types=1);

define('ROOT_PATH', dirname(__DIR__));
define('DATA_PATH', ROOT_PATH . '/data');
define('CONTENT_FILE', DATA_PATH . '/content.json');
define('UPLOADS_PATH', ROOT_PATH . '/assets/uploads');
define('UPLOADS_URL', 'assets/uploads');

define('ADMIN_USERNAME', 'mumine.serap@themumine.com');

/** Şifre düz metin olarak saklanmaz — yeni şifre: php -r "echo password_hash('SIFRE', PASSWORD_DEFAULT);" */
define('ADMIN_PASSWORD_HASH', '$2y$10$3bHDRWjxWmuaXZ/75XDFBuy1TLA.oY1KNCtBd8NfUmpQAITdCbxIa');

define('SESSION_NAME', 'themumine_admin');
