import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import PDFDocument from 'pdfkit';
import schrijfSvgNaarPdf from 'svg-to-pdfkit';
import { titelblokVoorPartij } from '../model/titel.mjs';
import { leesMusicXML } from '../musicxml/lezen.mjs';
import { naarMusicXML } from '../musicxml/schrijven.mjs';
import { verdeelPartijenOverBladen } from './bladverdeling.mjs';

const verovioOpties = { footer: 'none', header: 'none' };
const schalen = [40, 34, 28, 22];

function leesColofon(musicxml) {
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

function leesTekst(xml, naam) {
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

function leesPartijen(musicxml) {
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

function voegAttribuutToe(tag, naam, waarde) {
  const attribuut = new RegExp(`(\\s${naam}\\s*=\\s*)(?:"[^"]*"|'[^']*')`);
  if (attribuut.test(tag)) return tag.replace(attribuut, `$1"${waarde}"`);
  return tag.replace(/^<[\w:-]+/, `$& ${naam}="${waarde}"`);
}

function SVGtoPDF(document, svg, ...opties) {
  void verovioOpties;
  const svgMetLijnen = svg.replace(
    /<(path|rect|ellipse|polygon|polyline)\b([^>]*\bstroke-width=(?:"[^"]*"|'[^']*')[^>]*)>/g,
    (tag) => voegAttribuutToe(voegAttribuutToe(tag, 'fill', 'none'), 'stroke', '#000000'),
  );
  return schrijfSvgNaarPdf(document, svgMetLijnen, ...opties);
}

const require = createRequire(import.meta.url);
let toolkitBelofte;

function zetVerovioOpties(tk, schaal, metTitelblok) {
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

function eersteSysteemPast(svg) {
  const begin = svg.search(/<g\b[^>]*class="system"/);
  if (begin < 0) return true;
  const volgende = svg.slice(begin + 1).search(/<g\b[^>]*class="system"/);
  const systeem = volgende < 0 ? svg.slice(begin) : svg.slice(begin, begin + 1 + volgende);
  const hoogtes = [...systeem.matchAll(/transform="translate\([^,]+,\s*([\d.]+)\)"/g)]
    .map((gevonden) => Number(gevonden[1]));
  return hoogtes.length === 0 || Math.max(...hoogtes) <= 27200;
}

function groepsTitelblok(partituur, titelblok) {
  const eerste = partituur.partijen[0]?.naam ?? '';
  const laatste = partituur.partijen.at(-1)?.naam ?? '';
  return {
    titel: titelblok?.titel ?? partituur.titel,
    componist: titelblok?.componist ?? partituur.componist,
    arrangeur: titelblok?.arrangeur ?? partituur.arrangeur,
    partij: `Partijen ${eerste} tot en met ${laatste}`,
  };
}

// Verovio werkt in Node alleen via de ESM-bestanden; de oude require('verovio').toolkit werkt niet.
function toolkit() {
  toolkitBelofte ??= (async () => {
    const map = dirname(require.resolve('verovio'));
    const [{ default: maakModule }, { VerovioToolkit }] = await Promise.all([
      import(pathToFileURL(join(map, 'verovio-module.mjs')).href),
      import(pathToFileURL(join(map, 'verovio.mjs')).href),
    ]);
    return new VerovioToolkit(await maakModule());
  })();
  return toolkitBelofte;
}

export async function maakPdf(musicxml, { watermerk = 'SCORE2SOUND', comprimeer = true, titelblok } = {}) {
  const tk = await toolkit();
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

  const doc = new PDFDocument({ size: 'A4', margin: 0, compress: comprimeer, info: { Title: 'SCORE2SOUND', Producer: 'SCORE2SOUND' } });
  const delen = [];
  doc.on('data', (deel) => delen.push(deel));
  const klaar = new Promise((oplossen, mislukken) => {
    doc.on('end', oplossen);
    doc.on('error', mislukken);
  });

  const aantal = paginas.length;
  for (let pagina = 1; pagina <= aantal; pagina += 1) {
    const blad = paginas[pagina - 1];
    if (pagina > 1) doc.addPage();
    SVGtoPDF(doc, blad.svg, 0, 0, {
      width: doc.page.width,
      height: doc.page.height,
      assumePt: true,
      preserveAspectRatio: 'xMinYMin meet',
    });
    if (blad.eerste && blad.titelblok) {
      const tekst = (waarde) => waarde?.replace(/♭/g, 'b');
      if (blad.titelblok.titel) {
        doc.font('Times-Bold').fontSize(20).text(tekst(blad.titelblok.titel), 40, 40, {
          width: doc.page.width - 80,
          align: 'center',
        });
      }
      if (blad.titelblok.partij) {
        doc.font('Times-Roman').fontSize(11).text(tekst(blad.titelblok.partij), 40, 80);
      }
      if (blad.titelblok.componist) {
        doc.font('Times-Roman').fontSize(11).text(tekst(blad.titelblok.componist), 40, 70, {
          width: doc.page.width - 80,
          align: 'right',
        });
      }
      if (blad.titelblok.arrangeur) {
        doc.font('Times-Roman').fontSize(11).text(`arr. ${tekst(blad.titelblok.arrangeur)}`, 40, 84, {
          width: doc.page.width - 80,
          align: 'right',
        });
      }
    }
    if (watermerk) {
      doc.save();
      doc.fillColor('#888888').fillOpacity(0.15).fontSize(80);
      doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
      doc.text(watermerk, 0, doc.page.height / 2 - 40, { width: doc.page.width, align: 'center', lineBreak: false });
      doc.restore();
    }
    if (blad.laatste && blad.colofon) {
      doc.save();
      doc.font('Times-Roman').fontSize(8).fillColor('#666666').fillOpacity(1);
      doc.addContent(`% ${Buffer.from(blad.colofon).toString('hex')}`);
      doc.text(blad.colofon, 0, doc.page.height - 56, { width: doc.page.width, align: 'center', lineBreak: false });
      doc.restore();
    }
    doc.save();
    doc.font('Times-Roman').fontSize(8).fillColor('#666666').fillOpacity(1);
    doc.text('Gemaakt met SCORE2SOUND', 0, doc.page.height - 44, { width: doc.page.width, align: 'center', lineBreak: false });
    doc.restore();
    doc.save();
    doc.font('Times-Roman').fontSize(9).fillColor('#444444').fillOpacity(1);
    doc.text('pagina ' + pagina + ' van ' + aantal, 0, doc.page.height - 30, { width: doc.page.width, align: 'center', lineBreak: false });
    doc.restore();
  }

  doc.end();
  await klaar;
  return Buffer.concat(delen);
}
