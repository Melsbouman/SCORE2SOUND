import test from 'node:test';
import assert from 'node:assert/strict';
import { haalOp } from '../src/server/ontdek.mjs';

function nepFetch(antwoord, opgehaald) {
  return async (url) => { opgehaald.push(url); if (antwoord instanceof Error) throw antwoord; return antwoord; };
}

test('een bekend stuk wordt opgehaald bij raw.githubusercontent.com met een %-gecodeerd pad', async () => {
  const urls = [];
  const bytes = new Uint8Array([1, 2, 3]).buffer;
  const uit = await haalOp('lc6753259', { fetch: nepFetch({ ok: true, arrayBuffer: async () => bytes }, urls) });
  assert.equal(uit.status, 200);
  assert.deepEqual([...uit.body], [1, 2, 3]);
  assert.equal(uit.soort, 'application/octet-stream');
  assert.match(urls[0], /^https:\/\/raw\.githubusercontent\.com\/OpenScore\/Lieder\/main\/scores\//);
  assert.match(urls[0], /I%E2%80%99ve_Seen\/lc6753259\.mxl$/);
});

test('een onbekend id geeft 404 en een mislukte fetch geeft 502', async () => {
  assert.equal((await haalOp('bestaat-niet', { fetch: nepFetch({ ok: true }, []) })).status, 404);
  assert.equal((await haalOp('lc6753259', { fetch: nepFetch(new Error('netwerk'), []) })).status, 502);
  assert.equal((await haalOp('lc6753259', { fetch: nepFetch({ ok: false }, []) })).status, 502);
});
