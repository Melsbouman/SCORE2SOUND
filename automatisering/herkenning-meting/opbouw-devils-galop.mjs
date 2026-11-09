// Meting van de opbouw tot het muziekmodel (opbouw.mjs) op Devils Galop: per maat de noten (toonhoogte en duur) en rusten van
// het model naast de referentie, en daarna hetzelfde na de herstelketen (zoals na Audiveris), met het aantal maatduur-meldingen.
//
// Voorbereiden zoals bij devils-galop.mjs (teken.py en referentie.py; referentie.py geeft nu ook de duren).
// Meten: node automatisering/herkenning-meting/opbouw-devils-galop.mjs <map met p1.pgm, p2.pgm en ref.json> [--toon]
// Met --toon komen de verschillen per maat erbij.
import { readFileSync } from 'node:fs';
import { bouwModel } from './pijplijn.mjs';
import { herstelHerkenning } from '../../app/src/model/herstel.mjs';
import { vulRustGaten } from '../../app/src/model/rustgaten.mjs';
import { herstelTriolen } from '../../app/src/model/triolenherstel.mjs';
import { vulLegeMaten } from '../../app/src/controle/nabewerken.mjs';
import { controleerMaatduur } from '../../app/src/controle/maatduur.mjs';

const map = process.argv[2];
const toon = process.argv.includes('--toon');
if (!map) { console.error('Gebruik: node opbouw-devils-galop.mjs <map> [--toon]'); process.exit(2); }
const ref = JSON.parse(readFileSync(`${map}/ref.json`, 'utf8'));
// De referentie heeft vóór maat 41 twee mollen als voortekening die niet op het blad staan (zie devils-galop.mjs).
const ALTER = { 19: { 0: 0, 1: 0 }, 25: { 0: 0, 5: 0 }, 26: { 5: 0, 7: 0 }, 27: { 0: 0 } };

// De referentie per maat: noten (met de correcties) en rusten.
const verwacht = ref.map((maat, m) => {
  let i = 0;
  return maat.noten.filter((n) => !n.grace).map((n) => {
    if (n.rust) return { rust: true, duur: n.duur, heleMaat: n.heleMaat };
    const alter = ALTER[m + 1]?.[i] ?? n.alter;
    i += 1;
    return { hoogte: `${n.step}${alter}${n.oct}`, duur: n.duur, akkoord: n.chord, groep: n.groep, orde: `${n.oct}${'CDEFGAB'.indexOf(n.step)}` };
  });
}).map((maat) => {
  // Akkoorden in de referentie ook op toonhoogte sorteren (een akkoordnoot volgt zijn eerste noot).
  const uit = [];
  for (const e of maat) {
    if (e.akkoord && uit.length && Array.isArray(uit.at(-1))) uit.at(-1).push(e);
    else if (e.akkoord && uit.length) uit.push([uit.pop(), e]);
    else uit.push(e);
  }
  return uit.flatMap((e) => (Array.isArray(e) ? e.sort((a, b) => a.orde.localeCompare(b.orde)) : [e]));
});

function vergelijk(partituur, naam) {
  const maten = partituur.partijen[0].maten;
  const t = { maten: maten.length, hoogteGoed: 0, hoogte: 0, duurGoed: 0, duur: 0, groepDuurGoed: 0, groep: 0, rustGoed: 0, rust: 0, maatGoed: 0 };
  const verschillen = [];
  for (let m = 0; m < Math.min(maten.length, verwacht.length); m += 1) {
    const model = maten[m].elementen.filter((e) => e.soort === 'noot' || e.soort === 'rust');
    // Binnen een akkoord telt de volgorde niet: sorteer de noten met dezelfde start op toonhoogte.
    const sleutel = (e) => `${e.toonhoogte.octaaf}${'CDEFGAB'.indexOf(e.toonhoogte.stap)}`;
    model.sort((a, b) => a.start - b.start || (a.soort === 'noot' && b.soort === 'noot' ? sleutel(a).localeCompare(sleutel(b)) : 0));
    const exp = verwacht[m];
    const noten = model.filter((e) => e.soort === 'noot');
    const expNoten = exp.filter((e) => !e.rust);
    let goed = noten.length === expNoten.length;
    for (let i = 0; i < Math.max(noten.length, expNoten.length); i += 1) {
      const a = noten[i];
      const e = expNoten[i];
      if (!e) continue;
      t.hoogte += 1;
      if (e.groep) t.groep += 1; else t.duur += 1;
      if (!a) { goed = false; continue; }
      const hoogte = `${a.toonhoogte.stap}${a.toonhoogte.alter}${a.toonhoogte.octaaf}`;
      if (hoogte === e.hoogte) t.hoogteGoed += 1; else goed = false;
      if (a.duur === e.duur) { if (e.groep) t.groepDuurGoed += 1; else t.duurGoed += 1; } else goed = false;
    }
    const rusten = model.filter((e) => e.soort === 'rust');
    const expRusten = exp.filter((e) => e.rust);
    t.rust += expRusten.length;
    const rustDuren = rusten.map((r) => r.duur).sort((a, b) => a - b).join(',');
    const expDuren = expRusten.map((r) => r.duur).sort((a, b) => a - b).join(',');
    if (rustDuren === expDuren) t.rustGoed += expRusten.length; else goed = false;
    if (goed) t.maatGoed += 1;
    else if (toon) {
      const kort = (lijst) => lijst.map((e) => (e.soort === 'rust' || e.rust ? `r${e.duur}` : `${e.toonhoogte ? `${e.toonhoogte.stap}${e.toonhoogte.alter}${e.toonhoogte.octaaf}` : e.hoogte}:${e.duur}`)).join(' ');
      verschillen.push(`  maat ${m + 1}: model [${kort(model)}]  referentie [${kort(exp)}]`);
    }
  }
  console.log(`${naam}: maten ${t.maten} (referentie ${verwacht.length}), helemaal goed ${t.maatGoed}; toonhoogte ${t.hoogteGoed}/${t.hoogte}; `
    + `duur ${t.duurGoed}/${t.duur} (triolen ${t.groepDuurGoed}/${t.groep}); rusten ${t.rustGoed}/${t.rust}`);
  if (verschillen.length) console.log(verschillen.join('\n'));
  return t;
}

const model = bouwModel([`${map}/p1.pgm`, `${map}/p2.pgm`], { titel: 'Devils Galop' });
vergelijk(model, 'model');
// De herstelketen zoals na Audiveris (app/src/server/herken.mjs), voor zover die zonder server en tekstherkenning draait.
let na = herstelHerkenning(structuredClone(model));
na = vulRustGaten(na).partituur;
na = herstelTriolen(na).partituur;
na = vulLegeMaten(na);
vergelijk(na, 'na de herstelketen');
const meldingen = controleerMaatduur(na);
console.log(`maatduur-meldingen na de herstelketen: ${meldingen.length}${meldingen.length ? ` (${meldingen.slice(0, 8).map((m) => m.maat + 1).join(', ')}${meldingen.length > 8 ? ', ...' : ''})` : ''}`);
