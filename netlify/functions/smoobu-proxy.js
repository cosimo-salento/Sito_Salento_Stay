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
    const rawText  = await response.text();

    // Normalizza la risposta availability al formato atteso dal frontend:
    // { availability: { "YYYY-MM-DD": false (occupato) / true (libero) } }
    if (/^\/apartments\/\d+\/availability$/.test(path) && response.ok) {
      try {
        const json = JSON.parse(rawText);

        // Formato A: già nel formato corretto { availability: { date: bool } }
        if (json.availability && typeof Object.values(json.availability)[0] === 'boolean') {
          return { statusCode: response.status, headers, body: rawText };
        }

        // Formato B: { data: { "date": { available: 0/1 } } }
        const source = json.data || json.apartments?.[Object.keys(json.apartments || {})[0]] || {};
        const availability = {};
        for (const [date, val] of Object.entries(source)) {
          if (typeof val === 'object' && val !== null) {
            availability[date] = val.available !== 0 && val.available !== false;
          } else {
            availability[date] = val !== 0 && val !== false;
          }
        }
        return {
          statusCode: response.status,
          headers,
          body: JSON.stringify({ availability }),
        };
      } catch (_) {
        // Parsing fallito, restituisce risposta originale
      }
    }

    return {
      statusCode: response.status,
      headers,
      body: rawText,
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({ error: 'Errore connessione Smoobu: ' + err.message }),
    };
  }
};
