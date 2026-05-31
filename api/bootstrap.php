<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

session_name(SESSION_NAME);
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function json_response(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function is_logged_in(): bool
{
    return !empty($_SESSION['admin_logged_in']);
}

function require_auth(): void
{
    if (!is_logged_in()) {
        json_response(['ok' => false, 'error' => 'Yetkisiz'], 401);
    }
}

function read_content(): array
{
    if (!file_exists(CONTENT_FILE)) {
        return [];
    }
    $raw = file_get_contents(CONTENT_FILE);
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function write_content(array $data): bool
{
    if (!is_dir(DATA_PATH)) {
        mkdir(DATA_PATH, 0755, true);
    }
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return file_put_contents(CONTENT_FILE, $json . "\n", LOCK_EX) !== false;
}

function sanitize_slug(string $slug): string
{
    $slug = strtolower(trim($slug));
    $slug = preg_replace('/[^a-z0-9-]+/', '-', $slug) ?? '';
    return trim($slug, '-') ?: 'item-' . time();
}
