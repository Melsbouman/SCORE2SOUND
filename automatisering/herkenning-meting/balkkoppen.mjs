// Toont per balk wat de eigen herkenning aan het begin leest (sleutel, voortekening, maatsoort) en hoeveel voortekens bij
// noten hij vindt, voor een of meer bladzijden (PGM, gemaakt met teken.py). Om met het oog na te lopen op stukken zonder
// referentie: node automatisering/herkenning-meting/balkkoppen.mjs <map>/galop-p1.pgm <map>/distant-p1.pgm ...
// Uitslag op 9 nov 2026 (avond, eerste bladzijden in C:/Brassmuziek PDF): Galop, Distant Land, Renaissance en Sand and Stars
// alle balkkoppen goed (42); Suite Gothique 9 van 11 (vage scan: een 3/2 en een 3/4 gemist of verkeerd); African Symphony:
// het raster vindt geen balken.
import { herken } from './pijplijn.mjs';

for (const pad of process.argv.slice(2)) {
  const r = herken(pad);
  const ia = r.schaal?.lijnafstand ?? 0;
  console.log(`== ${pad.split(/[\\/]/).pop()}: lijnafstand ${ia.toFixed(2)}, ${r.raster.balken.length} balken, ${r.tijd} ms`);
  (r.balkkoppen ?? []).forEach((k, b) => {
    const balk = r.raster.balken[b];
    const sleutel = k.sleutel ? `${k.sleutel.soort}${k.sleutel.lijn}` : '-';
    const maatsoort = k.maatsoort ? (k.maatsoort.symbool ?? `${k.maatsoort.teller}/${k.maatsoort.noemer}`) : '-';
    const tekens = r.voortekens?.[b] ?? [];
    console.log(`balk ${b} (y ${Math.round(balk.lijnen[0].a)}): sleutel ${sleutel}, voortekening ${k.voortekening.aantal}, maatsoort ${maatsoort}, `
      + `muziek vanaf ${((k.einde - balk.links) / ia).toFixed(1)} lijnafstand; voortekens bij noten ${tekens.length}`);
  });
}
