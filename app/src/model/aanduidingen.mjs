import { AANDUIDINGENLIJST } from './aanduidingenlijst.mjs';
import { combineerDynamiektekens } from './dynamiek.mjs';

const GROEPEN_MET_AFKORTING = new Set(['Dynamiek', 'Volumeveranderingen']);

export const SPELWIJZEN = ['open'];

export const AANDUIDINGEN = Object.fromEntries(
  AANDUIDINGENLIJST.reduce((groepen, item) => {
    let groep = groepen.find(([naam]) => naam === item.groep);
    if (!groep) {
      groep = [item.groep, []];
      groepen.push(groep);
    }
    groep[1].push(GROEPEN_MET_AFKORTING.has(item.groep) ? item.afkorting : item.naam);
    return groepen;
  }, []),
);

export function uitlegVan(term) {
  const gezocht = String(term).toLocaleLowerCase('nl');
  const item = AANDUIDINGENLIJST.find(({ naam, afkorting }) =>
    naam.toLocaleLowerCase('nl') === gezocht || afkorting?.toLocaleLowerCase('nl') === gezocht,
  );
  return item?.uitleg ?? '';
}

// Sterkte-tekens en crescendo/diminuendo staan onder de balk, de rest erboven (ook oudere tekens als sf, fp en fff).
const STERKTETEKENS = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ppp', 'ffff', 'pppp', 'sf', 'sfz', 'sfp', 'fp', 'rfz', 'sffz'];

export function plaatsingVan(term) {
  const gezocht = String(term).trim().toLocaleLowerCase('nl');
  if (STERKTETEKENS.includes(gezocht) || gezocht.includes('cresc') || gezocht.includes('dim')) return 'below';
  const item = AANDUIDINGENLIJST.find(({ naam, afkorting }) =>
    naam.toLocaleLowerCase('nl') === gezocht || afkorting?.toLocaleLowerCase('nl') === gezocht,
  );
  return item && GROEPEN_MET_AFKORTING.has(item.groep) ? 'below' : 'above';
}

const BIJNA_DEZELFDE_PLEK = 60;

export function voegDynamiekenSamen(partituur) {
  const nieuw = structuredClone(partituur);
  const meldingen = [];

  for (const partij of nieuw.partijen ?? []) {
    for (const maat of partij.maten ?? []) {
      const groepen = [];
      const dynamieken = (maat.elementen ?? [])
        .filter((element) => element?.soort === 'aanwijzing' && element.type === 'dynamiek')
        .sort((a, b) => a.start - b.start);
      for (const dynamiek of dynamieken) {
        const groep = groepen.find((kandidaat) =>
          Math.abs(kandidaat[0].start - dynamiek.start) <= BIJNA_DEZELFDE_PLEK
        );
        if (groep) groep.push(dynamiek);
        else groepen.push([dynamiek]);
      }

      for (const groep of groepen.filter((kandidaat) => kandidaat.length > 1)) {
        const { teken, conflict } = combineerDynamiektekens(groep);
        const eersteIndex = maat.elementen.findIndex((element) => element === groep[0]);
        maat.elementen = maat.elementen.filter((element) => !groep.includes(element));
        maat.elementen.splice(eersteIndex, 0, teken);
        if (conflict) {
          const waarden = groep.map((element) => element.waarde);
          const opsomming = waarden.length === 2
            ? waarden.join(' en ')
            : `${waarden.slice(0, -1).join(', ')} en ${waarden.at(-1)}`;
          meldingen.push({
            soort: 'herkenning',
            ernst: 'waarschuwing',
            partij: partij.id,
            maat: maat.index,
            tekst: `Maat ${maat.nummer}: ${opsomming} stonden op dezelfde plek; ${teken.waarde} is behouden.`,
          });
        }
      }
    }
  }

  return { partituur: nieuw, meldingen };
}
