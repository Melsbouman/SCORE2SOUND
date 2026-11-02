// Ruimt herkenningen op. Na afloop zijn alleen de pagina's nog nodig, voor het origineel naast de digitale versie.
// Een oude herkenning gaat helemaal weg, behalve als een bewaard project hem nog gebruikt.
import { readdir, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';

const DERTIG_DAGEN = 30 * 24 * 60 * 60 * 1000;
const GELDIG_ID = /^[a-f0-9]{12}$/;

export async function ruimTussenbestandenOp(uitmap) {
  for (const naam of await readdir(uitmap)) {
    if (!/^blad-\d+\.png$/.test(naam)) await rm(join(uitmap, naam), { recursive: true, force: true });
  }
}

async function gebruikteHerkenningen(projectenMap) {
  const namen = await readdir(projectenMap).catch(() => []);
  const gebruikt = new Set();
  for (const naam of namen.filter((n) => /^[a-f0-9]{12}\.json$/.test(n))) {
    const project = JSON.parse(await readFile(join(projectenMap, naam), 'utf8'));
    if (project.partituur?.bron?.herkenning) gebruikt.add(project.partituur.bron.herkenning);
  }
  return gebruikt;
}

export async function ruimOudeHerkenningenOp({ map, projectenMap, nu = Date.now(), leeftijd = DERTIG_DAGEN }) {
  const namen = (await readdir(map).catch(() => [])).filter((naam) => GELDIG_ID.test(naam));
  const gebruikt = await gebruikteHerkenningen(projectenMap);
  const weg = [];
  for (const naam of namen) {
    const volledig = join(map, naam);
    if (gebruikt.has(naam) || nu - (await stat(volledig)).mtimeMs < leeftijd) continue;
    await rm(volledig, { recursive: true, force: true });
    weg.push(naam);
  }
  return weg;
}
