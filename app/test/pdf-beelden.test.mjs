import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { openPdf } from '../src/pdf/lezer.mjs';
import { beeldenOpPagina } from '../src/pdf/beelden.mjs';
import { decodeerG4 } from '../src/pdf/ccitt.mjs';

// Een klein zwart-witbeeld van 72 x 40 (eigen tekening: vijf lijnen, een ellips, een schuine streep, een blok), gecodeerd als
// CCITT Group 4, met de verwachte pixels (# = zwart).
const G4 = Buffer.from('yU/ty4HuSv9v+XA9yW8hDbp9Nuny4HuS4hr7Xabj25cD3Kl2/b8uB7lV+eHb/2/9v/EcAEAE', 'base64');
const VERWACHT = [
  '........................................................................',
  '........................................................................',
  '........................................##..............................',
  '........................................##..............................',
  '.........................................##.............................',
  '..####################################################################..',
  '..........................................##............................',
  '..........................................##............................',
  '...........................................##...........................',
  '...........................................##...........................',
  '...........................................##...........................',
  '..####################################################################..',
  '............................................##..........................',
  '.......................#####.................##.........................',
  '......................#######................##.........................',
  '.....................#########................##........................',
  '....................###########...............##........................',
  '..####################################################################..',
  '.....................#########.................##.......................',
  '......................#######..................##.......................',
  '.......................#####....................##......................',
  '................................................##......................',
  '.................................................##.....................',
  '..####################################################################..',
  '.................................................##.....................',
  '..................................................##....................',
  '..................................................##....................',
  '...................................................##...................',
  '...................................................##...................',
  '..####################################################################..',
  '....................................................##..................',
  '....................................................##......#######.....',
  '.....................................................##.....#######.....',
  '.....................................................##.....#######.....',
  '......................................................##....#######.....',
  '......................................................##....#######.....',
  '.......................................................##...#######.....',
  '.......................................................##...#######.....',
  '........................................................................',
  '........................................................................',
];

test('CCITT Group 4: elke pixel komt goed terug (1 = zwart)', () => {
  const pixels = decodeerG4(new Uint8Array(G4), 72, 40);
  const rijen = [];
  for (let y = 0; y < 40; y += 1) rijen.push([...pixels.subarray(y * 72, y * 72 + 72)].map((p) => (p ? '#' : '.')).join(''));
  assert.deepEqual(rijen, VERWACHT);
});

const NL = String.fromCharCode(10);

// Een pdf met vijf beelden op één pagina, elk op een eigen plek (cm voor Do).
function maakPdf() {
  const delen = [];
  const voeg = (tekst) => delen.push(Buffer.from(tekst, 'latin1'));
  const stroom = (nummer, woordenboek, data) => {
    voeg(`${nummer} 0 obj << ${woordenboek} /Length ${data.length} >> stream${NL}`);
    delen.push(Buffer.from(data));
    voeg(`${NL}endstream endobj${NL}`);
  };
  // Im1: 4 x 3 grijs, 8 bits, FlateDecode.
  const grijs = Buffer.from([0, 64, 128, 255, 10, 20, 30, 40, 255, 255, 0, 0]);
  // Im2: dezelfde pixels met een PNG-voorspeller (elke rij begint met filter 2 = Up).
  const metVoorspeller = [];
  for (let y = 0; y < 3; y += 1) {
    metVoorspeller.push(2);
    for (let x = 0; x < 4; x += 1) metVoorspeller.push((grijs[y * 4 + x] - (y ? grijs[(y - 1) * 4 + x] : 0) + 256) % 256);
  }
  // Im4: 8 x 2, 1 bit per pixel (1 = wit bij DeviceGray): rij 1 10101010, rij 2 11110000.
  const bits = Buffer.from([0b10101010, 0b11110000]);
  voeg(`%PDF-1.4${NL}`);
  voeg(`1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj${NL}`);
  voeg(`2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 595 842] >> endobj${NL}`);
  voeg(`3 0 obj << /Type /Page /Parent 2 0 R /Contents 4 0 R /Resources << /XObject << /Im1 5 0 R /Im2 6 0 R /Im3 7 0 R /Fax 8 0 R /Im4 9 0 R >> >> >> endobj${NL}`);
  stroom(4, '/Filter /FlateDecode', deflateSync(Buffer.from('q 100 0 0 50 10 20 cm /Im1 Do Q q 1 0 0 1 300 0 cm q 200 0 0 100 0 0 cm /Im2 Do Q Q /Im3 Do q 72 0 0 40 0 0 cm /Fax Do Q /Im4 Do', 'latin1')));
  stroom(5, '/Type /XObject /Subtype /Image /Width 4 /Height 3 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode', deflateSync(grijs));
  stroom(6, '/Type /XObject /Subtype /Image /Width 4 /Height 3 /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors 1 /BitsPerComponent 8 /Columns 4 >>', deflateSync(Buffer.from(metVoorspeller)));
  stroom(7, '/Type /XObject /Subtype /Image /Width 1 /Height 1 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/DCTDecode]', Buffer.from([0xff, 0xd8, 0xff, 0xd9]));
  stroom(8, '/Type /XObject /Subtype /Image /Width 72 /Height 40 /ColorSpace /DeviceGray /BitsPerComponent 1 /Filter /CCITTFaxDecode /DecodeParms << /K -1 /Columns 72 /Rows 40 >>', G4);
  stroom(9, '/Type /XObject /Subtype /Image /Width 8 /Height 2 /ColorSpace /DeviceGray /BitsPerComponent 1', bits);
  voeg(`%%EOF${NL}`);
  return new Uint8Array(Buffer.concat(delen));
}

