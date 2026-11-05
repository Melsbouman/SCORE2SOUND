import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';

for (const bestand of ['rust-9-maatrust.xml', 'rust-9-letter.xml']) {
  test(`${bestand} krijgt na herstel dezelfde maatnummering`, async () => {
    const xml = await readFile(new URL(`./fixtures/${bestand}`, import.meta.url), 'utf8');
    const maten = herstelHerkenning(vulOntbrekendeMaten(leesMusicXML(xml))).partijen[0].maten;

    assert.equal(maten.length, 10);
    assert.deepEqual(maten.map((maat) => maat.nummer), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    assert.equal(maten[0].maatrust, 9);
    assert.equal(maten[0].verborgen, undefined);
    for (let index = 1; index < 9; index += 1) assert.equal(maten[index].verborgen, true, `maat ${index + 1}`);
    assert.equal(maten[9].nummer, '10');
    assert.ok(maten[9].elementen.some((element) => element.soort === 'noot'));
  });
}
