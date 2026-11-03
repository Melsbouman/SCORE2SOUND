import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { herstelMaatsoorten } from '../src/model/maatsoorten.mjs';
import { vulBeginRust } from '../src/model/beginrust.mjs';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { markeerVerdachteNoten } from '../src/model/verdacht.mjs';

const VELDEN = ['nummer', 'index', 'opmaat', 'maatsoort', 'toonsoort', 'sleutels', 'tempo', 'herhaling', 'elementen'];

test('na alle herstelfuncties heeft elke maat alle velden en laat de partituur zich schrijven', async () => {
  const gelezen = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  const klaar = markeerVerdachteNoten(vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(gelezen))));
  klaar.partijen[0].maten.forEach((maat, i) => {
    for (const veld of VELDEN) assert.ok(veld in maat, `maat ${i} mist ${veld}`);
    assert.equal(maat.index, i);
    assert.ok(Number.isFinite(maat.toonsoort.kwinten), `maat ${i}: toonsoort.kwinten`);
    assert.ok(maat.maatsoort.teller > 0 && maat.maatsoort.noemer > 0, `maat ${i}: maatsoort`);
  });
  assert.doesNotThrow(() => naarMusicXML(klaar, { weergave: true }));
  assert.doesNotThrow(() => naarMusicXML(klaar));
});

test('elke stap van de herstelketen geeft een schrijfbare partituur', async () => {
  const gelezen = leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));
  for (const stap of [herstelMaatsoorten, vulBeginRust, vulOntbrekendeMaten, markeerVerdachteNoten]) {
    assert.doesNotThrow(() => naarMusicXML(stap(gelezen), { weergave: true }), stap.name);
  }
});
