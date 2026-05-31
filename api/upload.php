<?php
declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

require_auth();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_response(['ok' => false, 'error' => 'Method not allowed'], 405);
}

if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    json_response(['ok' => false, 'error' => 'Dosya yüklenemedi'], 400);
}

$file = $_FILES['file'];
$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mime = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mime, $allowed, true)) {
    json_response(['ok' => false, 'error' => 'Sadece JPG, PNG, WebP veya GIF'], 400);
}

$ext = match ($mime) {
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
    'image/gif' => 'gif',
    default => 'jpg',
};

if (!is_dir(UPLOADS_PATH)) {
    mkdir(UPLOADS_PATH, 0755, true);
}

$name = date('Ymd-His') . '-' . bin2hex(random_bytes(4)) . '.' . $ext;
$dest = UPLOADS_PATH . '/' . $name;

if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_response(['ok' => false, 'error' => 'Kayıt hatası'], 500);
}

json_response([
    'ok' => true,
    'url' => UPLOADS_URL . '/' . $name,
    'path' => UPLOADS_URL . '/' . $name,
]);
