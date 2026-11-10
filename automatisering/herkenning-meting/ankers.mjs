// Toont per balk wat de stappen voor de maatnummering lezen: het gedrukte maatnummer aan het begin (maatnummers.mjs), de
// repetitiecijfers in een vierkant of rondje (repetitie.mjs) en de hokjes voor een eerste en tweede eind (hokjes.mjs).
// Gebruik: node automatisering/herkenning-meting/ankers.mjs <map>/galop-p1.pgm ...
// Per balk: 'nr' het maatnummer, 'rep' kader:waarde @app	est\maatstreep-musicxml.test.mjs (? = geen cijfer, zoals bij een letter), 'hokjes' [nummers]links-rechts
// (met ] als het hokje gesloten is).
import { leesPgm } from './pijplijn.mjs';
import { zwartWit, papierDrempel } from '../../app/src/herkenning/beeld.mjs';
import { meetSchaal } from '../../app/src/herkenning/schaal.mjs';
import { vindBalken } from '../../app/src/herkenning/raster.mjs';
import { verwijderLijnen } from '../../app/src/herkenning/vormen.mjs';
import { zoekRepetitiecijfers } from '../../app/src/herkenning/repetitie.mjs';
import { zoekHokjes } from '../../app/src/herkenning/hokjes.mjs';
import { leesMaatnummers } from '../../app/src/herkenning/maatnummers.mjs';
for (const pad of process.argv.slice(2)) {
  const grijs = leesPgm(pad);
  let zw = zwartWit(grijs);
  let schaal = meetSchaal(zw);
  let raster = vindBalken(zw, schaal);
  if (!raster.balken.length) {
    zw = zwartWit(grijs, { drempel: papierDrempel(grijs.pixels) });
    schaal = meetSchaal(zw);
    raster = vindBalken(zw, schaal);
  }
  if (!raster.balken.length) { console.log(`${pad}: geen notenbalken`); continue; }
  const kaal = verwijderLijnen(zw, raster, schaal);
  const repetitie = zoekRepetitiecijfers(kaal, raster, schaal);
  const hokjes = zoekHokjes(kaal, raster, schaal);
  const nummers = leesMaatnummers(kaal, raster, schaal);
  console.log(`${pad.split(/[\/]/).pop()}: ${raster.balken.length} balken, lijnafstand ${schaal.lijnafstand.toFixed(2)}`);
  raster.balken.forEach((_, b) => {
    const rep = (repetitie[b] ?? []).map((r) => `${r.kader}:${r.waarde ?? '?'} @${Math.round(r.x)}`).join(' ') || '-';
    const hok = (hokjes[b] ?? []).map((h) => `[${h.nummers.join(',') || '?'}${h.gesloten ? ']' : ''}${h.links}-${h.rechts}`).join(' ') || '-';
    console.log(`  balk ${b}: nr ${nummers[b]?.nummer ?? '-'} | rep ${rep} | hokjes ${hok}`);
  });
}
