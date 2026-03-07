// netlify/functions/smoobu-proxy.js
// ─────────────────────────────────────────────────────────────
// Netlify Serverless Function — proxy per l'API Smoobu
// Posizione: netlify/functions/smoobu-proxy.js
// ─────────────────────────────────────────────────────────────

const SMOOBU_API_KEY = 'Cx1ve1yOhiw0geRsYpfrIpAPH6ZpC5sFotJ80loOMo';
const SMOOBU_BASE    = 'https://login.smoobu.com/api';

exports.handler = async (event) => {

  const headers = {
    'Access-Control-Allow-Origin':  'https://salento-stay.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };

  // Pre-flight CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Leggi il path dall'URL  es. /?path=/apartments/123/availability
  const path = event.queryStringParameters?.path || '';

  // Whitelist path ammessi
  const allowed = [
    /^\/apartments\/\d+\/availability$/,
    /^\/rates\/apartments\/\d+$/,
    /^\/reservations$/,
  ];
  if (!allowed.some(r => r.test(path))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Path non consentito' }) };
  }

  // Ricostruisci query string (senza il parametro "path")
  const params = { ...event.queryStringParameters };
  delete params.path;
  const qs = new URLSearchParams(params).toString();
  const url = SMOOBU_BASE + path + (qs ? `?${qs}` : '');

  try {
    const fetchOptions = {
      method:  event.httpMethod === 'POST' ? 'POST' : 'GET',
      headers: {
        'Api-Key':      SMOOBU_API_KEY,
        'Content-Type': 'application/json',
        'Accept':       'application/json',
      },
    };
    if (event.httpMethod === 'POST' && event.body) {
      fetchOptions.body = event.body;
    }

    const response = await fetch(url, fetchOptions);
    const data     = await response.text();

    return {
      statusCode: response.status,
      headers,
      body: data,
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Errore connessione Smoobu: ' + err.message }),
    };
  }
};
