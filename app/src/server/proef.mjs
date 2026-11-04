import herkenHandler from './herken.mjs';
import { maakLimiet } from './limiet.mjs';

export function maakProef({
  herken,
  aan = () => process.env.SCORE2SOUND_PROEF === 'aan',
  limiet = maakLimiet({ max: 3, venster: 86400000 }),
  maxBytes = 2 * 1024 * 1024
}) {
  const taken = new Set();
  let lopend = null;
  let vrijgeven = null;

  const stopLopend = () => {
    lopend = null;
    if (vrijgeven) clearTimeout(vrijgeven);
    vrijgeven = null;
  };

  return async (verzoek) => {
    if (!aan()) return { status: 404, body: { fout: 'Niet gevonden.' } };

    if (verzoek.methode === 'POST') {
      const doorgestuurd = verzoek.koppen?.['x-forwarded-for'];
      const eerste = Array.isArray(doorgestuurd) ? doorgestuurd[0] : doorgestuurd;
      const adres = eerste?.split(',')[0].trim() || verzoek.adres || 'onbekend';

      if (verzoek.body?.length > maxBytes) return { status: 413, body: { fout: 'Bestand is te groot.' } };
      if (!limiet(adres)) return { status: 429, body: { fout: 'Je hebt vandaag al drie proefscans gedaan. Log in voor meer.' } };
      if (lopend) return { status: 503, body: { fout: 'Er loopt al een proefscan. Probeer het over een minuut opnieuw.' } };

      const antwoord = await herken({
        ...verzoek,
        query: { ...verzoek.query, paginas: '1' },
        gebruiker: 'proef'
      });
      if (antwoord.status >= 200 && antwoord.status < 300 && antwoord.body?.id) {
        lopend = antwoord.body.id;
        taken.add(lopend);
        vrijgeven = setTimeout(stopLopend, 3 * 60 * 1000);
        vrijgeven.unref?.();
      }
      return antwoord;
    }

    if (verzoek.methode === 'GET' && verzoek.rest) {
      if (!taken.has(verzoek.rest)) return { status: 404, body: { fout: 'Niet gevonden.' } };
      const antwoord = await herken({ ...verzoek, gebruiker: 'proef' });
      if (verzoek.rest === lopend && ['klaar', 'fout', 'afgebroken'].includes(antwoord.body?.stand)) stopLopend();
      return antwoord;
    }

    return { status: 405, body: { fout: 'Methode niet toegestaan.' } };
  };
}

export default maakProef({ herken: herkenHandler });
