// Maatduur-meldingen van de eigen herkenning per stuk: de opbouw tot het model met de herstelketen erachter (zoals na
// Audiveris), en dan het aantal maten waarvan de duur niet klopt met de maatsoort. Zonder referentie: per stuk een getal om te
// zien of een wijziging helpt, en met --toon de foute maten met wat erin staat.
// Gebruik: node automatisering/herkenning-meting/maatduur.mjs <map>/galop-p1.pgm "<map>/sand-p1.pgm+<map>/sand-p2.pgm" [--toon]
// (bladzijden van één stuk met + aan elkaar; de PGM-bestanden maakt teken.py).
import { bouwModel } from './pijplijn.mjs';
import { herstelHerkenning } from '../../app/src/model/herstel.mjs';
import { vulRustGaten } from '../../app/src/model/rustgaten.mjs';
import { herstelTriolen } from '../../app/src/model/triolenherstel.mjs';
import { controleerMaatduur } from '../../app/src/controle/maatduur.mjs';

const toon = process.argv.includes('--toon');
const kort = (e) => (e.soort === 'noot' ? `${e.toonhoogte.stap}${e.toonhoogte.octaaf}:${e.duur}${e.akkoord ? '+' : ''}` : e.soort === 'rust' ? `r:${e.duur}` : '');
for (const stuk of process.argv.slice(2).filter((arg) => arg !== '--toon')) {
  const paden = stuk.split('+');
  const partituur = herstelTriolen(vulRustGaten(herstelHerkenning(bouwModel(paden, {}))).partituur).partituur;
  const maten = partituur.partijen[0].maten;
  const meldingen = controleerMaatduur(partituur);
  console.log(`${paden[0].split(/[\\/]/).pop()}: ${maten.length} maten, maatduur ${meldingen.length}`);
  if (!toon) continue;
  for (const melding of meldingen) {
    const maat = maten[melding.maat];
    console.log(`  maat ${melding.maat + 1} (${maat.maatsoort.teller}/${maat.maatsoort.noemer}): ${maat.elementen.map(kort).filter(Boolean).join(' ')}`);
    if (maat.vak) console.log(`    blad ${maat.vak.blad}, x ${maat.vak.links} tot ${maat.vak.rechts}, y ${maat.vak.boven} tot ${maat.vak.onder}`);
  }
}
