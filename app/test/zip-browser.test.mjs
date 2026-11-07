import test from 'node:test';
import assert from 'node:assert/strict';
import { leesZip } from '../src/server/zip.mjs';
import { leesZipBrowser } from '../src/zip-browser.mjs';

test('leesZipBrowser leest hetzelfde als leesZip bij een kleine zip', async () => {
  const inhoud = 'hallo';
  const naam = 'map/a.txt';
  
  const n = Buffer.from(naam);
  const d = Buffer.from(inhoud);
  const lokaal = Buffer.alloc(30);
  lokaal.writeUInt32LE(0x04034b50, 0);
  lokaal.writeUInt32LE(d.length, 18);
  lokaal.writeUInt32LE(d.length, 22);
  lokaal.writeUInt16LE(n.length, 26);
  const centraal = Buffer.alloc(46);
  centraal.writeUInt32LE(0x02014b50, 0);
  centraal.writeUInt32LE(d.length, 20);
  centraal.writeUInt32LE(d.length, 24);
  centraal.writeUInt16LE(n.length, 28);
  const start = lokaal.length + n.length + d.length;
  const einde = Buffer.alloc(22);
  einde.writeUInt32LE(0x06054b50, 0);
  einde.writeUInt16LE(1, 8);
  einde.writeUInt16LE(1, 10);
  einde.writeUInt32LE(centraal.length + n.length, 12);
  einde.writeUInt32LE(start, 16);
  
  const buffer = Buffer.concat([lokaal, n, d, centraal, n, einde]);
  
  const bestandenBrowser = await leesZipBrowser(buffer);
  const bestandenServer = leesZip(buffer);
  
  assert.deepEqual([...bestandenBrowser.keys()], [...bestandenServer.keys()]);
  for (const [naam, inhoud] of bestandenBrowser) {
    assert.deepEqual(inhoud, bestandenServer.get(naam));
  }
});

test('leesZipBrowser geeft een begrijpelijke fout bij een ongeldige invoer', async () => {
  assert.rejects(leesZipBrowser(Buffer.from('dit is geen zip-bestand')), /geen geldig zip-bestand/);
  assert.rejects(leesZipBrowser(Buffer.alloc(0)), /geen geldig zip-bestand/);
});