import test from 'node:test';
import assert from 'node:assert/strict';
import { vergelijkMusicXML } from '../src/meting/vergelijk.mjs';

// Een maat is een lijst tekens: 'C4:1' (stap, octaaf, duur in divisions), 'C#4:1' of 'Bb3:2' met voorteken,
// '+E4:1' voor een akkoordnoot bij de vorige noot, 'R:4' voor een rust, en 'M3' voor een meermaats-rust van 3 maten.
function noot(teken) {
  const akkoord = teken.startsWith('+');
  const [toon, duur] = teken.replace('+', '').split(':');
  if (toon === 'R') return `<note><rest/><duration>${duur}</duration></note>`;
  const m = toon.match(/^([A-G])(#|b)?(\d)$/);
  const alter = m[2] === '#' ? '<alter>1</alter>' : m[2] === 'b' ? '<alter>-1</alter>' : '';
  return `<note>${akkoord ? '<chord/>' : ''}<pitch><step>${m[1]}</step>${alter}<octave>${m[3]}</octave></pitch><duration>${duur}</duration></note>`;
}

function xml(maten, divisions = 1) {
  const inhoud = maten
    .map((maat, i) => {
      const attributen = i === 0 ? `<attributes><divisions>${divisions}</divisions><time><beats>4</beats><beat-type>4</beat-type></time></attributes>` : '';
      const meer = maat.find((t) => t.startsWith('M'));
      const stijl = meer ? `<attributes><measure-style><multiple-rest>${meer.slice(1)}</multiple-rest></measure-style></attributes>` : '';
      const noten = maat.filter((t) => !t.startsWith('M')).map(noot).join('');
      return `<measure number="${i + 1}">${attributen}${stijl}${noten}</measure>`;
    })
    .join('');
  return `<?xml version="1.0"?><score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Cornet</part-name></score-part></part-list><part id="P1">${inhoud}</part></score-partwise>`;
}

test('een kruis telt mee: C is niet hetzelfde als Cis', () => {
  const r = vergelijkMusicXML(xml([['C4:1', 'D4:1', 'E4:1', 'F4:1']]), xml([['C#4:1', 'D4:1', 'E4:1', 'F4:1']]));
  assert.equal(r.noten, 4);
  assert.equal(r.juist, 3);
  assert.equal(r.toonhoogteJuist, 3);
  assert.equal(r.duurJuist, 4);
  assert.equal(r.matenJuist, 0);
});

test('een andere duur telt als fout, de toonhoogte blijft goed', () => {
  const r = vergelijkMusicXML(xml([['C4:1', 'D4:1', 'E4:2']]), xml([['C4:2', 'D4:1', 'E4:1']]));
  assert.equal(r.noten, 3);
  assert.equal(r.juist, 1);
  assert.equal(r.toonhoogteJuist, 3);
  assert.equal(r.duurJuist, 2);
});

test('verschillende divisions geven dezelfde duur', () => {
  const r = vergelijkMusicXML(xml([['C4:1', 'D4:1', 'E4:2']], 1), xml([['C4:4', 'D4:4', 'E4:8']], 4));
  assert.equal(r.juist, 3);
  assert.equal(r.nauwkeurigheid, 1);
  assert.equal(r.matenJuist, 1);
});

test('een ontbrekende maat laat de rest niet opschuiven', () => {
  const juist = xml([['C4:4'], ['D4:4'], ['E4:4'], ['F4:4']]);
  const gemeten = xml([['C4:4'], ['E4:4'], ['F4:4']]);
  const r = vergelijkMusicXML(juist, gemeten);
  assert.equal(r.maten, 4);
  assert.equal(r.matenJuist, 3);
  assert.equal(r.matenOntbrekend, 1);
  assert.equal(r.matenExtra, 0);
  assert.equal(r.juist, 3);
  assert.equal(r.noten, 4);
  assert.deepEqual(
    r.verschillen.map((v) => [v.soort, v.maat]),
    [['ontbreekt', '2']],
  );
});

test('een extra maat telt als extra en niet als fout in de andere maten', () => {
  const juist = xml([['C4:4'], ['D4:4'], ['E4:4']]);
  const gemeten = xml([['C4:4'], ['G4:2', 'A4:2'], ['D4:4'], ['E4:4']]);
  const r = vergelijkMusicXML(juist, gemeten);
  assert.equal(r.matenJuist, 3);
  assert.equal(r.matenExtra, 1);
  assert.equal(r.juist, 3);
  assert.equal(r.verschillen[0].soort, 'extra');
  assert.equal(r.verschillen[0].gemeten, '2');
});

test('een meermaats-rust telt als het juiste aantal lege maten', () => {
  const juist = xml([['R:4'], ['R:4'], ['R:4'], ['C4:4']]);
  const gemeten = xml([['M3', 'R:4'], ['R:4'], ['R:4'], ['C4:4']]);
  const r = vergelijkMusicXML(juist, gemeten);
  assert.equal(r.maten, 4);
  assert.equal(r.matenJuist, 4);
  assert.equal(r.matenOntbrekend, 0);
  assert.equal(r.juist, 1);
});

test('de volgorde van noten in een akkoord maakt niet uit', () => {
  const r = vergelijkMusicXML(xml([['C4:4', '+E4:4']]), xml([['E4:4', '+C4:4']]));
  assert.equal(r.noten, 2);
  assert.equal(r.juist, 2);
  assert.equal(r.matenJuist, 1);
});

test('per partij staan de aantallen apart', () => {
  const r = vergelijkMusicXML(xml([['C4:4'], ['D4:4']]), xml([['C4:4'], ['E4:4']]));
  assert.equal(r.partijen.length, 1);
  assert.equal(r.partijen[0].naam, 'Cornet');
  assert.equal(r.partijen[0].noten, 2);
  assert.equal(r.partijen[0].juist, 1);
  assert.equal(r.partijen[0].matenJuist, 1);
});
