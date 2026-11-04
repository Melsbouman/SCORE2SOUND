import { duurGebalkteZestiende, maatLengte } from './duur.mjs';

const STANDAARD_RUSTDUREN = [1920, 1440, 960, 720, 480, 360, 240, 180, 120, 90, 60, 45, 30];

function maakRustduren(duur) {
  const duren = [];
  let resterend = duur;

  for (const standaardDuur of STANDAARD_RUSTDUREN) {
    while (resterend >= standaardDuur) {
      duren.push(standaardDuur);
      resterend -= standaardDuur;
    }
  }

  if (resterend > 0) duren.push(resterend);
  return duren;
}

export function herstelMaatduur(partituur, partijId, maatIndex) {
  const partij = partituur.partijen.find((item) => item.id === partijId);
  const maat = partij?.maten.find((item) => item.index === maatIndex);
  if (!maat) return partituur;

  let kopie = null;
  for (let index = 0; index < maat.elementen.length; index += 1) {
    const duur = duurGebalkteZestiende(maat.elementen, index);
    if (duur === null) continue;
    kopie ??= structuredClone(partituur);
    const gekopieerdePartij = kopie.partijen.find((item) => item.id === partijId);
    const gekopieerdeMaat = gekopieerdePartij.maten.find((item) => item.index === maatIndex);
    gekopieerdeMaat.elementen[index].duur = duur;
  }

  const werkMaat = kopie
    ? kopie.partijen.find((item) => item.id === partijId).maten.find((item) => item.index === maatIndex)
    : maat;

  const lengte = werkMaat.elementen.reduce((max, element) => {
    if (element.soort !== 'noot' && element.soort !== 'rust') return max;
    return Math.max(max, element.start + element.duur);
  }, 0);
  const verwacht = maatLengte(maat.maatsoort);
  if (lengte === verwacht) return kopie ?? partituur;

  kopie ??= structuredClone(partituur);
  const gekopieerdePartij = kopie.partijen.find((item) => item.id === partijId);
  const gekopieerdeMaat = gekopieerdePartij.maten.find((item) => item.index === maatIndex);

  if (lengte > verwacht) {
    for (let index = gekopieerdeMaat.elementen.length - 1; index >= 0; index -= 1) {
      const element = gekopieerdeMaat.elementen[index];
      if ((element.soort !== 'noot' && element.soort !== 'rust') || element.duur <= 0) continue;

      if (element.start >= verwacht) {
        gekopieerdeMaat.elementen.splice(index, 1);
      } else if (element.start + element.duur > verwacht) {
        element.duur = verwacht - element.start;
      }
    }
    return kopie;
  }

  let laatsteElement = null;
  for (let index = werkMaat.elementen.length - 1; index >= 0; index -= 1) {
    const element = werkMaat.elementen[index];
    if ((element.soort === 'noot' || element.soort === 'rust')
      && element.duur > 0 && element.start + element.duur === lengte) {
      laatsteElement = element;
      break;
    }
  }

  let start = lengte;
  for (const duur of maakRustduren(verwacht - lengte)) {
    const rust = {
      soort: 'rust',
      start,
      duur,
      stem: laatsteElement?.stem ?? 1,
      notenbalk: laatsteElement?.notenbalk ?? 1,
      heleMaat: start === 0 && duur === verwacht,
      zekerheid: 1,
    };
    const positie = gekopieerdeMaat.elementen.findIndex((element) => (
      element.start > start || (element.start === start && (element.stem ?? 0) > rust.stem)
    ));
    gekopieerdeMaat.elementen.splice(positie === -1 ? gekopieerdeMaat.elementen.length : positie, 0, rust);
    start += duur;
  }

  return kopie;
}
