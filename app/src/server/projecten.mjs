import { fileURLToPath } from 'node:url';
import { maakOpslag } from '../project/opslag.mjs';

const standaardMap = fileURLToPath(new URL('../../projecten/', import.meta.url));

export default async function projecten(verzoek) {
  const opslag = maakOpslag(process.env.SCORE2SOUND_PROJECTEN || standaardMap);

  try {
    if (verzoek.methode === 'GET' && !verzoek.rest) return { status: 200, body: await opslag.lijst() };
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
