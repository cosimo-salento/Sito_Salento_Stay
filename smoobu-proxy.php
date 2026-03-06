<?php
/**
 * smoobu-proxy.php
 * ─────────────────────────────────────────────────────────────
 * Proxy server-side per le chiamate all'API di Smoobu.
 *
 * PERCHÉ È NECESSARIO:
 *   1. Nasconde la tua API key dal codice front-end (sicurezza).
 *   2. Risolve i problemi CORS (Smoobu non accetta chiamate dirette
 *      dal browser di un dominio arbitrario).
 *
 * INSTALLAZIONE:
 *   Carica questo file nella root (o in una sottocartella) del tuo
 *   sito web. Assicurati che il tuo hosting supporti PHP (≥ 7.4).
 *
 * CONFIGURAZIONE nel widget HTML:
 *   CONFIG.useProxy  = true
 *   CONFIG.proxyUrl  = "/smoobu-proxy.php"   ← percorso sul server
 * ─────────────────────────────────────────────────────────────
 */

/* ============================================================
 ⚙️  CONFIGURA QUI LA TUA API KEY
 ============================================================ */
define('SMOOBU_API_KEY', 'Cx1ve1yOhiw0geRsYpfrIpAPH6ZpC5sFotJ80loOMo');
define('SMOOBU_BASE', 'https://login.smoobu.com/api');

/* ============================================================
 SICUREZZA: limita le origini autorizzate
 Inserisci il dominio del tuo sito (con e senza www se necessario)
 ============================================================ */
$allowed_origins = [
    'https://www.tuosito.it',
    'https://tuosito.it',
    // 'http://localhost'  ← decommenta per test in locale
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

/* Pre-flight CORS */
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

/* ============================================================
 WHITELIST PATH – solo endpoint necessari al widget
 ============================================================ */
$allowed_paths = [
    '#^/apartments/\d+/availability$#',
    '#^/rates/apartments/\d+$#',
    '#^/reservations$#',
];

$path = $_GET['path'] ?? '';

$path_ok = false;
foreach ($allowed_paths as $pattern) {
    if (preg_match($pattern, $path)) {
        $path_ok = true;
        break;
    }
}

if (!$path_ok) {
    http_response_code(403);
    echo json_encode(['error' => 'Path non consentito']);
    exit;
}

/* ============================================================
 QUERY STRING: passa i parametri GET al proxy (es. start_date…)
 ============================================================ */
$query_params = $_GET;
unset($query_params['path']); // rimuovi il parametro interno
$query_string = http_build_query($query_params);
$url = SMOOBU_BASE . $path . ($query_string ? "?$query_string" : '');

/* ============================================================
 CORPO: per POST leggi il body JSON inviato dal browser
 ============================================================ */
$method = $_SERVER['REQUEST_METHOD'];
$body = ($method === 'POST') ? file_get_contents('php://input') : null;

/* ============================================================
 CHIAMATA cURL verso Smoobu
 ============================================================ */
$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_HTTPHEADER => [
        'Api-Key: ' . SMOOBU_API_KEY,
        'Content-Type: application/json',
        'Accept: application/json',
    ],
    CURLOPT_SSL_VERIFYPEER => true,
]);

if ($method === 'POST') {
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

if ($curl_error) {
    http_response_code(502);
    echo json_encode(['error' => 'Errore di connessione: ' . $curl_error]);
    exit;
}

/* Ritrasferisci lo stesso HTTP status code di Smoobu */
http_response_code($http_code);
echo $response;