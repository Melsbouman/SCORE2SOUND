import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelMaatsoorten } from '../src/model/maatsoorten.mjs';
import { vulBeginRust } from '../src/model/beginrust.mjs';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { markeerVerdachteNoten } from '../src/model/verdacht.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';

const lees = async () => leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));

test('herstelHerkenning doet alle herstelstappen in vaste volgorde', async () => {
  const gelezen = await lees();
  const verwacht = markeerVerdachteNoten(vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(gelezen))));
  assert.deepEqual(herstelHerkenning(gelezen), verwacht);
});

test('herstelHerkenning verandert de invoer niet en is een veilige tweede keer', async () => {
  const gelezen = await lees();
  const kopie = structuredClone(gelezen);
  const eerste = herstelHerkenning(gelezen);
  assert.deepEqual(gelezen, kopie);
  assert.equal(herstelHerkenning(eerste).partijen[0].maten.length, eerste.partijen[0].maten.length);
});
import { ruimZangtekstOp } from '../src/model/zangtekst.mjs';
