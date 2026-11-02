import test from 'node:test';
import assert from 'node:assert/strict';
import { schrijfMidi } from '../src/midi/schrijven.mjs';
import { tempoOverloop } from '../src/model/tempoverloop.mjs';

const tekst = (waarde) => ({ soort: 'aanwijzing', start: 0, type: 'tekst', waarde, zekerheid: 1 });
const noot = (start) => ({
  soort: 'noot',
  start,
  duur: 1920,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 4 },
  articulaties: [],
  fermate: false,
  overbinding: { begin: false, eind: false },
});
const maat = (index, elementen = [], extra = {}) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  tempo: null,
  elementen,
  ...extra,
});

function partituur(aanwijzing = 'rall.', metATempo = true) {
  const maten = Array.from({ length: 6 }, (_, index) => maat(index, [noot(0)]));
  maten[0].tempo = 120;
  maten[2].elementen.push(tekst(aanwijzing));
  if (metATempo) maten[5].elementen.push(tekst('a tempo'));
  return {
    partijen: [{
      id: 'P1',
      naam: 'Piano',
      instrument: { midiProgramma: 0, transpositie: { chromatisch: 0 } },
      maten,
    }],
  };
}

function tempi(bytes) {
  const data = Uint8Array.from(bytes);
  const lengte = (plek) => ((data[plek] << 24) | (data[plek + 1] << 16) | (data[plek + 2] << 8) | data[plek + 3]) >>> 0;
  const spoorBegin = 14;
  const einde = spoorBegin + 8 + lengte(spoorBegin + 4);
  let plek = spoorBegin + 8;
  let tik = 0;
  const gebeurtenissen = [];
  while (plek < einde) {
    let delta = 0;
    let byte;
    do {
      byte = data[plek++];
      delta = (delta << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    tik += delta;
    const status = data[plek++];
    const type = data[plek++];
    let aantal = 0;
    do {
      byte = data[plek++];
      aantal = (aantal << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    const inhoud = [...data.slice(plek, plek + aantal)];
    plek += aantal;
    if (type === 0x51) gebeurtenissen.push({
      tik,
      microseconden: (inhoud[0] << 16) | (inhoud[1] << 8) | inhoud[2],
    });
    if (status === 0xff && type === 0x2f) break;
  }
  return gebeurtenissen;
}

function duurInSeconden(bytes, eindTik) {
  const gebeurtenissen = tempi(bytes);
  let huidigTik = 0;
  let microseconden = 500000;
  let duur = 0;
  for (const gebeurtenis of gebeurtenissen) {
    duur += (gebeurtenis.tik - huidigTik) * microseconden / 480 / 1000000;
    huidigTik = gebeurtenis.tik;
    microseconden = gebeurtenis.microseconden;
  }
  return duur + (eindTik - huidigTik) * microseconden / 480 / 1000000;
}

test('tempoOverloop loopt van rall. in maat 3 tot a tempo in maat 6', () => {
  assert.deepEqual(tempoOverloop(partituur()), [{ vanMaat: 2, totMaat: 5, factorEind: 0.75 }]);
});

test('tempoOverloop versnelt bij accel. en loopt zonder a tempo over twee maten', () => {
  assert.ok(tempoOverloop(partituur('accel.', false))[0].factorEind > 1);
  assert.equal(tempoOverloop(partituur('molto rall.', false))[0].factorEind, 0.6);
  assert.deepEqual(tempoOverloop(partituur('rall.', false)), [{ vanMaat: 2, totMaat: 4, factorEind: 0.75 }]);
});

test('tempoOverloop geeft geen verlopen zonder tempoaanwijzingen', () => {
  const bron = partituur();
  bron.partijen[0].maten[2].elementen = [tekst('intro')];
  assert.deepEqual(tempoOverloop(bron), []);
});

test('rall. verlengt de MIDI-uitvoering en overige teksten veranderen de MIDI-bytes niet', () => {
  const zonder = partituur();
  zonder.partijen[0].maten[2].elementen = [tekst('intro')];
  const metRall = structuredClone(zonder);
  metRall.partijen[0].maten[2].elementen = [tekst('rall.')];
  metRall.partijen[0].maten[5].elementen = [tekst('a tempo')];

  const midiZonder = schrijfMidi(zonder);
  const midiMetRall = schrijfMidi(metRall);
  assert.ok(duurInSeconden(midiMetRall, 6 * 1920) > duurInSeconden(midiZonder, 6 * 1920));
  assert.deepEqual(midiZonder, schrijfMidi(structuredClone(zonder)));
});
