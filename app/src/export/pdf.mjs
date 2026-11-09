import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import PDFDocument from 'pdfkit';
import schrijfSvgNaarPdf from 'svg-to-pdfkit';
import { bouwPdfPaginas } from './paginas.mjs';

// De paginaopbouw staat in paginas.mjs (met pageMarginBottom: 250 voor de voetregel).
const verovioOpties = { footer: 'none', header: 'none' };

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
  const paginas = bouwPdfPaginas(await toolkit(), musicxml, { titelblok });

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
