import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { leesZip } from '../src/server/zip.mjs';
import { koppelOmr, lijnPositie, bladenUitOmr, voegPaginasSamen } from '../src/server/omr.mjs';

const voorbeeld = async (naam) => readFile(new URL(`./voorbeelden/${naam}`, import.meta.url));
const noten = (partituur) => partituur.partijen.flatMap((p) => p.maten.flatMap((m) => m.elementen)).filter((e) => e.soort === 'noot');

async function gekoppeld(wijzig = (xml) => xml) {
  const partituur = leesMusicXML((await voorbeeld('herkenning.xml')).toString('utf8'));
  const omr = leesZip(await voorbeeld('herkenning.omr'));
  const bladen = bladenUitOmr(omr, [1]).map((blad) => ({ ...blad, xml: wijzig(blad.xml) }));
  return { partituur, bladen, uit: koppelOmr(partituur, bladen) };
}

test('lijnPositie: 0 is de middelste lijn, omhoog is negatief', () => {
  const viool = { teken: 'G', lijn: 2, octaafVerschuiving: 0 };
  const bas = { teken: 'F', lijn: 4, octaafVerschuiving: 0 };
  assert.equal(lijnPositie({ stap: 'B', alter: 0, octaaf: 4 }, viool), 0);
  assert.equal(lijnPositie({ stap: 'C', alter: 0, octaaf: 5 }, viool), -1);
  assert.equal(lijnPositie({ stap: 'E', alter: 0, octaaf: 4 }, viool), 4);
  assert.equal(lijnPositie({ stap: 'D', alter: 0, octaaf: 3 }, bas), 0);
  assert.equal(lijnPositie({ stap: 'B', alter: -1, octaaf: 3 }, { teken: 'C', lijn: 3, octaafVerschuiving: 0 }), 1);
});

test('bladenUitOmr geeft per gevraagd blad de xml, de afbeelding en de maten', async () => {
  const [blad] = bladenUitOmr(leesZip(await voorbeeld('herkenning.omr')), [1]);
  assert.equal(blad.nummer, 1);
  assert.deepEqual([blad.breedte, blad.hoogte], [2100, 900]);
  assert.match(blad.xml, /<sheet/);
  assert.equal(blad.png[1], 0x50);
});

test('koppelOmr vindt elke noot van het voorbeeld, met zekerheid en plek', async () => {
  const { uit } = await gekoppeld();
  assert.equal(uit.nietGekoppeld, 0);
  assert.equal(noten(uit.partituur).length, 23);
  for (const noot of noten(uit.partituur)) {
    assert.ok(noot.zekerheid > 0 && noot.zekerheid <= 1);
    assert.equal(noot.plek.blad, 1);
    assert.ok(noot.plek.x > 0 && noot.plek.x < 2100 && noot.plek.y > 0 && noot.plek.y < 900);
    assert.ok(noot.plek.breedte > 0 && noot.plek.hoogte > 0);
  }
});

test('koppelOmr zet noten in volgorde op het blad: elke noot in een maat ligt rechts van of onder de vorige', async () => {
  const { uit } = await gekoppeld();
  const eerste = uit.partituur.partijen[0].maten[0].elementen.filter((e) => e.soort === 'noot');
  assert.ok(eerste[0].plek.x < eerste[1].plek.x && eerste[1].plek.x < eerste[2].plek.x);
  const tweePartijen = uit.partituur.partijen.map((p) => p.maten[0].elementen.find((e) => e.soort === 'noot').plek.y);
  assert.ok(tweePartijen[0] < tweePartijen[1], 'de eerste partij staat boven de tweede');
});

test('koppelOmr neemt de ctx-grade over, ook als die lager is dan 0,8', async () => {
  // De eerste kop op notenbalk 1 krijgt een lage waarde.
  const verlaag = (xml) => xml.replace(/(<head [^>]*ctx-grade=")[\d.]+("[^>]*staff="1")/, '$10.4$2');
  const { uit } = await gekoppeld(verlaag);
  const lage = noten(uit.partituur).filter((n) => n.zekerheid < 0.8);
  assert.equal(lage.length, 1);
  assert.equal(lage[0].zekerheid, 0.4);
});

