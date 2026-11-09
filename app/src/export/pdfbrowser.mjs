// Een pdf maken in de browser (Verovio + svgpdf.mjs), met dezelfde pagina's als de serverversie.
import { bouwPdfPaginas } from './paginas.mjs';
import { maakPdfBestand, svgNaarPdf, tekstOpdracht } from './svgpdf.mjs';

const A4 = { breedte: 595.28, hoogte: 841.89 };

export async function maakPdfZonderServer(tk, musicxml, { watermerk = 'SCORE2SOUND', titelblok } = {}) {
  const paginas = bouwPdfPaginas(tk, musicxml, { titelblok });
  const aantal = paginas.length;
  const { breedte, hoogte } = A4;
  const tekst = (waarde) => waarde?.replace(/♭/g, 'b');
  const stromen = paginas.map((blad, index) => {
    const delen = [svgNaarPdf(blad.svg, A4).opdrachten];
    const breed = breedte - 80;
    if (blad.eerste && blad.titelblok) {
      const t = blad.titelblok;
      if (t.titel) delen.push(tekstOpdracht(tekst(t.titel), { x: 40, y: hoogte - 40 - 20, grootte: 20, lettertype: 'F3', uitlijning: 'midden', breedte: breed }));
      if (t.partij) delen.push(tekstOpdracht(tekst(t.partij), { x: 40, y: hoogte - 80 - 11, grootte: 11 }));
      if (t.componist) delen.push(tekstOpdracht(tekst(t.componist), { x: 40, y: hoogte - 70 - 11, grootte: 11, uitlijning: 'rechts', breedte: breed }));
      if (t.arrangeur) delen.push(tekstOpdracht(`arr. ${tekst(t.arrangeur)}`, { x: 40, y: hoogte - 84 - 11, grootte: 11, uitlijning: 'rechts', breedte: breed }));
    }
    if (watermerk) {
      const cx = breedte / 2;
      const cy = hoogte / 2;
      const c = Math.cos(Math.PI / 4);
      const s = Math.sin(Math.PI / 4);
      const e = cx - c * cx + s * cy;
      const f = cy - s * cx - c * cy;
      const m = [c, s, -s, c, e, f].map((v) => v.toFixed(6)).join(' ');
      delen.push(`q ${m} cm`);
      delen.push(tekstOpdracht(watermerk, { x: 0, y: hoogte - (hoogte / 2 - 40) - 80, grootte: 80, uitlijning: 'midden', breedte, grijs: 0.88 }));
      delen.push('Q');
    }
    if (blad.laatste && blad.colofon) {
      delen.push(tekstOpdracht(blad.colofon, { x: 0, y: 56 - 8, grootte: 8, uitlijning: 'midden', breedte, grijs: 0.4 }));
    }
    delen.push(tekstOpdracht('Gemaakt met SCORE2SOUND', { x: 0, y: 44 - 8, grootte: 8, uitlijning: 'midden', breedte, grijs: 0.4 }));
    delen.push(tekstOpdracht(`pagina ${index + 1} van ${aantal}`, { x: 0, y: 30 - 9, grootte: 9, uitlijning: 'midden', breedte, grijs: 0.27 }));
    return delen.join('\n') + '\n';
  });
  return maakPdfBestand(stromen, A4);
}
