import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { leesZip } from '../src/server/zip.mjs';
import { koppelOmr, bladenUitOmr } from '../src/server/omr.mjs';

const voorbeeld = async (naam) => readFile(new URL(`./voorbeelden/${naam}`, import.meta.url));

test('koppelOmr telt redenen voor noten zonder passende kop', async () => {
  const partituur = leesMusicXML((await voorbeeld('herkenning.xml')).toString('utf8'));
  const noot = partituur.partijen[0].maten[0].elementen.find((element) => element.soort === 'noot');
  partituur.partijen[0].maten[0].elementen.push({
    ...structuredClone(noot),
    toonhoogte: { stap: 'C', alter: 0, octaaf: 0 },
  });
  const bladen = bladenUitOmr(leesZip(await voorbeeld('herkenning.omr')), [1]);

  const uit = koppelOmr(partituur, bladen);

  assert.equal(uit.redenen.andereToonhoogte, 1);
  assert.equal(uit.redenen.geenKopInMaat, 0);
  assert.equal(uit.redenen.alGebruikt, 0);
  assert.equal(Object.values(uit.redenen).reduce((som, aantal) => som + aantal, 0), uit.nietGekoppeld);
});
