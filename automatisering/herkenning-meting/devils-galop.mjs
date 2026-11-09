// Meting van de eigen herkenning op Devils Galop (2nd Cornet): nootkoppen (plek), voortekens bij noten (soort en haakjes) en
// de balkkop (sleutel, voortekening, maatsoort). Het blad heeft overal een vioolsleutel, geen voortekening en alleen op de
// eerste regel 4/4.
//
// Voorbereiden (eenmalig, de pdf en de MXL staan buiten het repo):
//   python -I automatisering/herkenning-meting/teken.py "C:/Brassmuziek PDF/Devils Galop (Brass Band) - 004 2nd Cornet Bb.pdf" <map>/p
//   python -I automatisering/herkenning-meting/referentie.py "C:/Brassmuziek PDF/MXL/Devilsgalopmusicmxl.mxl" <map>/ref.json
// Meten:
//   node automatisering/herkenning-meting/devils-galop.mjs <map>
// Uitslag op 9 nov 2026 (avond): balkkoppen 17/17, koppen 250/250, voortekens 64/64 (3 tussen haakjes), niets te veel.
import { readFileSync } from 'node:fs';
import { herken } from './pijplijn.mjs';

const map = process.argv[2];
if (!map) { console.error('Gebruik: node devils-galop.mjs <map met p1.pgm, p2.pgm en ref.json>'); process.exit(2); }
const ref = JSON.parse(readFileSync(`${map}/ref.json`, 'utf8'));
// Het eerste maatnummer van elke regel, per bladzijde (met het nummer na de laatste regel).
const REGELS = [[1, 11, 17, 22, 27, 34, 40, 45, 49, 53], [53, 60, 65, 72, 79, 84, 89, 97, 103]];
// De referentie heeft vóór maat 41 twee mollen als voortekening die niet op het blad staan; daardoor zijn een paar
// toonhoogtes fout. Correcties naar het blad, per maat (plek van de noot in de maat, zonder rusten): de alter, en voortekens
// die het blad extra laat zien (herinneringen, soms tussen haakjes).
const ALTER = { 19: { 0: 0, 1: 0 }, 25: { 0: 0, 5: 0 }, 26: { 5: 0, 7: 0 }, 27: { 0: 0 } };
const EXTRA = {
  16: { 0: ['herstel', false] }, 18: { 0: ['herstel', false] }, 41: { 0: ['herstel', true] },
  46: { 0: ['herstel', false], 3: ['herstel', true] }, 82: { 0: ['herstel', false] }, 84: { 0: ['herstel', false] },
};
const STAMMEN = 'CDEFGAB';
// Vioolsleutel: f5 op de bovenste lijn (stap 0).
const stapVan = (noot) => 38 - (noot.oct * 7 + STAMMEN.indexOf(noot.step));

// De noten van een reeks maten zoals gedrukt, met het verwachte voorteken: zonder voortekening geldt een voorteken tot het
// eind van de maat op dezelfde plek. Akkoorden van boven naar beneden.
function verwacht(van, tot) {
  const uit = [];
  for (let m = van; m < tot; m += 1) {
    const maat = JSON.parse(JSON.stringify(ref[m - 1]));
    const noten = maat.noten.filter((n) => !n.rust && !n.grace);
    noten.forEach((n, i) => {
      if (ALTER[m]?.[i] !== undefined) n.alter = ALTER[m][i];
      [n.extra, n.haakjes] = EXTRA[m]?.[i] ?? [null, false];
    });
    const staat = new Map();
    const groepen = [];
    for (const n of noten) if (n.chord && groepen.length) groepen.at(-1).push(n); else groepen.push([n]);
    for (const groep of groepen) {
      for (const n of groep) {
        n.stap = stapVan(n);
        n.maat = m;
        const nu = staat.get(n.stap) ?? 0;
        n.verwacht = n.extra ?? (n.alter !== nu ? { 1: 'kruis', '-1': 'mol', 0: 'herstel' }[n.alter] ?? `?${n.alter}` : null);
        staat.set(n.stap, n.alter);
      }
      uit.push(...groep.sort((p, q) => p.stap - q.stap));
    }
  }
  return uit;
}

const telling = { koppen: 0, koppenGoed: 0, tekens: 0, tekensGoed: 0, gemist: 0, fout: 0, teVeel: 0, balkkoppen: 0, balkkoppenGoed: 0 };
const meldingen = [];
for (const p of [1, 2]) {
  const r = herken(`${map}/p${p}.pgm`);
  r.raster.balken.forEach((balk, b) => {
    const [van, tot] = [REGELS[p - 1][b], REGELS[p - 1][b + 1]];
    const plek = `p${p} balk ${b} (m${van})`;
    const ia = r.schaal.lijnafstand;
    if (r.balkkoppen) {
      const k = r.balkkoppen[b];
      const maatsoort = k.maatsoort ? (k.maatsoort.symbool ?? `${k.maatsoort.teller}/${k.maatsoort.noemer}`) : '-';
      const goed = k.sleutel?.soort === 'G' && k.sleutel.lijn === 2 && k.voortekening.aantal === 0 && maatsoort === (van === 1 ? '4/4' : '-');
      telling.balkkoppen += 1;
      if (goed) telling.balkkoppenGoed += 1;
      else meldingen.push(`${plek}: balkkop ${k.sleutel ? k.sleutel.soort + k.sleutel.lijn : '-'}, voortekening ${k.voortekening.aantal}, maatsoort ${maatsoort}`);
    }
    const exp = verwacht(van, tot);
    const koppen = [...r.noten[b]].sort((a, c) => (Math.abs(a.x - c.x) < ia * 0.6 ? a.stap - c.stap : a.x - c.x));
    if (koppen.length !== exp.length) meldingen.push(`${plek}: ${koppen.length} koppen, verwacht ${exp.length}`);
    for (let i = 0; i < Math.min(koppen.length, exp.length); i += 1) {
      telling.koppen += 1;
      if (koppen[i].stap === exp[i].stap) telling.koppenGoed += 1;
      else meldingen.push(`${plek} m${exp[i].maat}: kop op stap ${koppen[i].stap}, verwacht ${exp[i].stap}`);
      if (!r.voortekens) continue;
      const v = r.voortekens[b].find((teken) => teken.kop === r.noten[b].indexOf(koppen[i]));
      const e = exp[i].verwacht;
      if (e) telling.tekens += 1;
      if (e && v && v.soort === e) {
        telling.tekensGoed += 1;
        if (v.haakjes !== exp[i].haakjes) meldingen.push(`${plek} m${exp[i].maat}: haakjes ${v.haakjes}, verwacht ${exp[i].haakjes}`);
      } else if (e && v) { telling.fout += 1; meldingen.push(`${plek} m${exp[i].maat} x${koppen[i].x}: ${v.soort}, verwacht ${e}`); }
      else if (e) { telling.gemist += 1; meldingen.push(`${plek} m${exp[i].maat} x${koppen[i].x}: geen voorteken, verwacht ${e}`); }
      else if (v) { telling.teVeel += 1; meldingen.push(`${plek} m${exp[i].maat} x${koppen[i].x}: ${v.soort}, verwacht geen`); }
    }
  });
}
if (meldingen.length) console.log(meldingen.join('\n'));
console.log(`balkkoppen ${telling.balkkoppenGoed}/${telling.balkkoppen}`);
console.log(`koppen ${telling.koppenGoed}/${telling.koppen}`);
console.log(`voortekens ${telling.tekensGoed}/${telling.tekens}, gemist ${telling.gemist}, verkeerde soort ${telling.fout}, te veel ${telling.teVeel}`);
