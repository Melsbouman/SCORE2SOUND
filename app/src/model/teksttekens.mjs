import { AANDUIDINGENLIJST, leesAanduidingen } from './aanduidingenlijst.mjs';

const LIJSTWOORDEN = new Set(AANDUIDINGENLIJST.flatMap((item) => [item.naam, item.afkorting].filter(Boolean)));

// Audiveris leest een sterkte of speelwijze onder de balk (ff, marc., cresc.) soms als zangtekst onder een noot.
// In een stuk zonder echte zangtekst (minder dan 40% van de noten heeft tekst) worden zulke woorden aanduidingen uit de vaste lijst.
const STERKTES = new Set(['pp', 'p', 'mp', 'mf', 'f', 'ff', 'sfz']);
const normaal = (tekst) => tekst.normalize('NFKD').replace(/['’`´]/g, '');
const schoon = (tekst) => normaal(tekst).toLowerCase().replace(/[.,;:]/g, '').trim();

function alsAanduidingen(lettergreep) {
  const woord = schoon(lettergreep);
  if (!woord) return null;
  if (STERKTES.has(woord)) return [{ type: 'dynamiek', waarde: woord }];
  const gelezen = leesAanduidingen(normaal(lettergreep));
  if (!gelezen || gelezen.length !== 1) return null;
  // Alleen een woord dat echt in de lijst staat telt; al het andere blijft zangtekst.
  return gelezen[0].type === 'dynamiek' || LIJSTWOORDEN.has(gelezen[0].waarde) ? gelezen : null;
}

export function teksttekensNaarAanduidingen(partituur) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie.partijen ?? []) {
    const noten = partij.maten.flatMap((maat) => maat.elementen).filter((e) => e.soort === 'noot' && !e.overbinding?.eind);
    if (noten.length === 0) continue;
    const metTekst = noten.filter((noot) => noot.teksten?.length).length;
    if (metTekst / noten.length >= 0.4) continue; // echte zangtekst: niet aanraken

    for (const maat of partij.maten) {
      const extra = [];
      for (const element of maat.elementen) {
        if (element.soort !== 'noot' || !element.teksten?.length) continue;
        const over = [];
        for (const tekst of element.teksten) {
          const aanduidingen = alsAanduidingen(String(tekst.lettergreep ?? ''));
          if (!aanduidingen) {
            over.push(tekst);
            continue;
          }
          for (const { type, waarde } of aanduidingen) {
            extra.push({ soort: 'aanwijzing', start: element.start, type, waarde, zekerheid: 0.5 });
          }
        }
        if (over.length > 0) element.teksten = over;
        else delete element.teksten;
      }
      maat.elementen.push(...extra);
    }
  }
  return kopie;
}
