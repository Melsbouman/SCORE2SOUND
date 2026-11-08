// Maakt van een herkende partituur (JSON) dezelfde pdf als de editor: node automatisering/maak-pdf.mjs <partituur.json> <uit.pdf>
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [invoer, uit] = process.argv.slice(2);
if (!invoer || !uit) {
  console.error('Gebruik: node automatisering/maak-pdf.mjs <partituur.json> <uit.pdf>');
  process.exit(2);
}
const app = resolve(import.meta.dirname, '../app');
const { naarMusicXML } = await import(pathToFileURL(resolve(app, 'src/musicxml/schrijven.mjs')).href);
const { maakPdf } = await import(pathToFileURL(resolve(app, 'src/export/pdf.mjs')).href);
const { herstelHerkenning } = await import(pathToFileURL(resolve(app, 'src/model/herstel.mjs')).href);
const partituur = herstelHerkenning(JSON.parse(await readFile(invoer, 'utf8')));
await writeFile(uit, await maakPdf(naarMusicXML(partituur, { zonderPartijnamen: partituur.partijen.length === 1 }), { watermerk: false }));
