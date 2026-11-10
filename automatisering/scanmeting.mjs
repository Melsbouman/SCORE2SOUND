// Scanmeting over de testset: pdf maken (als het stuk geen eigen pdf heeft), herkennen met de echte keten
// (echte-controle.sh, dus Audiveris), vergelijken met het juiste antwoord en een overzicht schrijven.
// Gebruik: node automatisering/scanmeting.mjs [--eigen] [testset.json] [alleen-id]
// Met --eigen meet het script met de eigen herkenning (app/src/meting/eigen.mjs) in plaats van Audiveris.
// Het overzicht komt in taken-en-plannen/meting/uitslag/<datum>.md; pdf's en herkende partituren blijven in een tijdelijke map
// (partituren van anderen horen niet in het repo).
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(import.meta.dirname, '..');
const app = resolve(root, 'app');
const laad = (pad) => import(pathToFileURL(resolve(app, pad)).href);
const { maakPdf } = await laad('src/export/pdf.mjs');
const { leesMusicXML } = await laad('src/musicxml/lezen.mjs');
const { meetStuk, vatSamen } = await laad('src/meting/scanmeting.mjs');

const eigen = process.argv.slice(2).includes('--eigen');
const argumenten = process.argv.slice(2).filter((a) => a !== '--eigen');
const { herkenEigen } = await laad('src/meting/eigen.mjs');
const testset = JSON.parse(await readFile(resolve(argumenten[0] ?? join(root, 'taken-en-plannen/meting/testset.json')), 'utf8'));
const alleen = argumenten[1] ?? '';
const datum = new Date().toISOString().slice(0, 10);
const werkmap = await mkdtemp(join(tmpdir(), 'scanmeting-'));
const pad = (p) => resolve(root, p);

const stappen = {
  async render(referentie, id) {
    const uit = join(werkmap, `${id}.pdf`);
    await writeFile(uit, await maakPdf(await readFile(pad(referentie), 'utf8'), { watermerk: false }));
    return uit;
  },
  async vervuil(pdf, id) {
    const uit = join(werkmap, `${id}-vervuild.pdf`);
    spawnSync('python', ['-I', join(root, 'automatisering/vervuil.py'), pdf, uit], { encoding: 'utf8', timeout: 10 * 60 * 1000 });
    return uit;
  },
  async herken(pdf, paginas) {
    if (eigen) {
      const begin = Date.now();
      const { partituur } = await herkenEigen(new Uint8Array(await readFile(pad(pdf))), { paginas: paginas ? String(paginas) : '' });
      return { partituur, seconden: Math.round((Date.now() - begin) / 1000) };
    }
    const json = join(werkmap, `${basename(pdf, '.pdf')}.herkend.json`);
    const begin = Date.now();
    spawnSync('bash', [join(root, 'automatisering/echte-controle.sh'), pad(pdf), ...(paginas ? [String(paginas)] : [])], {
      env: { ...process.env, VERGELIJK_UIT: json },
      encoding: 'utf8',
      timeout: 30 * 60 * 1000,
    });
    const seconden = Math.round((Date.now() - begin) / 1000);
    try {
      return { partituur: JSON.parse(await readFile(json, 'utf8')), seconden };
    } catch {
      return { partituur: null, seconden };
    }
  },
  // Een referentie kan .musicxml zijn of gecomprimeerd .mxl (zip met META-INF/container.xml).
  async lees(referentie) {
    if (!/\.mxl$/i.test(referentie)) return leesMusicXML(await readFile(pad(referentie), 'utf8'));
    const { leesZip } = await laad('src/server/zip.mjs');
    const bestanden = await leesZip(await readFile(pad(referentie)));
    const container = bestanden.get('META-INF/container.xml');
    const binnen = (container && Buffer.from(container).toString('utf8').match(/full-path="([^"]+)"/)?.[1])
      ?? [...bestanden.keys()].find((naam) => !naam.startsWith('META-INF/') && /\.(musicxml|xml)$/i.test(naam));
    if (!binnen || !bestanden.has(binnen)) throw new Error(`Geen MusicXML in ${referentie}`);
    return leesMusicXML(Buffer.from(bestanden.get(binnen)).toString('utf8'));
  },
};

const uitslagen = [];
for (const item of testset.items ?? []) {
  if (alleen && item.id !== alleen) continue;
  console.log(`meten: ${item.id}`);
  const uitslag = await meetStuk(item, stappen);
  console.log(uitslag.overgeslagen ? `  overgeslagen: ${uitslag.overgeslagen}` : `  ${uitslag.juist} van ${uitslag.noten} noten juist, ${uitslag.matenJuist} van ${uitslag.maten} maten`);
  uitslagen.push(uitslag);
}

const uitslagmap = join(root, 'taken-en-plannen/meting/uitslag');
await mkdir(uitslagmap, { recursive: true });
const bestand = `${datum}${eigen ? '-eigen' : ''}.md`;
await writeFile(join(uitslagmap, bestand), vatSamen(uitslagen, datum, eigen ? 'eigen' : ''));
await writeFile(join(werkmap, 'uitslag.json'), JSON.stringify(uitslagen, null, 2));
console.log(`overzicht: taken-en-plannen/meting/uitslag/${bestand}`);
console.log(`details (met verschillen per maat): ${join(werkmap, 'uitslag.json')}`);
