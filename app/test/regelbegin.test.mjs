import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { leesXmlBoom, kind, kinderen } from '../src/musicxml/xml.mjs';
import { leesZip } from '../src/server/zip.mjs';
import { bladenUitOmr, koppelOmr } from '../src/server/omr.mjs';

const voorbeeld = async (naam) => readFile(new URL(`./voorbeelden/${naam}`, import.meta.url));

test('koppelOmr markeert het begin van elke regel en de eerste pagina-maat', async () => {
  const partituur = leesMusicXML((await voorbeeld('herkenning.xml')).toString('utf8'));
  const omr = leesZip(await voorbeeld('herkenning.omr'));
  const [blad] = bladenUitOmr(omr, [1]);
  const uit = koppelOmr(partituur, [blad]).partituur;
  const systemen = kinderen(kind(leesXmlBoom(blad.xml), 'page'), 'system');

  for (const partij of uit.partijen) {
    assert.equal(partij.maten[0].regelbegin, true);
    assert.equal(partij.maten[0].paginabegin, true);
    assert.equal(partij.maten.filter((maat) => maat.regelbegin).length, systemen.length);
  }
});
