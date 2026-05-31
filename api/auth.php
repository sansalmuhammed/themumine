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
    $username = is_array($body) ? trim((string) ($body['username'] ?? '')) : '';
    $password = is_array($body) ? (string) ($body['password'] ?? '') : '';

    if ($username !== ADMIN_USERNAME || !password_verify($password, ADMIN_PASSWORD_HASH)) {
        json_response(['ok' => false, 'error' => 'Hatalı kullanıcı adı veya şifre'], 401);
    }

    $_SESSION['admin_logged_in'] = true;
    $_SESSION['admin_username'] = $username;
    json_response(['ok' => true, 'message' => 'Giriş başarılı']);
}

if ($method === 'POST' && $action === 'logout') {
    $_SESSION = [];
    session_destroy();
    json_response(['ok' => true, 'message' => 'Çıkış yapıldı']);
}

json_response(['ok' => false, 'error' => 'Geçersiz istek'], 400);
