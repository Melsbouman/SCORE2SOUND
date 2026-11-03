import { herstelMaatsoorten } from './maatsoorten.mjs';
import { vulBeginRust } from './beginrust.mjs';
import { vulOntbrekendeMaten } from './ontbrekend.mjs';
import { markeerVerdachteNoten } from './verdacht.mjs';

const hersteldePartituren = new WeakSet();

export function herstelHerkenning(partituur) {
  if (hersteldePartituren.has(partituur)) return partituur;
  const hersteld = markeerVerdachteNoten(vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(partituur))));
  hersteldePartituren.add(hersteld);
  return hersteld;
}
