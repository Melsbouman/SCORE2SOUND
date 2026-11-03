import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import PDFDocument from 'pdfkit';
import schrijfSvgNaarPdf from 'svg-to-pdfkit';

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
  const tk = await toolkit();
  tk.setOptions({
    header: 'none',
    footer: 'none',
    pageWidth: 2100,
    pageHeight: 2970,
    scale: 40,
    adjustPageHeight: false,
    ...(titelblok ? { pageMarginTop: 280 } : {}),
  });
  tk.loadData(musicxml);

  const doc = new PDFDocument({ size: 'A4', margin: 0, compress: comprimeer, info: { Title: 'SCORE2SOUND', Producer: 'SCORE2SOUND' } });
  const delen = [];
  doc.on('data', (deel) => delen.push(deel));
  const klaar = new Promise((oplossen, mislukken) => {
    doc.on('end', oplossen);
    doc.on('error', mislukken);
  });

  for (let pagina = 1; pagina <= tk.getPageCount(); pagina += 1) {
    if (pagina > 1) doc.addPage();
    SVGtoPDF(doc, tk.renderToSVG(pagina), 0, 0, {
      width: doc.page.width,
      height: doc.page.height,
      assumePt: true,
      preserveAspectRatio: 'xMinYMin meet',
    });
    if (pagina === 1 && titelblok) {
      const tekst = (waarde) => waarde?.replace(/♭/g, 'b');
      if (titelblok.titel) {
        doc.font('Times-Bold').fontSize(20).text(tekst(titelblok.titel), 40, 40, {
          width: doc.page.width - 80,
          align: 'center',
        });
      }
      if (titelblok.partij) {
        doc.font('Times-Roman').fontSize(11).text(tekst(titelblok.partij), 40, 80);
      }
      if (titelblok.componist) {
        doc.font('Times-Roman').fontSize(11).text(tekst(titelblok.componist), 40, 70, {
          width: doc.page.width - 80,
          align: 'right',
        });
      }
      if (titelblok.arrangeur) {
        doc.font('Times-Roman').fontSize(11).text(`arr. ${tekst(titelblok.arrangeur)}`, 40, 84, {
          width: doc.page.width - 80,
          align: 'right',
        });
      }
    }
    doc.save();
    doc.fillColor('#888888').fillOpacity(0.15).fontSize(80);
    doc.rotate(-45, { origin: [doc.page.width / 2, doc.page.height / 2] });
    doc.text(watermerk, 0, doc.page.height / 2 - 40, { width: doc.page.width, align: 'center', lineBreak: false });
    doc.restore();
  }

  doc.end();
  await klaar;
  return Buffer.concat(delen);
}
