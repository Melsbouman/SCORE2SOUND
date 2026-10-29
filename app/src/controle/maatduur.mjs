import { alsKwarten, maatLengte } from '../model/duur.mjs';

const getalTekst = (waarde) => String(waarde).replace('.', ',');

export function controleerMaatduur(partituur) {
  const meldingen = [];

  for (const partij of partituur.partijen) {
    const maten = partij.maten;
    const heeftOpmaat = maten[0]?.opmaat === true;

    for (let index = 0; index < maten.length; index += 1) {
      const maat = maten[index];
      const lengte = maat.elementen.reduce((max, element) => {
        if (element.soort !== 'noot' && element.soort !== 'rust') return max;
        return Math.max(max, element.start + element.duur);
      }, 0);
      const verwacht = maatLengte(maat.maatsoort);

      if (lengte === verwacht || (maat.opmaat && lengte < verwacht)) continue;

      const isAfmaat = heeftOpmaat && index === maten.length - 1 && lengte < verwacht;
      const duurKwarten = alsKwarten(lengte);
      const verwachtKwarten = alsKwarten(verwacht);
      const suffix = isAfmaat ? ' Bij een opmaat kan dit een afmaat zijn.' : '';
      meldingen.push({
        soort: 'maatduur',
        ernst: isAfmaat ? 'waarschuwing' : 'fout',
        partij: partij.id,
        maat: maat.index,
        tekst: `Maat ${maat.nummer} duurt ${getalTekst(duurKwarten)} ${duurKwarten === 1 ? 'kwart' : 'kwarten'}, maar de maatsoort ${maat.maatsoort.teller}/${maat.maatsoort.noemer} vraagt er ${getalTekst(verwachtKwarten)}.${suffix}`,
      });
    }
  }

  return meldingen;
}
