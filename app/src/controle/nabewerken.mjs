import { maatLengte } from '../model/duur.mjs';

export function vulLegeMaten(partituur) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie.partijen) {
    for (const maat of partij.maten) {
      if (!maat.opmaat && !maat.elementen.some((element) => element.soort === 'noot' || element.soort === 'rust')) {
        maat.elementen.unshift({
          soort: 'rust',
          start: 0,
          duur: maatLengte(maat.maatsoort),
          stem: 1,
          notenbalk: 1,
          heleMaat: true,
          zekerheid: 0.5,
        });
      }
    }
  }
  return kopie;
}

export function markeerFouteMaten(partituur, meldingen) {
  const kopie = structuredClone(partituur);
  for (const melding of meldingen) {
    if (melding.soort !== 'maatduur') continue;
    const partij = kopie.partijen.find((item) => item.id === melding.partij);
    const maat = partij?.maten[melding.maat];
    if (!maat) continue;
    for (const element of maat.elementen) {
      if (element.soort === 'noot' && element.zekerheid > 0.75) element.zekerheid = 0.75;
    }
  }
  return kopie;
}
