// netlify/functions/smoobu-proxy.js
// Netlify Serverless Function — proxy per l'API Smoobu

const SMOOBU_API_KEY = 'Cx1ve1yOhiw0geRsYpfrIpAPH6ZpC5sFotJ80loOMo';
const SMOOBU_BASE    = 'https://login.smoobu.com/api';

exports.handler = async (event) => {

  const allowedOrigins = [
    'https://salento-stay.com',
    'https://www.salento-stay.com',
  ];
  const origin = event.headers?.origin || event.headers?.Origin || '';
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  const headers = {
    'Access-Control-Allow-Origin':  corsOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type':                 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  const path    = event.queryStringParameters?.path || '';
  const pathOnly = path.split('?')[0];

  // Whitelist path ammessi (controlla solo la parte prima del "?")
  const allowed = [
    /^\/apartments\/\d+\/availability$/,
    /^\/rates\/apartments\/\d+$/,
    /^\/reservations$/,
  ];
  if (!allowed.some(r => r.test(pathOnly))) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Path non consentito' }) };
  }

  const smoobuHeaders = {
    'Api-Key':      SMOOBU_API_KEY,
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  };

  // Helper: estrae la query string dal path (la parte dopo "?")
  const pathQs = path.includes('?') ? path.split('?')[1] : '';

  try {

    // ── /apartments/{id}/availability ──────────────────────────────────────
    // L'endpoint non esiste in Smoobu: traduciamo in /rates?apartments[]={id}
    const availMatch = pathOnly.match(/^\/apartments\/(\d+)\/availability$/);
    if (availMatch) {
      const apartmentId = availMatch[1];
      const params = new URLSearchParams(pathQs);
      params.set('apartments[]', apartmentId);
      const url = `${SMOOBU_BASE}/rates?${params.toString()}`;

      const response = await fetch(url, { headers: smoobuHeaders });
      if (!response.ok) throw new Error(`Smoobu ${response.status}`);
      const json = await response.json();

      // Risposta Smoobu: { data: { "{id}": { "YYYY-MM-DD": { available: 0/1 } } } }
      // Normalizziamo in:  { availability: { "YYYY-MM-DD": true/false } }
      const apartmentData = json.data?.[apartmentId] || {};
      const availability  = {};
      for (const [date, val] of Object.entries(apartmentData)) {
        availability[date] = val.available !== 0 && val.available !== false;
      }
      return { statusCode: 200, headers, body: JSON.stringify({ availability }) };
    }

    // ── /rates/apartments/{id} ─────────────────────────────────────────────
    // Anche questo non esiste: traduciamo in /rates?apartments[]={id}
    // Restituiamo il totale per il preventivo
    const ratesMatch = pathOnly.match(/^\/rates\/apartments\/(\d+)$/);
    if (ratesMatch) {
      const apartmentId = ratesMatch[1];
      const params = new URLSearchParams(pathQs);
      params.set('apartments[]', apartmentId);
      const url = `${SMOOBU_BASE}/rates?${params.toString()}`;

      const response = await fetch(url, { headers: smoobuHeaders });
      if (!response.ok) throw new Error(`Smoobu ${response.status}`);
      const json = await response.json();

      // Somma i prezzi giornalieri per calcolare il totale del soggiorno
      const apartmentData = json.data?.[apartmentId] || {};
      let total    = 0;
      let hasPrice = false;
      for (const val of Object.values(apartmentData)) {
        if (val.price !== null && val.price !== undefined) {
          total += val.price;
          hasPrice = true;
        }
      }
      const price = hasPrice ? total : null;
      return { statusCode: 200, headers, body: JSON.stringify({ price, total: price }) };
    }

    // ── /reservations ──────────────────────────────────────────────────────
    // Pass-through diretto (GET lista o POST nuova prenotazione)
    const fetchOptions = {
      method:  event.httpMethod === 'POST' ? 'POST' : 'GET',
      headers: smoobuHeaders,
    };
    if (event.httpMethod === 'POST' && event.body) {
      fetchOptions.body = event.body;
    }
    const url      = SMOOBU_BASE + path;
    const response = await fetch(url, fetchOptions);
    const rawText  = await response.text();
    return { statusCode: response.status, headers, body: rawText };

  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Errore connessione Smoobu: ' + err.message }),
    };
  }
};
