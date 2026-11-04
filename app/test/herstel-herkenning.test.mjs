import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelMaatsoorten as herstelMaatsoortenZonderTempo } from '../src/model/maatsoorten.mjs';
import { vulBeginRust } from '../src/model/beginrust.mjs';
import { vulOntbrekendeMaten } from '../src/model/ontbrekend.mjs';
import { markeerVerdachteNoten } from '../src/model/verdacht.mjs';
import { herstelHerkenning } from '../src/model/herstel.mjs';
import { herstelTitel } from '../src/model/titel.mjs';

const lees = async () => leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8'));

test('herstelHerkenning doet alle herstelstappen in vaste volgorde', async () => {
  const gelezen = await lees();
  const verwacht = markeerVerdachteNoten(vulVoltas(vulLetterGaten(vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(ruimZangtekstOp(scheidColofon(gelezen).partituur)))))));
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
import { tempoUitTekst } from '../src/model/tempotekst.mjs';

const herstelMaatsoorten = (partituur) => herstelMaatsoortenZonderTempo(tempoUitTekst(partituur));
import { vulLetterGaten } from '../src/model/lettergaten.mjs';
import { vulVoltas } from '../src/model/voltaherstel.mjs';
import { scheidColofon } from '../src/model/colofon.mjs';
