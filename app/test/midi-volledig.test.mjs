import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { herstelMaatsoorten } from '../src/model/maatsoorten.mjs';
import { maatLengte } from '../src/model/duur.mjs';
import { maakVolumeOp } from '../src/midi/dynamiek.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

function spoor(midi, nummer) {
  let positie = 14;
  const sporen = [];
  while (positie < midi.length) {
    const lengte = (midi[positie + 4] << 24) | (midi[positie + 5] << 16) | (midi[positie + 6] << 8) | midi[positie + 7];
    sporen.push(midi.slice(positie + 8, positie + 8 + lengte));
    positie += 8 + lengte;
  }
  return sporen[nummer];
}

function notenAan(bytes) {
  let i = 0;
  let status = 0;
  const aan = [];
  const lees = () => { let waarde = 0; let b; do { b = bytes[i++]; waarde = (waarde << 7) | (b & 0x7f); } while (b & 0x80); return waarde; };
  while (i < bytes.length) {
    lees();
    if (bytes[i] & 0x80) { status = bytes[i]; i += 1; }
    if (status === 0xff) { i += 1; const lengte = lees(); i += lengte; status = 0; continue; }
    if (status === 0xf0 || status === 0xf7) { i += lees(); status = 0; continue; }
    const soort = status & 0xf0;
    if (soort === 0x90 || soort === 0x80) {
      const toets = bytes[i]; const kracht = bytes[i + 1]; i += 2;
      if (soort === 0x90 && kracht > 0) aan.push({ toets, kracht });
    } else i += soort === 0xc0 || soort === 0xd0 ? 1 : 2;
  }
  return aan;
}

function maatDuur(maat) {
  if (!maat.opmaat) return maatLengte(maat.maatsoort);
  return maat.elementen
    .filter((element) => element.soort === 'noot' || element.soort === 'rust')
    .reduce((einde, element) => Math.max(einde, element.start + element.duur), 0);
}

function metDynamiek(partituur) {
  const dynamiekniveaus = [['ppp', 30], ['pp', 40], ['p', 55], ['mp', 68], ['mf', 80], ['f', 95], ['ff', 110], ['fff', 120]];
  const verloopsteksten = new Set(['cresc.', 'cresc', 'crescendo', 'dim.', 'dimin.', 'decresc.', 'decrescendo']);
  return {
    ...partituur,
    partijen: partituur.partijen.map((partij) => {
      const volume = maakVolumeOp(partij);
      let maatBegin = 0;
      const maten = partij.maten.map((maat) => {
        const elementen = [];
        for (const element of maat.elementen) {
          const aanwijzing = element.soort === 'aanwijzing';
          const tekst = String(element.waarde ?? '').trim().toLowerCase();
          const isVerlooptekst = aanwijzing && element.type === 'tekst' && verloopsteksten.has(tekst);
          const eenmaligeDynamiek = aanwijzing && element.type === 'dynamiek' && ['sf', 'sfz', 'fp'].includes(tekst);
          if (aanwijzing && ((element.type === 'dynamiek' && !eenmaligeDynamiek)
            || element.type === 'crescendo' || element.type === 'decrescendo' || isVerlooptekst)) continue;
          if (element.soort === 'noot' && !element.voorslag) {
            const kracht = volume(maatBegin + element.start);
            const dynamiek = dynamiekniveaus.reduce((beste, kandidaat) =>
              Math.abs(kandidaat[1] - kracht) < Math.abs(beste[1] - kracht) ? kandidaat : beste
            )[0];
            elementen.push({ soort: 'aanwijzing', start: element.start, type: 'dynamiek', waarde: dynamiek, zekerheid: 1 });
          }
          elementen.push(element);
        }
        maatBegin += maatDuur(maat);
        return { ...maat, elementen };
      });
      return { ...partij, maten };
    }),
  };
}

test('in het MIDI-bestand van een echt stuk klinken (bijna) alle noten, en niet te zacht', async () => {
  const partituur = herstelMaatsoorten(leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8')));
  const noten = partituur.partijen[0].maten.flatMap((maat) => maat.elementen).filter((e) => e.soort === 'noot' && !e.overbinding?.eind);
  const aan = notenAan(spoor(schrijfMidi(partituur), 1));
  assert.ok(aan.length >= Math.floor(noten.length * 0.97), `${aan.length} van ${noten.length} noten klinken`);
  assert.ok(aan.every((n) => n.toets >= 0 && n.toets <= 127));
  const zacht = aan.filter((n) => n.kracht < 25).length;
  assert.equal(zacht, 0, `${zacht} noten klinken met een snelheid onder 25`);
});

test('alle noten uit een echt stuk krijgen na dynamiek een snelheid van minstens 30', async () => {
  const partituur = herstelMaatsoorten(leesMusicXML(await readFile(new URL('./fixtures/sand-and-stars-begin.xml', import.meta.url), 'utf8')));
  const aan = notenAan(spoor(schrijfMidi(metDynamiek(partituur)), 1));
  assert.ok(aan.every((noot) => noot.kracht >= 30), 'een noot klinkt met een snelheid onder 30');
});
