import { verwijderElement } from './noten-bewerken.mjs';

export function opAlle(partituur, ids, bewerking) {
  let resultaat = partituur;
  for (const id of ids) resultaat = bewerking(resultaat, id);
  return resultaat;
}

export function verwijderAlle(partituur, ids) {
  return opAlle(partituur, ids, verwijderElement);
}
