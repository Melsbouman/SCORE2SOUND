import test from 'node:test';
import assert from 'node:assert/strict';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { speelVolgorde, uitgevouwen } from '../src/model/maten.mjs';

const maat = (index, extra = {}) => ({
  nummer: String(index + 1),
  index,
  opmaat: false,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
  tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [],
  ...extra,
});

const partij = (maten) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Piano',
    afkorting: '',
    instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten,
  }],
});

test('volta: eerste en tweede einde worden gelezen, geschreven en in de speelvolgorde gezet', () => {
  const maten = [
    maat(0, { herhaling: { begin: true, eind: false, keer: 2 } }),
    maat(1),
    maat(2, { volta: { nummers: [1], begin: true, eind: true } }),
    maat(3, {
      herhaling: { begin: false, eind: true, keer: 2 },
      volta: { nummers: [2], begin: true, eind: true },
    }),
    maat(4),
    maat(5),
  ];
  const partituur = partij(maten);

  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 0, 1, 3, 4, 5]);

  const opnieuw = leesMusicXML(naarMusicXML(partituur)).partijen[0].maten;
  assert.deepEqual(opnieuw.map((deel) => deel.volta ?? null), [
    null, null,
    { nummers: [1], begin: true, eind: true },
    { nummers: [2], begin: true, eind: true },
    null, null,
  ]);
  assert.deepEqual(speelVolgorde(opnieuw), [0, 1, 2, 0, 1, 3, 4, 5]);

  const uit = uitgevouwen(partituur);
  assert.deepEqual(uit.partijen[0].maten.map((deel) => deel.nummer), ['1', '2', '3', '1', '2', '4', '5', '6']);
  assert.ok(uit.partijen[0].maten.every((deel) => !('volta' in deel)));
});

test('een herhaling zonder volta blijft ongewijzigd spelen', () => {
  const maten = [
    maat(0, { herhaling: { begin: true, eind: false, keer: 2 } }),
    maat(1),
    maat(2, { herhaling: { begin: false, eind: true, keer: 2 } }),
    maat(3),
    maat(4),
    maat(5),
  ];
  assert.deepEqual(speelVolgorde(maten), [0, 1, 2, 0, 1, 2, 3, 4, 5]);
});
