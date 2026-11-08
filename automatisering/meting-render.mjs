import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [invoer, uit] = process.argv.slice(2);
if (!invoer || !uit) {
  console.error('Gebruik: node automatisering/meting-render.mjs <invoer.musicxml> <uit.pdf>');
  process.exit(2);
}
const app = resolve(import.meta.dirname, '../app');
const { maakPdf } = await import(pathToFileURL(resolve(app, 'src/export/pdf.mjs')).href);
const xml = await readFile(invoer, 'utf8');
await writeFile(uit, await maakPdf(xml, { watermerk: false }));