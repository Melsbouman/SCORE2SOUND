// Maatsoorten in het model per stuk: waar de maatsoort verandert, en per deel hoeveel maten een maatduur-melding hebben (na de
// herstelketen). Zo is te zien of de maatsoort goed gekozen is (kop.mjs, opbouw.mjs) en in welk deel de fouten zitten.
// Gebruik: node automatisering/herkenning-meting/maatsoorten.mjs <map>/goth-p1.pgm+<map>/goth-p2.pgm ...
// (bladzijden van én stuk mit + aan elkaar; de PGM-bestanden maakt teken.py).
import { bouwModel } from './pijplijn.mjs';
import { herstelHerkenning } from '../../app/src/model/herstel.mjs';
import { vulRustGaten } from '../../app/src/model/rustgaten.mjs';
import { herstelTriolen } from '../../app/src/model/triolenherstel.mjs';
import { controleerMaatduur } from '../../app/src/controle/maatduur.mjs';
for (const stuk of process.argv.slice(2)) {
  const paden = stuk.split('+');
  const partituur = herstelTriolen(vulRustGaten(herstelHerkenning(bouwModel(paden, {}))).partituur).partituur;
  const maten = partituur.partijen[0].maten;
  const fout = new Set(controleerMaatduur(partituur).map((melding) => melding.maat));
  const delen = [];
  maten.forEach((maat, i) => {
    const soort = `${maat.maatsoort.teller}/${maat.maatsoort.noemer}`;
    if (delen.at(-1)?.soort !== soort) delen.push({ soort, van: i + 1, blad: maat.vak?.blad ?? '-', maten: 0, fout: 0 });
    const deel = delen.at(-1);
    deel.maten += 1;
    if (fout.has(i)) deel.fout += 1;
  });
  console.log(`${paden[0].split(/[\\/]/).pop()}: ${maten.length} maten`);
  for (const deel of delen) console.log(`  ${deel.soort} vanaf maat ${deel.van} (blad ${deel.blad}): ${deel.fout} van ${deel.maten} maten fout`);
}