test('koppelOmr behoudt de zekerheid van een noot zonder kop en telt hem', async () => {
  const weg = (xml) => xml.replace(/<head [^>]*staff="2"[^>]*>[\s\S]*?<\/head>/, '');
  const { partituur, uit } = await gekoppeld(weg);
  assert.equal(uit.nietGekoppeld, 1);
  const origineleNoten = noten(partituur);
  const uitvoerNoten = noten(uit.partituur);
  const index = uitvoerNoten.findIndex((n) => !n.plek);
  assert.notEqual(index, -1);
  assert.equal(uitvoerNoten.filter((n) => !n.plek).length, 1);
  assert.equal(uitvoerNoten[index].zekerheid, origineleNoten[index].zekerheid);
});

test('koppelOmr laat de oorspronkelijke partituur met rust en zet de bron erop', async () => {
  const { partituur, uit } = await gekoppeld();
  assert.ok(noten(partituur).every((n) => n.zekerheid === 1 && !n.plek));
  assert.deepEqual(uit.partituur.bron.bladen, [{ nummer: 1, breedte: 2100, hoogte: 900 }]);
});

test('koppelOmr slaat een blad met een ander aantal notenbalken over en meldt dat', async () => {
  const partituur = leesMusicXML((await voorbeeld('herkenning.xml')).toString('utf8'));
  partituur.partijen.pop();
  const bladen = bladenUitOmr(leesZip(await voorbeeld('herkenning.omr')), [1]);
  const uit = koppelOmr(partituur, bladen);
  assert.deepEqual(uit.overgeslagen, [1]);
  assert.ok(noten(uit.partituur).every((n) => n.zekerheid <= 0.5));
});

test('voegPaginasSamen zet partijen die per pagina anders heten weer op een lijn', () => {
  const maten = (noot) => [0, 1, 2, 3].map((index) => ({ index, nummer: String(index + 1), elementen: noot.includes(index) ? [{ soort: 'noot' }] : [] }));
  const partij = (id, naam, noot) => ({ id, naam, instrument: {}, maten: maten(noot) });
  const partituur = { partijen: [partij('P1', 'Hoorn', [0]), partij('P2', 'Voice', [1]), partij('P3', 'Fliigelhom 1', [2]), partij('P4', 'Tuba', [3])] };
  const bookXml = `<book>
    <sheet number="2"><page><system><part name="Hoorn" logical-id="1"/><part logical-id="2"/></system></page></sheet>
    <sheet number="3"><page><system><part name="Fliigelhom 1" logical-id="3"/><part name="Tuba" logical-id="4"/></system></page></sheet>
  </book>`;
  const blad = (nummer) => ({ nummer, xml: '<sheet><page><system><stack/><stack/></system></page></sheet>' });
  const uit = voegPaginasSamen(partituur, bookXml, [blad(2), blad(3)]);
  assert.deepEqual(uit.partijen.map((p) => [p.id, p.naam]), [['P1', 'Hoorn'], ['P2', 'Tuba']]);
  assert.deepEqual(uit.partijen.map((p) => p.maten.map((m) => m.elementen.length)), [[1, 0, 1, 0], [0, 1, 0, 1]]);
  assert.deepEqual(uit.partijen[0].maten.map((m) => m.index), [0, 1, 2, 3]);
});

test('voegPaginasSamen laat de partituur staan als er niets samen te voegen valt', async () => {
  const partituur = leesMusicXML((await voorbeeld('herkenning.xml')).toString('utf8'));
  const omr = leesZip(await voorbeeld('herkenning.omr'));
  assert.equal(voegPaginasSamen(partituur, omr.get('book.xml').toString('utf8'), bladenUitOmr(omr, [1])), partituur);
});

test('koppelOmr rekent rusten om: de hoogste waarde van Audiveris telt als zeker', async () => {
  const { uit } = await gekoppeld();
  const rust = uit.partituur.partijen[1].maten[1].elementen.find((e) => e.soort === 'rust');
  assert.equal(rust.zekerheid, 0.978); // ctx-grade 0,782 van de 0,8
  assert.equal(rust.plek.blad, 1);
  const { uit: laag } = await gekoppeld((xml) => xml.replace(/(<rest [^>]*ctx-grade=")[\d.]+/, '$10.4'));
  assert.equal(laag.partituur.partijen[1].maten[1].elementen.find((e) => e.soort === 'rust').zekerheid, 0.5);
});
