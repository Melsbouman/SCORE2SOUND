// De pagina's van een pdf opbouwen met Verovio, zonder pdfkit (werkt in de browser en in Node).
import { titelblokVoorPartij } from '../model/titel.mjs';
import { leesMusicXML } from '../musicxml/lezen.mjs';
import { naarMusicXML } from '../musicxml/schrijven.mjs';
import { verdeelPartijenOverBladen } from './bladverdeling.mjs';

export const schalen = [40, 34, 28, 22];

export function leesColofon(musicxml) {
  const gevonden = musicxml.match(/<rights\b[^>]*>([\s\S]*?)<\/rights>/i);
  if (!gevonden) return '';
  return gevonden[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

export function leesTekst(xml, naam) {
  const gevonden = xml.match(new RegExp(`<${naam}\\b[^>]*>([\\s\\S]*?)<\\/${naam}>`, 'i'));
  if (!gevonden) return '';
  return gevonden[1]
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
}

function regexWaarde(waarde) {
  return waarde.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function leesPartijen(musicxml) {
  const beschrijvingen = [...musicxml.matchAll(/<score-part\b[^>]*\bid=(?:"([^"]+)"|'([^']+)')[^>]*>[\s\S]*?<\/score-part>/gi)];
  if (beschrijvingen.length <= 1) return [];
  return beschrijvingen.map((gevonden) => {
    const id = gevonden[1] || gevonden[2];
    const idPatroon = regexWaarde(id);
    const partij = musicxml.match(new RegExp(`<part(?=\\s|>)[^>]*\\bid=(?:"${idPatroon}"|'${idPatroon}')[^>]*>[\\s\\S]*?<\\/part>`, 'i'))?.[0];
    const scorePart = gevonden[0];
    const zonderAndereScorePartijen = musicxml.replace(/<score-part\b[^>]*>[\s\S]*?<\/score-part>/gi, (deel) => deel === scorePart ? deel : '');
    return {
      musicxml: zonderAndereScorePartijen.replace(/<part(?=\s|>)[^>]*>[\s\S]*?<\/part>/gi, (deel) => deel === partij ? deel : ''),
      naam: leesTekst(scorePart, 'part-name'),
      colofon: leesColofon(scorePart),
    };
  });
}

export function zetVerovioOpties(tk, schaal, metTitelblok) {
  tk.setOptions({
    breaks: 'auto',
    multiRestStyle: 'block',
    pageMarginBottom: 250,
    header: 'none',
    footer: 'none',
    pageWidth: 2100,
    pageHeight: 2970,
    scale: schaal,
    adjustPageHeight: false,
    ...(metTitelblok ? { pageMarginTop: 360 } : {}),
  });
}

export function eersteSysteemPast(svg) {
  const begin = svg.search(/<g\b[^>]*class="system"/);
  if (begin < 0) return true;
  const volgende = svg.slice(begin + 1).search(/<g\b[^>]*class="system"/);
  const systeem = volgende < 0 ? svg.slice(begin) : svg.slice(begin, begin + 1 + volgende);
  const hoogtes = [...systeem.matchAll(/transform="translate\([^,]+,\s*([\d.]+)\)"/g)]
    .map((gevonden) => Number(gevonden[1]));
  return hoogtes.length === 0 || Math.max(...hoogtes) <= 27200;
}

export function groepsTitelblok(partituur, titelblok) {
  const eerste = partituur.partijen[0]?.naam ?? '';
  const laatste = partituur.partijen.at(-1)?.naam ?? '';
  return {
    titel: titelblok?.titel ?? partituur.titel,
    componist: titelblok?.componist ?? partituur.componist,
    arrangeur: titelblok?.arrangeur ?? partituur.arrangeur,
    partij: `Partijen ${eerste} tot en met ${laatste}`,
  };
}

export function bouwPdfPaginas(tk, musicxml, { titelblok } = {}) {
  const colofon = leesColofon(musicxml);
  // De regelindeling van het origineel (heeftOrigineleRegels) staat nog uit: de regelbegins zijn nog niet overal op de goede maat gezet.
  const groepen = verdeelPartijenOverBladen(leesMusicXML(musicxml));
  let invoer;
  if (groepen.length > 1) {
    invoer = groepen.map((groep, index) => ({
      musicxml: naarMusicXML(groep),
      titelblok: groepsTitelblok(groep, titelblok),
      colofon: index === groepen.length - 1 ? colofon : '',
      pasSchaalAan: true,
    }));
  } else {
    zetVerovioOpties(tk, 40, Boolean(titelblok));
    const partijgegevens = leesPartijen(musicxml);
    invoer = partijgegevens.length > 0
      ? partijgegevens.map((partij, index) => {
        const partijTitelblok = titelblokVoorPartij(titelblok, partij);
        return {
          musicxml: partij.musicxml,
          titelblok: partijTitelblok,
          colofon: partijTitelblok.colofon || (index === partijgegevens.length - 1 ? colofon : ''),
        };
      })
      : [{ musicxml, titelblok, colofon }];
  }
  const paginas = [];
  for (const partij of invoer) {
    if (partij.pasSchaalAan) {
      for (const schaal of schalen) {
        zetVerovioOpties(tk, schaal, true);
        tk.loadData(partij.musicxml);
        if (eersteSysteemPast(tk.renderToSVG(1))) break;
      }
    }
    tk.loadData(partij.musicxml);
    const partijPaginas = tk.getPageCount();
    for (let nummer = 1; nummer <= partijPaginas; nummer += 1) {
      paginas.push({
        svg: tk.renderToSVG(nummer),
        titelblok: partij.titelblok,
        colofon: partij.colofon,
        eerste: nummer === 1,
        laatste: nummer === partijPaginas,
      });
    }
  }
  return paginas;
}
