// Haalt de bladzijden uit een pdf zoals de herkenning in de browser ze ziet (grijzeBladen uit bladen.mjs, op de eigen resolutie
// van de scan) en schrijft ze als PGM, zodat de andere meetscripts op precies die bladen meten. JPEG-beelden ontcijfert de
// browser zelf; hier doet jpeg-grijs.py dat (Pillow), met dezelfde verkleining tot hooguit 2600 pixels breed.
// Gebruik: node automatisering/herkenning-meting/browserbladen.mjs <pdf> <uit-voorvoegsel>
// Maakt <uit-voorvoegsel>1.pgm, <uit-voorvoegsel>2.pgm, ... Zet de uitvoer buiten het repo (partituren van anderen).
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { leesPgm } from './pijplijn.mjs';
import { grijzeBladen } from '../../app/src/herkenning/bladen.mjs';
const werk = await mkdtemp(join(tmpdir(), 'browserbladen-'));
const python = fileURLToPath(new URL('./jpeg-grijs.py', import.meta.url));
let teller = 0;
async function ontcijfer(bytes) {
  teller += 1;
  const invoer = join(werk, `beeld${teller}.jpg`);
  const uit = join(werk, `beeld${teller}.pgm`);
  await writeFile(invoer, bytes);
  const r = spawnSync('python', ['-I', python, invoer, uit], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return leesPgm(uit);
}
const [pdf, voorvoegsel] = process.argv.slice(2);
const bladen = await grijzeBladen(new Uint8Array(await readFile(pdf)), { ontcijfer });
for (const [i, blad] of bladen.entries()) {
  const kop = Buffer.from(`P5
${blad.breedte} ${blad.hoogte}
255
`, 'latin1');
  await writeFile(`${voorvoegsel}${i + 1}.pgm`, Buffer.concat([kop, Buffer.from(blad.pixels)]));
  console.log(`${voorvoegsel}${i + 1}.pgm ${blad.breedte}x${blad.hoogte}`);
}
