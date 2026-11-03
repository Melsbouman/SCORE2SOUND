import { herstelMaatsoorten as herstelMaatsoortenZonderTempo } from './maatsoorten.mjs';
import { vulBeginRust } from './beginrust.mjs';
import { vulOntbrekendeMaten } from './ontbrekend.mjs';
import { markeerVerdachteNoten } from './verdacht.mjs';

const hersteldePartituren = new WeakSet();

import { herstelTitel } from './titel.mjs';

export function herstelHerkenning(partituur) {
  if (hersteldePartituren.has(partituur)) return partituur;
  partituur = { ...partituur, titel: herstelTitel(partituur.titel) };
  const hersteld = markeerVerdachteNoten(vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(ruimZangtekstOp(partituur)))));
  hersteldePartituren.add(hersteld);
  return hersteld;
}
import { ruimZangtekstOp } from './zangtekst.mjs';
import { tempoUitTekst } from './tempotekst.mjs';

const herstelMaatsoorten = (partituur) => herstelMaatsoortenZonderTempo(tempoUitTekst(partituur));
