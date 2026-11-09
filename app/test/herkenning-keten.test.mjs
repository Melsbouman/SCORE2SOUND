import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { grijzeBladen, leesBladReeks, plaatsBeelden, verklein, isPdf, draai } from '../src/herkenning/bladen.mjs';
import { herkenPartituur, herkenPagina } from '../src/herkenning/keten.mjs';
import { sjabloon } from '../src/herkenning/sjablonen.mjs';
import { maakBlad } from './hulp/blad.mjs';

const NL = '\n';

// Een kleine pdf: twee grijze stroken (boven zwart, onder lichtgrijs) die samen de bladzijde vullen, of een bladzijde zonder beeld.
function maakPdf({ metBeelden = true } = {}) {
  const delen = [];
  const voeg = (tekst) => delen.push(Buffer.from(tekst, 'latin1'));
  const stroom = (nummer, woordenboek, data) => {
    voeg(`${nummer} 0 obj << ${woordenboek} /Length ${data.length} >> stream${NL}`);
    delen.push(Buffer.from(data));
    voeg(`${NL}endstream endobj${NL}`);
  };
  voeg(`%PDF-1.4${NL}`);
  voeg(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj${NL}`);
  voeg(`2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 100 200] >> endobj${NL}`);
  if (metBeelden) {
    voeg(`3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /XObject << /Boven 5 0 R /Onder 6 0 R >> >> >> endobj${NL}`);
    // Boven: de bovenste helft van de bladzijde (y van 100 tot 200), onder: de onderste helft.
    stroom(4, '/Filter /FlateDecode', deflateSync(Buffer.from('q 100 0 0 100 0 100 cm /Boven Do Q q 100 0 0 100 0 0 cm /Onder Do Q', 'latin1')));
    stroom(5, '/Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode', deflateSync(Buffer.alloc(100, 0)));
    stroom(6, '/Type /XObject /Subtype /Image /Width 10 /Height 10 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode', deflateSync(Buffer.alloc(100, 200)));
  } else {
    voeg(`3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R >> endobj${NL}`);
    stroom(4, '', Buffer.from('0 0 m 100 100 l S', 'latin1'));
  }
  voeg(`%%EOF${NL}`);
  return new Uint8Array(Buffer.concat(delen));
}

test('bladen: een reeks bladzijden met komma\'s of spaties, en leeg is alles', () => {
  assert.deepEqual(leesBladReeks('1-3 5', 6), [1, 2, 3, 5]);
  assert.deepEqual(leesBladReeks('2, 4-9', 6), [2, 4, 5, 6]);
  assert.deepEqual(leesBladReeks('', 3), [1, 2, 3]);
  assert.deepEqual(leesBladReeks('3-1', 5), [1, 2, 3], 'een omgekeerde reeks');
  assert.deepEqual(leesBladReeks('7', 5), [], 'een bladzijde die er niet is');
  assert.deepEqual(leesBladReeks('1-99999999999', 4), [1, 2, 3, 4], 'een heel grote reeks stopt bij de laatste bladzijde');
  assert.equal(isPdf(maakPdf()), true);
  assert.equal(isPdf(new Uint8Array([0xff, 0xd8, 0xff])), false);
});

test('bladen: verkleinen neemt het gemiddelde, en stroken komen samen op hun plek', () => {
  const groot = { breedte: 6, hoogte: 2, pixels: Uint8Array.from([0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255]) };
  const klein = verklein(groot, 3);
  assert.deepEqual([klein.breedte, klein.hoogte, ...klein.pixels], [3, 1, 128, 128, 128]);
  // Twee stroken van 10 x 10 op een bladzijde van 100 x 200 punten: boven zwart, onder grijs.
  const blad = plaatsBeelden([0, 0, 100, 200], [
    { breedte: 10, hoogte: 10, pixels: new Uint8Array(100).fill(0), matrix: [100, 0, 0, 100, 0, 100] },
    { breedte: 10, hoogte: 10, pixels: new Uint8Array(100).fill(200), matrix: [100, 0, 0, 100, 0, 0] },
  ], 1000);
  assert.deepEqual([blad.breedte, blad.hoogte], [100, 200], 'zo scherp als het scherpste beeld, hier 1 pixel per punt');
  assert.equal(blad.pixels[10 * blad.breedte + 50], 0, 'boven zwart');
  assert.equal(blad.pixels[150 * blad.breedte + 50], 200, 'onder grijs');
  // Vier zwarte stroken onder elkaar: geen witte rij op de naad.
  const stroken = [0, 1, 2, 3].map((i) => ({ breedte: 333, hoogte: 83, pixels: new Uint8Array(333 * 83), matrix: [100, 0, 0, 25, 0, 75 - 25 * i] }));
  const samen = plaatsBeelden([0, 0, 100, 100], stroken, 400);
  for (let y = 0; y < samen.hoogte; y += 1) assert.equal(samen.pixels[y * samen.breedte + 200], 0, `rij ${y} is zwart`);
});

test('bladen: een bladzijde draaien (de /Rotate van een pdf)', () => {
  // 3 x 2: rij 1 = 1 2 3, rij 2 = 4 5 6.
  const blad = { breedte: 3, hoogte: 2, pixels: Uint8Array.from([1, 2, 3, 4, 5, 6]) };
  assert.deepEqual([...draai(blad, 90).pixels], [4, 1, 5, 2, 6, 3]);
  assert.deepEqual([draai(blad, 90).breedte, draai(blad, 90).hoogte], [2, 3]);
  assert.deepEqual([...draai(blad, 180).pixels], [6, 5, 4, 3, 2, 1]);
  assert.deepEqual([...draai(blad, 270).pixels], [3, 6, 2, 5, 1, 4]);
  assert.equal(draai(blad, 0), blad);
});

test('bladen: de beelden uit een pdf op hun plek; een pdf zonder beelden geeft code geen-beelden', async () => {
  const [blad] = await grijzeBladen(maakPdf(), { ontcijfer: () => assert.fail('geen jpeg') });
  assert.equal(blad.blad, 1);
  assert.equal(blad.pixels[Math.floor(blad.hoogte * 0.25) * blad.breedte + Math.floor(blad.breedte / 2)], 0);
  assert.equal(blad.pixels[Math.floor(blad.hoogte * 0.75) * blad.breedte + Math.floor(blad.breedte / 2)], 200);
  await assert.rejects(grijzeBladen(maakPdf({ metBeelden: false }), {}), (fout) => fout.code === 'geen-beelden');
  // Een losse afbeelding gaat naar de ontcijferaar van de aanroeper.
  const gevraagd = [];
  const [foto] = await grijzeBladen(new Uint8Array([0x89, 0x50, 0x4e, 0x47]), {
    ontcijfer: async (bytes, type) => { gevraagd.push(type); return { breedte: 2, hoogte: 1, pixels: Uint8Array.from([0, 255]) }; },
  });
  assert.deepEqual(gevraagd, ['image/png']);
  assert.deepEqual([foto.breedte, foto.hoogte], [2, 1]);
});

// Eén balk met een vioolsleutel, 4/4, twee maten met vier kwartnoten (e f g a | b c d e) en maatstrepen.
function muziekBlad() {
  const ia = 20;
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia, rechts: 780 });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
  };
  const streep = (x) => { for (let yy = y(0); yy <= y(8); yy += 1) { zet(x, yy); zet(x + 1, yy); } };
  stempel('sleutel-g', 110, y(6));
  stempel('cijfer-4', 180, y(2));
  stempel('cijfer-4', 180, y(6));
  [8, 7, 6, 5].forEach((stap, i) => stempel('kop-zwart', 250 + i * 55, y(stap)));
  streep(470);
  [4, 3, 2, 1].forEach((stap, i) => stempel('kop-zwart', 510 + i * 55, y(stap)));
  streep(776);
  return beeld;
}

test('keten: van een grijze bladzijde naar een partituur met sleutel, maatsoort, toonhoogtes en duren', () => {
  const blad = muziekBlad();
  const stappen = [];
  const { partituur, meldingen, bladenZonderBalken } = herkenPartituur([blad], { titel: 'Proef', voortgang: (v) => stappen.push(v.fase) });
  assert.deepEqual(stappen, ['blad', 'opbouw']);
  assert.deepEqual(bladenZonderBalken, []);
  assert.equal(partituur.titel, 'Proef');
  const maten = partituur.partijen[0].maten;
  assert.equal(maten.length, 2);
  assert.deepEqual(maten[0].sleutels[0], { teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 });
  assert.deepEqual([maten[0].maatsoort.teller, maten[0].maatsoort.noemer], [4, 4]);
  const toon = (maat) => maat.elementen.filter((e) => e.soort === 'noot').map((e) => `${e.toonhoogte.stap}${e.toonhoogte.octaaf}:${e.duur}`);
  assert.deepEqual(toon(maten[0]), ['E4:480', 'F4:480', 'G4:480', 'A4:480']);
  assert.deepEqual(toon(maten[1]), ['B4:480', 'C5:480', 'D5:480', 'E5:480']);
  assert.ok(maten[0].vak && maten[0].regelbegin, 'een maat weet waar hij op het blad staat');
  assert.deepEqual(partituur.bron.bladen, [{ nummer: 1, breedte: blad.breedte, hoogte: blad.hoogte }]);
  assert.deepEqual(meldingen.filter((m) => m.soort === 'maatduur'), []);
});

test('keten: een lege bladzijde heeft geen notenbalken; alleen lege bladzijden geven een fout met code geen-notenbalken', () => {
  const leeg = { breedte: 400, hoogte: 300, pixels: new Uint8Array(400 * 300).fill(255) };
  assert.equal(herkenPagina(leeg).raster.balken.length, 0);
  assert.throws(() => herkenPartituur([leeg]), (fout) => fout.code === 'geen-notenbalken' && /geen notenbalken/.test(fout.message));
  // Het bladnummer (niet de plek in de lijst) in de uitkomst en de meldingen.
  const { partituur, bladenZonderBalken, meldingen } = herkenPartituur([{ ...muziekBlad(), blad: 3 }, { ...leeg, blad: 5 }]);
  assert.deepEqual(bladenZonderBalken, [5]);
  assert.deepEqual(partituur.bron.bladen.map((b) => b.nummer), [3]);
  assert.ok(meldingen.some((m) => m.soort === 'herkenning' && /pagina 5/.test(m.tekst)));
});

// Een maatsoortwissel midden in de regel: 4/4 met vier kwarten, een maatstreep, dan 3/4 met drie kwarten, en een hele noot met
// tremolostreepjes eronder (die geen 2/2 is).
function wisselBlad() {
  const ia = 20;
  const { beeld, verwacht } = maakBlad({ balken: 1, koppen: false, maatstrepen: false, lijnafstand: ia, rechts: 1100 });
  const zet = (x, y) => { beeld.pixels[Math.round(y) * beeld.breedte + Math.round(x)] = 0; };
  const y = (stap) => Math.round(verwacht.balken[0].lijnen[0].a + (stap * ia) / 2);
  const stempel = (naam, ax, ay) => {
    const t = sjabloon(naam, ia);
    for (let dy = 0; dy < t.hoogte; dy += 1) for (let dx = 0; dx < t.breedte; dx += 1) if (t.pixels[dy * t.breedte + dx]) zet(ax - t.ankerX + dx, ay - t.ankerY + dy);
    return t;
  };
  const streep = (x) => { for (let yy = y(0); yy <= y(8); yy += 1) { zet(x, yy); zet(x + 1, yy); } };
  stempel('sleutel-g', 110, y(6));
  stempel('cijfer-4', 180, y(2));
  stempel('cijfer-4', 180, y(6));
  [8, 7, 6, 5].forEach((stap, i) => stempel('kop-zwart', 250 + i * 55, y(stap)));
  streep(470);
  stempel('cijfer-3', 495, y(2));
  stempel('cijfer-4', 495, y(6));
  [4, 3, 2].forEach((stap, i) => stempel('kop-zwart', 560 + i * 60, y(stap)));
  streep(760);
  // Een maat met een hele noot (in 3/4 te lang, maar het gaat om de wissel) met tremolostreepjes eronder.
  const heel = stempel('kop-heel', 800, y(0));
  for (const stap of [3, 4.5, 6]) for (let d = 0; d < 16; d += 1) for (let dy = -2; dy <= 2; dy += 1) zet(800 + heel.breedte / 2 - 8 + d, y(stap) + dy - Math.round(d / 4));
  streep(1096);
  return beeld;
}

test('keten: een maatsoortwissel midden in de regel geldt vanaf de maat erna; een hele noot met tremolo is geen wissel', () => {
  const { partituur } = herkenPartituur([wisselBlad()]);
  const maten = partituur.partijen[0].maten;
  assert.deepEqual(maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}`), ['4/4', '3/4', '3/4']);
  const toon = (maat) => maat.elementen.filter((e) => e.soort === 'noot').map((e) => `${e.toonhoogte.stap}${e.toonhoogte.octaaf}`);
  assert.deepEqual(toon(maten[1]), ['B4', 'C5', 'D5'], 'de cijfers 3 en 4 zijn geen noten');
  assert.deepEqual(maten[1].elementen.filter((e) => e.soort === 'rust'), [], 'en geen rusten');
});
