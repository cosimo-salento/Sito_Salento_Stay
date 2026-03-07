<?php
// ============================================================
// FILE DI TEST — carica sul server e apri nel browser
// es: https://salento-stay.com/test-smoobu.php
// ELIMINA questo file dopo il test!
// ============================================================

$API_KEY = 'Cx1ve1yOhiw0geRsYpfrIpAPH6ZpC5sFotJ80loOMo'; // ← incolla qui la tua API key
$APARTMENT_ID = '3192155'; // ID Villetta Enzo 1

header('Content-Type: text/html; charset=utf-8');

echo '<h2>🔍 Test connessione Smoobu</h2>';

// ── 1. cURL disponibile? ──────────────────────────────────
echo '<h3>1. cURL</h3>';
if (!function_exists('curl_init')) {
    echo '❌ cURL NON disponibile sul server. Contatta il tuo hosting.';
    exit;
}
echo '✅ cURL disponibile<br>';

// ── 2. Chiamata API Smoobu ────────────────────────────────
echo '<h3>2. Chiamata API Smoobu</h3>';
$today = date('Y-m-d');
$end = date('Y-m-d', strtotime('+30 days'));
$url = "https://login.smoobu.com/api/apartments/{$APARTMENT_ID}/availability?start_date={$today}&end_date={$end}";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Api-Key: ' . $API_KEY,
    'Content-Type: application/json',
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "HTTP Status: <strong>{$httpCode}</strong><br>";

if ($error) {
    echo "❌ Errore cURL: <strong>{$error}</strong><br>";
    exit;
}

if ($httpCode === 200) {
    echo '✅ Connessione riuscita!<br>';
    $data = json_decode($response, true);
    $count = count($data['availability'] ?? []);
    echo "✅ Date ricevute: <strong>{$count}</strong><br>";
}
elseif ($httpCode === 401) {
    echo '❌ <strong>API key non valida o scaduta.</strong> Controlla su Smoobu → Impostazioni → API<br>';
}
elseif ($httpCode === 403) {
    echo '❌ <strong>Accesso negato.</strong> L\'API key non ha i permessi per questo appartamento.<br>';
}
elseif ($httpCode === 404) {
    echo "❌ <strong>Appartamento non trovato.</strong> Verifica che l'ID {$APARTMENT_ID} sia corretto.<br>";
}
else {
    echo "❌ Errore imprevisto. Risposta del server:<br><pre>{$response}</pre>";
}

// ── 3. Controlla il proxy ────────────────────────────────
echo '<h3>3. File proxy</h3>';
if (file_exists(__DIR__ . '/smoobu-proxy.php')) {
    echo '✅ smoobu-proxy.php trovato nella stessa cartella<br>';
}
else {
    echo '❌ smoobu-proxy.php NON trovato — assicurati di averlo caricato nella cartella giusta<br>';
}

echo '<br><hr><p style="color:red"><strong>⚠️ ELIMINA questo file dal server dopo il test!</strong></p>';
?>