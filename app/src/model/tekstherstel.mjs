import { leesAanduidingen } from './aanduidingenlijst.mjs';

// Tekstaanwijzingen worden aanduidingen uit de vaste lijst (of twee: een sterkte en een speelwijze), nooit een gegokte tekst.
export function herstelTeksten(partituur) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie?.partijen ?? []) {
    for (const maat of partij.maten ?? []) {
      const nieuw = [];
      for (const element of maat.elementen ?? []) {
        if (element?.soort !== 'aanwijzing' || element.type !== 'tekst' || typeof element.waarde !== 'string') {
          nieuw.push(element);
          continue;
        }
        const gelezen = leesAanduidingen(element.waarde);
        if (!gelezen) {
          nieuw.push(element);
          continue;
        }
        const gelijk = gelezen.length === 1 && gelezen[0].type === 'tekst'
          && gelezen[0].waarde.toLowerCase() === element.waarde.trim().toLowerCase();
        for (const { type, waarde } of gelezen) {
          nieuw.push({ soort: 'aanwijzing', start: element.start, type, waarde, zekerheid: gelijk ? element.zekerheid : 0.5 });
        }
      }
      maat.elementen = nieuw;
    }
  }
  return kopie;
}
