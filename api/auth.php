<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? $_POST['action'] ?? '';

if ($method === 'GET' && $action === 'check') {
    json_response(['ok' => true, 'loggedIn' => is_logged_in()]);
}

if ($method === 'POST' && $action === 'login') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    $password = is_array($body) ? ($body['password'] ?? '') : '';
    if (!password_verify($password, ADMIN_PASSWORD_HASH)) {
        json_response(['ok' => false, 'error' => 'Hatalı şifre'], 401);
    }
    $_SESSION['admin_logged_in'] = true;
    json_response(['ok' => true, 'message' => 'Giriş başarılı']);
}

if ($method === 'POST' && $action === 'logout') {
    $_SESSION = [];
    session_destroy();
    json_response(['ok' => true, 'message' => 'Çıkış yapıldı']);
}

json_response(['ok' => false, 'error' => 'Geçersiz istek'], 400);
