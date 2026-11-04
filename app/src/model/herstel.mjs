import { herstelMaatsoorten as herstelMaatsoortenZonderTempo } from './maatsoorten.mjs';
import { vulBeginRust } from './beginrust.mjs';
import { vulOntbrekendeMaten } from './ontbrekend.mjs';
import { markeerVerdachteNoten } from './verdacht.mjs';

const hersteldePartituren = new WeakSet();

import { herstelTitel } from './titel.mjs';

export function herstelHerkenning(partituur) {
  if (hersteldePartituren.has(partituur)) return partituur;
  partituur = { ...partituur, titel: herstelTitel(partituur.titel) };
  const { partituur: zonderColofon, colofon } = scheidColofon(partituur);
  const hersteld = markeerVerdachteNoten(vulLetterGaten(vulOntbrekendeMaten(vulBeginRust(herstelMaatsoorten(ruimZangtekstOp(teksttekensNaarAanduidingen(zonderColofon)))))));
  if (colofon) hersteld.colofon = colofon;
  hersteldePartituren.add(hersteld);
  return hersteld;
}
import { ruimZangtekstOp } from './zangtekst.mjs';
import { tempoUitTekst as leesTempoUitTekst } from './tempotekst.mjs';
import { herstelTeksten } from './tekstherstel.mjs';

function tempoUitTekst(partituur) {
  return herstelTeksten(leesTempoUitTekst(partituur));
}

const herstelMaatsoorten = (partituur) => herstelMaatsoortenZonderTempo(tempoUitTekst(partituur));
import { vulLetterGaten } from './lettergaten.mjs';
// vulVoltas (hokjes 1. en 2.) staat uit: de heuristiek gaf bij Galop hokjes op de verkeerde plek.
import { scheidColofon } from './colofon.mjs';
import { teksttekensNaarAanduidingen } from './teksttekens.mjs';
