import { AANDUIDINGENLIJST } from './aanduidingenlijst.mjs';

const GROEPEN_MET_AFKORTING = new Set(['Dynamiek', 'Volumeveranderingen']);

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

export function plaatsingVan(term) {
  const gezocht = String(term).toLocaleLowerCase('nl');
  const item = AANDUIDINGENLIJST.find(({ naam, afkorting }) =>
    naam.toLocaleLowerCase('nl') === gezocht || afkorting?.toLocaleLowerCase('nl') === gezocht,
  );
  return item && GROEPEN_MET_AFKORTING.has(item.groep) ? 'below' : 'above';
}
