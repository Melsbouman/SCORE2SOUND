import assert from 'node:assert/strict';
import { once } from 'node:events';
import http from 'node:http';
import test from 'node:test';

import { maakServer } from '../server.mjs';

async function metServer(uitvoeren) {
  const server = maakServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    await uitvoeren(server);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

function verzoek(server, { pad, type, grootte, teken = 'x' }) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      method: 'POST',
      path: pad,
      headers: {
        'content-type': type,
        'content-length': grootte,
      },
    }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    const stuk = teken.repeat(100_000);
    let resterend = grootte;
    while (resterend > 0) {
      const deel = stuk.slice(0, Math.min(stuk.length, resterend));
      req.write(deel);
      resterend -= deel.length;
    }
    req.end();
  });
}

test('de server begrenst de tijd van verbindingen', () => {
  const server = maakServer();
  assert.equal(server.headersTimeout, 15_000);
  assert.equal(server.requestTimeout, 600_000);
  assert.equal(server.keepAliveTimeout, 5_000);
});

test('een JSON-verzoek van meer dan 10 miljoen bytes wordt geweigerd', async () => {
  await metServer(async (server) => {
    const status = await verzoek(server, {
      pad: '/api/projecten',
      type: 'application/json',
      grootte: 10_500_000,
    });
    assert.equal(status, 413);
  });
});

test('een upload van 11 miljoen bytes valt niet onder de JSON-grens', async () => {
  await metServer(async (server) => {
    const status = await verzoek(server, {
      pad: '/api/importeer',
      type: 'application/octet-stream',
      grootte: 11_000_000,
    });
    assert.notEqual(status, 413);
  });
});
