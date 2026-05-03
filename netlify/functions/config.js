const { getStore } = require('@netlify/blobs');
const STORE_NAME = 'freshcart';
const KEY = 'config';

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  try {
    const store = getStore(STORE_NAME);
    if (event.httpMethod === 'GET') {
      const config = await store.get(KEY, { type: 'json' });
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, config: config || null }) };
    }
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (!body.config || typeof body.config !== 'object') {
        return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Missing config object.' }) };
      }
      const clean = JSON.parse(JSON.stringify(body.config));
      clean.updatedAt = new Date().toISOString();
      await store.setJSON(KEY, clean);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, config: clean }) };
    }
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed.' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
