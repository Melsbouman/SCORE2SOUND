import { maatLengte } from './duur.mjs';
import { herstelMaatduur } from './maatduur.mjs';

function herindexeer(maten) {
  maten.forEach((maat, index) => {
    maat.index = index;
  });
}

function maatnummer(maat) {
  return /^\d+$/.test(maat.nummer) ? Number(maat.nummer) : null;
}

export function voegMaatToe(partituur, maatIndex) {
  const kopie = structuredClone(partituur);
  if (!Number.isInteger(maatIndex) || maatIndex < 0) return kopie;

  for (const partij of kopie.partijen) {
    const positie = partij.maten.findIndex((maat) => maat.index === maatIndex);
    if (positie === -1) continue;
    const vorige = partij.maten[positie];
    const vorigNummer = maatnummer(vorige);
    const nieuwNummer = vorigNummer === null ? maatIndex + 2 : vorigNummer + 1;
    for (const maat of partij.maten.slice(positie + 1)) {
      const nummer = maatnummer(maat);
      if (nummer !== null && nummer >= nieuwNummer) maat.nummer = String(nummer + 1);
    }

    const voorbeeldElement = vorige.elementen.find((element) => (
      element.soort === 'noot' || element.soort === 'rust'
    ));
    const lengte = maatLengte(vorige.maatsoort);
    const rust = {
      soort: 'rust',
      start: 0,
      duur: lengte,
      stem: voorbeeldElement?.stem ?? 1,
      notenbalk: voorbeeldElement?.notenbalk ?? 1,
      heleMaat: true,
      zekerheid: 1,
    };
    const nieuw = structuredClone(vorige);
    nieuw.nummer = String(nieuwNummer);
    nieuw.index = maatIndex + 1;
    nieuw.opmaat = false;
    nieuw.elementen = [rust];
    if ('regelbegin' in nieuw) nieuw.regelbegin = false;
    if ('paginabegin' in nieuw) nieuw.paginabegin = false;
    if ('tempo' in nieuw) nieuw.tempo = null;
    if ('herhaling' in nieuw) nieuw.herhaling = { begin: false, eind: false, keer: 2 };
    delete nieuw.volta;
    delete nieuw.sprong;
    delete nieuw.maatrust;
    delete nieuw.verborgen;

    partij.maten.splice(positie + 1, 0, nieuw);
    herindexeer(partij.maten);
  }
  return kopie;
}

export function verwijderMaat(partituur, maatIndex) {
  const kopie = structuredClone(partituur);
  if (!Number.isInteger(maatIndex) || maatIndex < 0) return kopie;

  for (const partij of kopie.partijen) {
    const positie = partij.maten.findIndex((maat) => maat.index === maatIndex);
    if (positie === -1) continue;
    const verwijderdNummer = maatnummer(partij.maten[positie]);
    partij.maten.splice(positie, 1);
    if (verwijderdNummer !== null) {
      for (const maat of partij.maten.slice(positie)) {
        const nummer = maatnummer(maat);
        if (nummer !== null && nummer > verwijderdNummer) maat.nummer = String(nummer - 1);
      }
    }
    herindexeer(partij.maten);
  }
  return kopie;
}

export function zetMaatsoort(partituur, maatIndex, teller, noemer) {
  if (!Number.isInteger(maatIndex) || maatIndex < 0
    || !Number.isInteger(teller) || teller <= 0
    || !Number.isInteger(noemer) || noemer <= 0
    || !Number.isInteger(teller * 1920 / noemer)) {
    return structuredClone(partituur);
  }
  let kopie = structuredClone(partituur);
  const aangepast = [];
  for (const partij of kopie.partijen) {
    for (const maat of partij.maten) {
      if (maat.index < maatIndex) continue;
      maat.maatsoort = { teller, noemer };
      aangepast.push({ partijId: partij.id, maatIndex: maat.index });
    }
  }
  for (const plaats of aangepast) {
    kopie = herstelMaatduur(kopie, plaats.partijId, plaats.maatIndex);
  }
  return kopie;
}

export function zetToonsoort(partituur, maatIndex, kwinten, modus = 'majeur') {
  if (!Number.isInteger(kwinten) || kwinten < -7 || kwinten > 7) {
    throw new Error('Het aantal kwinten moet tussen -7 en 7 liggen.');
  }
  const kopie = structuredClone(partituur);
  for (let partijIndex = 0; partijIndex < partituur.partijen.length; partijIndex += 1) {
    const origineleMaten = partituur.partijen[partijIndex].maten;
    const nieuweMaten = kopie.partijen[partijIndex].maten;
    let begonnen = false;
    for (let positie = 0; positie < origineleMaten.length; positie += 1) {
      const maat = origineleMaten[positie];
      if (!begonnen) {
        if (maat.index !== maatIndex) continue;
        begonnen = true;
      } else if (JSON.stringify(maat.toonsoort) !== JSON.stringify(origineleMaten[positie - 1].toonsoort)) {
        break;
      }
      nieuweMaten[positie].toonsoort = { kwinten, modus };
    }
  }
  return kopie;
}
