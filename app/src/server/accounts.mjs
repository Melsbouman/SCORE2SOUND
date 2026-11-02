import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const SESSIEDUUR = 30 * 24 * 60 * 60 * 1000;
const SESSIEOPRUIMPERIODE = 60 * 60 * 1000;
const POGINGSPERIODE = 15 * 60 * 1000;
const MAX_POGINGEN = 5;

function normaalEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function geldigEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function codeLimiet(codes, code) {
  if (Array.isArray(codes)) {
    const gevonden = codes.find((item) =>
      typeof item === 'string' ? item === code : item?.code === code,
    );
    if (typeof gevonden === 'string') return 1;
    return gevonden ? (gevonden.max ?? 1) : 0;
  }

  if (codes && Object.hasOwn(codes, code)) {
    const waarde = codes[code];
    return typeof waarde === 'number' ? waarde : (waarde?.max ?? 1);
  }

  return 0;
}

function bestand(map, id) {
  return join(map, `${id}.json`);
}

async function wachtwoordHash(wachtwoord, zout) {
  return Buffer.from(await scrypt(wachtwoord, zout, 64)).toString('hex');
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex');
}

function gelijkHex(links, rechts) {
  const a = Buffer.from(links, 'hex');
  const b = Buffer.from(rechts, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

export function maakAccounts({ map, codes, nu = Date.now }) {
  const sessies = new Map();
  const pogingen = new Map();
  let laatsteSessieOpruiming = null;

  function ruimSessiesOp() {
    const tijd = nu();
    laatsteSessieOpruiming = tijd;
    let verwijderd = 0;
    for (const [hash, sessie] of sessies) {
      if (tijd >= sessie.verloopt) {
        sessies.delete(hash);
        verwijderd += 1;
      }
    }
    return verwijderd;
  }

  function ruimSessiesPeriodiekOp() {
    const tijd = nu();
    if (
      laatsteSessieOpruiming !== null
      && tijd - laatsteSessieOpruiming < SESSIEOPRUIMPERIODE
    ) return;
    ruimSessiesOp();
  }

  async function gebruikers() {
    await mkdir(map, { recursive: true });
    const namen = await readdir(map);
    const resultaten = [];
    for (const naam of namen) {
      if (!/^[a-f0-9]{12}\.json$/.test(naam)) continue;
      try {
        resultaten.push(JSON.parse(await readFile(join(map, naam), 'utf8')));
      } catch {
        // Een beschadigd of tussentijds geschreven bestand is geen gebruiker.
      }
    }
    return resultaten;
  }

  async function registreer({ email, wachtwoord, code }) {
    ruimSessiesPeriodiekOp();
    const adres = normaalEmail(email);
    if (!geldigEmail(adres)) throw new Error('Vul een geldig e-mailadres in.');
    if (typeof wachtwoord !== 'string' || wachtwoord.length < 10) {
      throw new Error('Kies een wachtwoord van minstens 10 tekens.');
    }

    const bestaand = await gebruikers();
    if (bestaand.some((gebruiker) => gebruiker.email === adres)) {
      throw new Error('Dit e-mailadres is al in gebruik.');
    }

    const limiet = codeLimiet(codes, code);
    const gebruikt = bestaand.filter((gebruiker) => gebruiker.code === code).length;
    if (!limiet || gebruikt >= limiet) throw new Error('Deze uitnodigingscode is niet geldig.');

    const id = randomBytes(6).toString('hex');
    const zout = randomBytes(16).toString('hex');
    const gebruiker = {
      id,
      email: adres,
      wachtwoordHash: await wachtwoordHash(wachtwoord, zout),
      zout,
      code,
    };
    await writeFile(bestand(map, id), `${JSON.stringify(gebruiker, null, 2)}\n`, 'utf8');
    return { id, email: adres };
  }

  async function logIn({ email, wachtwoord }) {
    ruimSessiesPeriodiekOp();
    const adres = normaalEmail(email);
    const tijd = nu();
    const recentePogingen = (pogingen.get(adres) ?? []).filter(
      (poging) => tijd - poging < POGINGSPERIODE,
    );
    if (recentePogingen.length >= MAX_POGINGEN) {
      pogingen.set(adres, recentePogingen);
      throw new Error('Probeer het later opnieuw.');
    }

    const gebruiker = (await gebruikers()).find((item) => item.email === adres);
    let klopt = false;
    if (gebruiker && typeof wachtwoord === 'string') {
      const hash = await wachtwoordHash(wachtwoord, gebruiker.zout);
      klopt = gelijkHex(hash, gebruiker.wachtwoordHash);
    } else {
      const zout = randomBytes(16).toString('hex');
      await wachtwoordHash(typeof wachtwoord === 'string' ? wachtwoord : '', zout);
    }

    if (!klopt) {
      recentePogingen.push(tijd);
      pogingen.set(adres, recentePogingen);
      throw new Error('E-mailadres of wachtwoord klopt niet.');
    }

    pogingen.delete(adres);
    const token = randomBytes(32).toString('hex');
    sessies.set(tokenHash(token), { gebruikerId: gebruiker.id, verloopt: tijd + SESSIEDUUR });
    return token;
  }

  async function gebruikerVan(token) {
    if (typeof token !== 'string') return null;
    const hash = tokenHash(token);
    let sessie;
    for (const [bewaardeHash, kandidaat] of sessies) {
      if (gelijkHex(hash, bewaardeHash)) {
        sessie = kandidaat;
        break;
      }
    }
    if (!sessie) return null;
    if (nu() >= sessie.verloopt) {
      sessies.delete(hash);
      return null;
    }
    const gebruiker = (await gebruikers()).find((item) => item.id === sessie.gebruikerId);
    return gebruiker ? { id: gebruiker.id, email: gebruiker.email } : null;
  }

  function logUit(token) {
    if (typeof token !== 'string') return;
    sessies.delete(tokenHash(token));
  }

  async function verwijder(gebruikerId) {
    if (!/^[a-f0-9]{12}$/.test(gebruikerId)) return false;
    try {
      await unlink(bestand(map, gebruikerId));
    } catch (fout) {
      if (fout.code === 'ENOENT') return false;
      throw fout;
    }
    for (const [hash, sessie] of sessies) {
      if (sessie.gebruikerId === gebruikerId) sessies.delete(hash);
    }
    return true;
  }

  return { registreer, logIn, gebruikerVan, logUit, verwijder, ruimSessiesOp };
}
