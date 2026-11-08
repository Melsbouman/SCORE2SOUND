// De scanmeting: per stuk uit de testset het juiste antwoord naast de herkenning leggen, en alles samenvatten.
// De echte stappen (pdf maken, herkennen, inlezen) komen van buiten, zodat dit zonder Audiveris te testen is.
import { vergelijkPartituren } from './vergelijk.mjs';

// Meet één stuk. stappen: { render(referentie) -> pdf-pad, herken(pdf, paginas) -> { partituur, seconden }, lees(referentie) -> partituur }.
export async function meetStuk(item, stappen) {
  if (!item.referentie) return { id: item.id, soort: item.soort ?? '', overgeslagen: 'geen referentie' };
  const pdf = item.pdf ?? (await stappen.render(item.referentie, item.id));
  const { partituur, seconden } = await stappen.herken(pdf, item.paginas ?? '');
  if (!partituur) return { id: item.id, soort: item.soort ?? '', overgeslagen: 'herkenning gaf geen partituur', seconden };
  const juist = await stappen.lees(item.referentie);
  const r = vergelijkPartituren(juist, partituur);
  return {
    id: item.id,
    soort: item.soort ?? '',
    seconden,
    noten: r.noten,
    juist: r.juist,
    nauwkeurigheid: r.nauwkeurigheid,
    toonhoogteJuist: r.toonhoogteJuist,
    duurJuist: r.duurJuist,
    maten: r.maten,
    matenJuist: r.matenJuist,
    matenOntbrekend: r.matenOntbrekend,
    matenExtra: r.matenExtra,
    verschillen: r.verschillen.slice(0, 50),
  };
}

const procent = (deel, geheel) => (geheel > 0 ? `${Math.round((deel / geheel) * 1000) / 10}%` : '-');

// Een overzicht in Markdown: een regel per stuk en een totaal over de gemeten stukken.
export function vatSamen(uitslagen, datum) {
  const regels = [
    `# Scanmeting ${datum}`,
    '',
    '| Stuk | Soort | Noten juist | Toonhoogte juist | Duur juist | Maten juist | Ontbrekend | Extra | Tijd |',
    '|---|---|---|---|---|---|---|---|---|',
  ];
  const totaal = { noten: 0, juist: 0, toonhoogteJuist: 0, duurJuist: 0, maten: 0, matenJuist: 0, matenOntbrekend: 0, matenExtra: 0, seconden: 0 };
  for (const u of uitslagen) {
    if (u.overgeslagen) {
      regels.push(`| ${u.id} | ${u.soort} | overgeslagen: ${u.overgeslagen} | | | | | | |`);
      continue;
    }
    for (const sleutel of Object.keys(totaal)) totaal[sleutel] += u[sleutel] ?? 0;
    regels.push(`| ${u.id} | ${u.soort} | ${procent(u.juist, u.noten)} (${u.juist} van ${u.noten}) | ${procent(u.toonhoogteJuist, u.noten)} | ${procent(u.duurJuist, u.noten)} | ${procent(u.matenJuist, u.maten)} (${u.matenJuist} van ${u.maten}) | ${u.matenOntbrekend} | ${u.matenExtra} | ${u.seconden} s |`);
  }
  regels.push(`| **Totaal** | | ${procent(totaal.juist, totaal.noten)} (${totaal.juist} van ${totaal.noten}) | ${procent(totaal.toonhoogteJuist, totaal.noten)} | ${procent(totaal.duurJuist, totaal.noten)} | ${procent(totaal.matenJuist, totaal.maten)} (${totaal.matenJuist} van ${totaal.maten}) | ${totaal.matenOntbrekend} | ${totaal.matenExtra} | ${totaal.seconden} s |`);
  regels.push('');
  regels.push('Noten juist: toonhoogte en duur allebei goed. Maten juist: alle noten van de maat goed. Ontbrekend en extra: maten die na het uitlijnen geen partner hebben.');
  return regels.join('\n') + '\n';
}
