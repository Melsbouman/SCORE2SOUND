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

// Vier of meer maten op rij met dezelfde inhoud die niet bij de maatsoort past, maar wel precies een gewone maatsoort vult (elk 3
// kwarten in 4/4, zoals het Menuet van Suite Gothique): de maatsoort is waarschijnlijk verkeerd gelezen. Eén melding bij de eerste
// maat van de reeks, naast de meldingen per maat. De maatsoort zelf blijft staan (de herkenning verzint geen wisseling).
const GEWONE_MAATSOORTEN = [[2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 2], [3, 2], [3, 8], [6, 8], [9, 8], [12, 8]];

export function maatsoortVermoedens(partituur) {
  const meldingen = [];
  for (const partij of partituur.partijen ?? []) {
    let reeks = [];
    const sluit = () => {
      const eerste = reeks[0];
      const passend = eerste && reeks.length >= 4
        ? GEWONE_MAATSOORTEN.find(([teller, noemer]) => maatLengte({ teller, noemer }) === eerste.lengte)
        : null;
      if (passend) {
        const kwarten = alsKwarten(eerste.lengte);
        meldingen.push({
          soort: 'maatduur',
          ernst: 'waarschuwing',
          partij: partij.id,
          maat: eerste.maat.index,
          tekst: `Maat ${eerste.maat.nummer} tot ${reeks.at(-1).maat.nummer} duren elk ${getalTekst(kwarten)} ${kwarten === 1 ? 'kwart' : 'kwarten'}, terwijl er ${eerste.maat.maatsoort.teller}/${eerste.maat.maatsoort.noemer} staat: staat er misschien ${passend[0]}/${passend[1]}? Pas dan de maatsoort aan.`,
        });
      }
      reeks = [];
    };
    for (const maat of partij.maten ?? []) {
      if (maat.verborgen) continue;
      const lengte = maat.elementen.reduce((max, element) => (
        element.soort === 'noot' || element.soort === 'rust' ? Math.max(max, element.start + element.duur) : max
      ), 0);
      if (lengte === 0 || lengte === maatLengte(maat.maatsoort) || maat.opmaat) {
        sluit();
        continue;
      }
      const vorige = reeks.at(-1);
      if (vorige && (vorige.lengte !== lengte || vorige.maat.maatsoort.teller !== maat.maatsoort.teller
        || vorige.maat.maatsoort.noemer !== maat.maatsoort.noemer)) sluit();
      reeks.push({ maat, lengte });
    }
    sluit();
  }
  return meldingen;
}
