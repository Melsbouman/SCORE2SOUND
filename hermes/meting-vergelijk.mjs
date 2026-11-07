// Vergelijkt twee MusicXML-bestanden en print nauwkeurigheid als JSON
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const [juist, gemeten] = process.argv.slice(2);
if (!juist || !gemeten) {
  console.error('Gebruik: node hermes/meting-vergelijk.mjs <juist.musicxml> <gemeten.musicxml>');
  process.exit(2);
}

const app = resolve(import.meta.dirname, '../app');
const { vergelijkMusicXML } = await import(pathToFileURL(resolve(app, 'src/meting/vergelijk.mjs')).href);

const [tjekst, gtekst] = await Promise.all([
  readFile(juist, 'utf8'),
  readFile(gemeten, 'utf8')
]);

const r = vergelijkMusicXML(tjekst, gtekst);

console.log(JSON.stringify(r, null, 2));