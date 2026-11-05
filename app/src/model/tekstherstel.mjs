import { leesAanduidingen } from './aanduidingenlijst.mjs';
import { tekstenBijnaGelijk } from './tekstsoort.mjs';

function verwijderDubbeleZangtekst(maten) {
  const aanwijzingen = maten.map((maat) => (maat.elementen ?? [])
    .filter((element) => element?.soort === 'aanwijzing' && element.type === 'tekst' && typeof element.waarde === 'string')
    .map((element) => element.waarde));

  for (let index = 0; index < maten.length; index += 1) {
    const nabij = aanwijzingen.slice(Math.max(0, index - 1), index + 2).flat();
    for (const element of maten[index].elementen ?? []) {
      if (element?.soort !== 'noot' || !element.teksten?.length) continue;
      const over = element.teksten
        .filter((tekst) => !nabij.some((aanwijzing) => tekstenBijnaGelijk(tekst.lettergreep, aanwijzing)))
        .map((tekst, couplet) => ({ ...tekst, couplet: couplet + 1 }));
      if (over.length > 0) element.teksten = over;
      else delete element.teksten;
    }
  }
}

// Tekstaanwijzingen worden aanduidingen uit de vaste lijst (of twee: een sterkte en een speelwijze), nooit een gegokte tekst.
export function herstelTeksten(partituur) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie?.partijen ?? []) {
    verwijderDubbeleZangtekst(partij.maten ?? []);
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
        // Niets veranderd (bijvoorbeeld Vivace risoluto): het element blijft zoals het is.
        if (gelezen.every((deel) => deel.type === 'tekst') && gelezen.map((deel) => deel.waarde).join(' ') === element.waarde.trim().replace(/\s+/g, ' ')) {
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