test('beelden op een pagina: grijze pixels, voorspeller, JPEG, faxcodering en 1 bit, met hun plek', async () => {
  const pdf = await openPdf(maakPdf());
  const beelden = await beeldenOpPagina(pdf, pdf.paginas[0]);
  assert.deepEqual(beelden.map((beeld) => [beeld.naam, beeld.soort, beeld.breedte, beeld.hoogte]), [
    ['Im1', 'grijs', 4, 3], ['Im2', 'grijs', 4, 3], ['Im3', 'jpeg', 1, 1], ['Fax', 'grijs', 72, 40], ['Im4', 'grijs', 8, 2],
  ]);
  const [im1, im2, im3, fax, im4] = beelden;
  assert.deepEqual([...im1.pixels], [0, 64, 128, 255, 10, 20, 30, 40, 255, 255, 0, 0]);
  assert.deepEqual([...im2.pixels], [...im1.pixels]);
  assert.deepEqual([...im3.bytes], [0xff, 0xd8, 0xff, 0xd9]);
  assert.deepEqual(im1.matrix, [100, 0, 0, 50, 10, 20]);
  assert.deepEqual(im2.matrix, [200, 0, 0, 100, 300, 0]);
  assert.deepEqual(im3.matrix, [1, 0, 0, 1, 0, 0]);
  // Zonder /BlackIs1 betekent een 0-bit in de uitkomst zwart: de zwarte pixels uit de codering worden 0 in het grijsbeeld.
  assert.equal(fax.pixels[17 * 72 + 25], 0, 'midden van de ellips is zwart');
  assert.equal(fax.pixels[0], 255, 'linksboven is wit');
  assert.deepEqual([...im4.pixels], [255, 0, 255, 0, 255, 0, 255, 0, 255, 255, 255, 255, 0, 0, 0, 0]);
});

test('/BlackIs1 true keert zwart en wit om; de tikfout Blackls1 (komt in echte pdfs voor) telt niet, zoals in andere lezers', async () => {
  const pdf = await openPdf(maakPdf());
  const object = pdf.objecten.get(8);
  const fax = async () => (await beeldenOpPagina(pdf, pdf.paginas[0])).find((beeld) => beeld.naam === 'Fax');
  object.woordenboek = object.woordenboek.replace('/Rows 40', '/Rows 40 /BlackIs1 true');
  const omgekeerd = await fax();
  assert.equal(omgekeerd.pixels[17 * 72 + 25], 255);
  assert.equal(omgekeerd.pixels[0], 0);
  object.woordenboek = object.woordenboek.replace('/BlackIs1 true', '/Blackls1 true');
  const tikfout = await fax();
  assert.equal(tikfout.pixels[17 * 72 + 25], 0);
  assert.equal(tikfout.pixels[0], 255);
});

test('een filter dat de app (nog) niet kan lezen geeft soort onbekend in plaats van een fout', async () => {
  const pdf = await openPdf(maakPdf());
  pdf.objecten.get(7).woordenboek = pdf.objecten.get(7).woordenboek.replace('/DCTDecode', '/JBIG2Decode');
  const im3 = (await beeldenOpPagina(pdf, pdf.paginas[0])).find((beeld) => beeld.naam === 'Im3');
  assert.equal(im3.soort, 'onbekend');
  assert.deepEqual(im3.filters, ['JBIG2Decode']);
});
