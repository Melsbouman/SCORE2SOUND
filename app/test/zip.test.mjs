import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesZip } from '../src/server/zip.mjs';

// Een zip met één niet-gecomprimeerd bestand, met de hand opgebouwd.
function kleineZip(naam, inhoud) {
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
  return Buffer.concat([lokaal, n, d, centraal, n, einde]);
}

test('leesZip leest een echt .omr-bestand met gecomprimeerde bestanden', async () => {
  const bestanden = leesZip(await readFile(new URL('./voorbeelden/herkenning.omr', import.meta.url)));
  assert.ok(bestanden instanceof Map);
  assert.ok(bestanden.has('book.xml'));
  assert.ok(bestanden.has('sheet#1/sheet#1.xml'));
  assert.match(bestanden.get('book.xml').toString('utf8'), /<book/);
  assert.deepEqual([...bestanden.get('sheet#1/BINARY.png').subarray(1, 4)], [0x50, 0x4e, 0x47]);
});

test('leesZip leest een niet-gecomprimeerd bestand', () => {
  const bestanden = leesZip(kleineZip('map/a.txt', 'hallo'));
  assert.deepEqual([...bestanden.keys()], ['map/a.txt']);
  assert.equal(bestanden.get('map/a.txt').toString('utf8'), 'hallo');
});

test('leesZip geeft een begrijpelijke fout bij een ander bestand', () => {
  assert.throws(() => leesZip(Buffer.from('dit is geen zip')), /geen geldig zip-bestand/);
  assert.throws(() => leesZip(Buffer.alloc(0)), /geen geldig zip-bestand/);
});
