import test from 'node:test';
import assert from 'node:assert/strict';
import { voegHaakToe } from '../src/model/corrigeren.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const partituur = () => ({
  versie: 1, titel: '', componist: '',
  partijen: [{
    id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{
      nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [noot(0), noot(480), noot(960), noot(1440)],
    }],
  }],
});

for (const [soort, xmlType] of [['crescendo', 'crescendo'], ['decrescendo', 'diminuendo']]) {
  test(`${soort} wordt als MusicXML-wedge geschreven`, () => {
    const metHaak = voegHaakToe(partituur(), 'P1', 0, 0, 0, 1440, soort);
    const xml = naarMusicXML(metHaak);

    assert.ok(xml.includes(`<wedge type="${xmlType}"/>`));
    assert.ok(xml.includes('<wedge type="stop"/>'));
  });
}
