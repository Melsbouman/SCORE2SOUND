import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';

const geldigId = /^[a-f0-9]{12}$/;

export function maakOpslag(map) {
  const bestand = (id) => join(map, `${id}.json`);

  function controleerId(id) {
    if (!geldigId.test(id)) throw new Error('Onbekend project.');
  }

  async function lees(id) {
    controleerId(id);
    try {
      return JSON.parse(await readFile(bestand(id), 'utf8'));
    } catch (fout) {
      if (fout.code === 'ENOENT') throw new Error('Onbekend project.');
      throw fout;
    }
  }

  async function lijst() {
    let bestanden;
    try {
      bestanden = await readdir(map);
    } catch (fout) {
      if (fout.code === 'ENOENT') return [];
      throw fout;
    }

    const projecten = await Promise.all(
      bestanden
        .filter((naam) => /^[a-f0-9]{12}\.json$/.test(naam))
        .map((naam) => lees(naam.slice(0, 12))),
    );
    return projecten
      .sort((a, b) => b.bijgewerkt.localeCompare(a.bijgewerkt))
      .map(({ id, naam, aangemaakt, bijgewerkt }) => ({ id, naam, aangemaakt, bijgewerkt }));
  }

  async function bewaar({ id, naam, partituur }) {
    if (!partituur || !Array.isArray(partituur.partijen)) {
      throw new Error('Er is geen partituur om te bewaren.');
    }

    const nu = new Date().toISOString();
    let aangemaakt = nu;
    if (id === undefined) {
      id = randomBytes(6).toString('hex');
    } else {
      aangemaakt = (await lees(id)).aangemaakt;
    }

    const project = {
      id,
      naam: String(naam ?? '').trim().slice(0, 120) || 'Naamloos',
      aangemaakt,
      bijgewerkt: nu,
      partituur,
    };
    await mkdir(map, { recursive: true });
    await writeFile(bestand(id), `${JSON.stringify(project, null, 2)}\n`, 'utf8');
    return project;
  }

  async function open(id) {
    return lees(id);
  }

  async function verwijder(id) {
    controleerId(id);
    try {
      await unlink(bestand(id));
    } catch (fout) {
      if (fout.code === 'ENOENT') throw new Error('Onbekend project.');
      throw fout;
    }
  }

  return { lijst, bewaar, open, verwijder };
}
