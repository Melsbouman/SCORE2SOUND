import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { schrijfNootMetOverbinding } from '../src/model/invoeren.mjs';
import { schrijfMidi } from '../src/midi/schrijven.mjs';

const toonhoogten = [
  { stap: 'C', alter: 0, octaaf: 5 },
  { stap: 'D', alter: 0, octaaf: 5 },
  { stap: 'E', alter: 0, octaaf: 5 },
  { stap: 'F', alter: 0, octaaf: 5 },
  { stap: 'G', alter: 0, octaaf: 5 },
  { stap: 'A', alter: 0, octaaf: 5 },
  { stap: 'B', alter: 0, octaaf: 5 },
  { stap: 'C', alter: 0, octaaf: 6 },
];

function aantalMidiNoten(bytes) {
  let positie = 14;
  let aantal = 0;

  const leesVlq = () => {
    let waarde = 0;
    let byte;
    do {
      byte = bytes[positie++];
      waarde = (waarde << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return waarde;
  };

  while (positie < bytes.length) {
    const spoorEinde = positie + 8
      + ((bytes[positie + 4] << 24) | (bytes[positie + 5] << 16)
        | (bytes[positie + 6] << 8) | bytes[positie + 7]);
    positie += 8;
    let status = 0;

    while (positie < spoorEinde) {
      leesVlq();
      if (bytes[positie] & 0x80) status = bytes[positie++];
      if (status === 0xff) {
        positie += 1;
        const lengte = leesVlq();
        positie += lengte;
        status = 0;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        const lengte = leesVlq();
        positie += lengte;
        status = 0;
        continue;
      }
      const soort = status & 0xf0;
      if (soort === 0x90 && bytes[positie + 1] > 0) aantal += 1;
      positie += soort === 0xc0 || soort === 0xd0 ? 1 : 2;
    }
  }

  return aantal;
}

test('schrijft acht maten zonder scherm en speelt de 64 noten af via MIDI', () => {
  let stuk = maakLeegStuk({
    instrumenten: ['trompet'],
    aantalMaten: 8,
    maatsoort: { teller: 4, noemer: 4 },
  });

  for (let maatIndex = 0; maatIndex < 8; maatIndex += 1) {
    for (let nootIndex = 0; nootIndex < toonhoogten.length; nootIndex += 1) {
      stuk = schrijfNootMetOverbinding(
        stuk, 'P1', maatIndex, nootIndex * 240, 240, toonhoogten[nootIndex],
      );
    }
  }

  assert.throws(
    () => schrijfNootMetOverbinding(stuk, 'P1', 7, 1680, 960, toonhoogten[0]),
    /Geen maat meer/,
  );
  for (const maat of stuk.partijen[0].maten) {
    assert.deepEqual(
      maat.elementen.map((element) => ({
        soort: element.soort,
        start: element.start,
        duur: element.duur,
        toonhoogte: element.toonhoogte,
      })),
      toonhoogten.map((toonhoogte, index) => ({
        soort: 'noot', start: index * 240, duur: 240, toonhoogte,
      })),
    );
  }
  assert.equal(aantalMidiNoten(schrijfMidi(stuk)), 64);
});
