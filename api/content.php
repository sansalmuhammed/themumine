<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    json_response(['ok' => true, 'data' => read_content()]);
}

if ($method === 'POST') {
    require_auth();
    $body = file_get_contents('php://input');
    $payload = json_decode($body ?: '', true);
    if (!is_array($payload) || !isset($payload['data']) || !is_array($payload['data'])) {
        json_response(['ok' => false, 'error' => 'Geçersiz veri'], 400);
    }
    if (!write_content($payload['data'])) {
        json_response(['ok' => false, 'error' => 'Kayıt başarısız'], 500);
    }
    json_response(['ok' => true, 'message' => 'İçerik kaydedildi']);
}

json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
