import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { maakOpslag } from '../project/opslag.mjs';
import { magBewaren } from './kwota.mjs';

const standaardMap = fileURLToPath(new URL('../../projecten/', import.meta.url));

export default async function projecten(verzoek) {
  const projectenMap = process.env.SCORE2SOUND_PROJECTEN || standaardMap;
  const opslag = maakOpslag(verzoek.gebruiker ? join(projectenMap, verzoek.gebruiker) : projectenMap);

  try {
    if (verzoek.methode === 'GET' && !verzoek.rest) {
      const lijst = await opslag.lijst();
      return { status: 200, body: lijst.map((project) => ({ ...project, map: project.map, labels: project.labels })) };
    }
    const meta = verzoek.rest.match(/^([a-f0-9]{12})\/meta$/);
    if (verzoek.methode === 'POST' && meta) {
      let gegevens;
      try {
        gegevens = JSON.parse(verzoek.body.toString());
        if (typeof gegevens.map === 'string' && gegevens.map.trim().length > 40) {
          throw new Error('Map mag maximaal 40 tekens lang zijn.');
        }
        const bijgewerkt = await opslag.zetMeta(meta[1], gegevens);
        const { partituur, ...project } = bijgewerkt;
        return { status: 200, body: project };
      } catch (fout) {
        if (fout instanceof SyntaxError) return { status: 400, body: { fout: 'De gegevens zijn geen geldige JSON.' } };
        if (fout.message === 'Onbekend project.') throw fout;
        return { status: 400, body: { fout: fout.message } };
      }
    }
    if ((verzoek.methode === 'GET' || verzoek.methode === 'DELETE') && !/^[a-f0-9]{12}$/.test(verzoek.rest)) {
      return { status: 400, body: { fout: 'Onbekend project.' } };
    }
    if (verzoek.methode === 'GET') return { status: 200, body: await opslag.open(verzoek.rest) };
    if (verzoek.methode === 'POST') {
      let gegevens;
      try {
        gegevens = JSON.parse(verzoek.body.toString());
      } catch {
        return { status: 400, body: { fout: 'De gegevens zijn geen geldige JSON.' } };
      }
      if (verzoek.gebruiker) {
        const { toegestaan } = await magBewaren({
          map: join(projectenMap, verzoek.gebruiker),
          nieuweGrootte: verzoek.body.length,
          max: process.env.SCORE2SOUND_KWOTA === undefined
            ? undefined
            : Number(process.env.SCORE2SOUND_KWOTA),
        });
        if (!toegestaan) {
          return { status: 413, body: { fout: 'Je opslag is vol. Verwijder een project en probeer het opnieuw.' } };
        }
      }
      return { status: 200, body: await opslag.bewaar(gegevens) };
    }
    if (verzoek.methode === 'DELETE' && verzoek.rest) {
      await opslag.verwijder(verzoek.rest);
      return { status: 200, body: { verwijderd: true } };
    }
    return { status: 405, body: { fout: 'Dat kan hier niet.' } };
  } catch (fout) {
    if (fout.message === 'Onbekend project.') return { status: 404, body: { fout: fout.message } };
    if (fout.message === 'Er is geen partituur om te bewaren.') return { status: 400, body: { fout: fout.message } };
    throw fout;
  }
}
