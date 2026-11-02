import { fileURLToPath } from 'node:url';
import { maakAccounts } from './accounts.mjs';

const standaardMap = fileURLToPath(new URL('../../accounts/', import.meta.url));
const accounts = maakAccounts({
  map: process.env.SCORE2SOUND_ACCOUNTSMAP || standaardMap,
  codes: (process.env.SCORE2SOUND_CODES || '').split(',').map((code) => code.trim()).filter(Boolean),
});

function tokenUit(koppen = {}) {
  const cookies = koppen.cookie || '';
  const cookie = cookies.split(';').map((deel) => deel.trim()).find((deel) => deel.startsWith('score2sound='));
  return cookie?.slice('score2sound='.length);
}

function sessieCookie(token) {
  const beveiligd = process.env.SCORE2SOUND_HTTPS === 'aan' ? '; Secure' : '';
  return `score2sound=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${beveiligd}`;
}

export async function gebruikerVan(token) {
  return accounts.gebruikerVan(token);
}

export default async function inloggen(verzoek) {
  const token = tokenUit(verzoek.koppen);
  if (verzoek.methode === 'GET' && !verzoek.rest) {
    const gebruiker = await accounts.gebruikerVan(token);
    return gebruiker
      ? { status: 200, body: { gebruiker } }
      : { status: 401, body: { fout: 'Log eerst in.' } };
  }

  if (verzoek.methode === 'POST' && verzoek.rest === 'uit') {
    accounts.logUit(token);
    const beveiligd = process.env.SCORE2SOUND_HTTPS === 'aan' ? '; Secure' : '';
    return {
      status: 200,
      body: { uitgelogd: true },
      koppen: { 'Set-Cookie': `score2sound=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${beveiligd}` },
    };
  }

  if (verzoek.methode !== 'POST' || !['registreer', 'login'].includes(verzoek.rest)) {
    return { status: 405, body: { fout: 'Dat kan hier niet.' } };
  }

  let gegevens;
  try {
    gegevens = JSON.parse(verzoek.body.toString());
  } catch {
    return { status: 400, body: { fout: 'De gegevens zijn geen geldige JSON.' } };
  }

  try {
    let gebruiker;
    let sessieToken;
    if (verzoek.rest === 'registreer') {
      gebruiker = await accounts.registreer(gegevens);
      sessieToken = await accounts.logIn(gegevens);
    } else {
      sessieToken = await accounts.logIn(gegevens);
      gebruiker = await accounts.gebruikerVan(sessieToken);
    }
    return {
      status: 200,
      body: { gebruiker },
      koppen: { 'Set-Cookie': sessieCookie(sessieToken) },
    };
  } catch (fout) {
    const invoerFouten = [
      'Vul een geldig e-mailadres in.',
      'Kies een wachtwoord van minstens 10 tekens.',
      'Dit e-mailadres is al in gebruik.',
      'Deze uitnodigingscode is niet geldig.',
      'Probeer het later opnieuw.',
      'E-mailadres of wachtwoord klopt niet.',
    ];
    if (!invoerFouten.includes(fout.message)) throw fout;
    return { status: 400, body: { fout: fout.message } };
  }
}
