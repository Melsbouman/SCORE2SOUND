import test from 'node:test';
import assert from 'node:assert/strict';
import { scheidColofon } from '../src/model/colofon.mjs';

const noot = (start, lettergreep) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  ...(lettergreep ? { teksten: [{ couplet: 1, lettergreep, soort: 'single' }] } : {}),
});

const maat = (index, elementen) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});

test('een uitgeversregel onder de laatste noten gaat naar het colofon', () => {
  const woorden = ["Salva'tionist", 'Music', 'Publications', 'Supplies', 'Fean', 'Holland'];
  const invoer = {
    versie: 1, titel: '', componist: '',
    partijen: [{
      id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
      maten: [
        maat(0, [noot(0), noot(480)]),
        maat(1, [noot(0), noot(480)]),
        maat(2, woorden.map((woord, index) => noot(index * 480, woord))),
      ],
    }],
  };

  const uit = scheidColofon(invoer);
  const teksten = uit.partituur.partijen[0].maten.flatMap((item) => item.elementen).filter((element) => element.teksten?.length);

  assert.deepEqual(teksten, []);
});
