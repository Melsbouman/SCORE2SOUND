import { leesId } from './corrigeren.mjs';

export const TUPLETS = [
  { id: 'duool', aantal: 2, normaal: 3 },
  { id: 'triool', aantal: 3, normaal: 2 },
  { id: 'kwartool', aantal: 4, normaal: 3 },
  { id: 'kwintool', aantal: 5, normaal: 4 },
  { id: 'sextool', aantal: 6, normaal: 4 },
  { id: 'zeventool', aantal: 7, normaal: 4 },
  { id: 'achttool', aantal: 8, normaal: 6 },
  { id: 'negentool', aantal: 9, normaal: 8 },
];

const KLEINSTE_DUUR = 30; // een 64e bij 1920 tikken per 4/4-maat

function zoekMaatEnElement(partituur, id) {
  if (typeof id !== 'string') return null;
  const gelezen = leesId(id);
  if (!gelezen) return null;
  const partij = partituur.partijen.find((item) => item.id === gelezen.partijId);
  const maat = partij?.maten.find((item) => item.index === gelezen.maatIndex);
  const element = maat?.elementen[gelezen.elementIndex];
  if (!maat || !element) return null;
  return { maat, element, elementIndex: gelezen.elementIndex };
}

export function maakTuplet(partituur, id, tupletId) {
  const tuplet = TUPLETS.find((item) => item.id === tupletId);
  if (!tuplet) throw new Error(`Onbekende tuplet: ${tupletId}`);
  const kopie = structuredClone(partituur);
  const plaats = zoekMaatEnElement(kopie, id);
  if (!plaats || !['noot', 'rust'].includes(plaats.element.soort)
    || plaats.element.tuplet || !(plaats.element.duur > 0)) {
    return kopie;
  }

  const { maat, element, elementIndex } = plaats;
  const { aantal, normaal } = tuplet;
  const basis = Math.floor(element.duur / aantal);
  if (basis < KLEINSTE_DUUR) {
    throw new Error(`Een ${tupletId} is hier niet mogelijk: de noten zouden korter worden dan een 64e.`);
  }
  const rest = element.duur - basis * aantal;
  let start = element.start;
  const delen = Array.from({ length: aantal }, (_, positie) => {
    const deel = structuredClone(element);
    deel.start = start;
    deel.duur = basis + (positie < rest ? 1 : 0);
    start += deel.duur;
    deel.tuplet = { aantal, normaal, begin: positie === 0, eind: positie === aantal - 1 };
    if (positie > 0) delete deel.plek;
    return deel;
  });
  maat.elementen.splice(elementIndex, 1, ...delen);
  maat.elementen.sort((eerste, tweede) => (
    eerste.start - tweede.start || (eerste.stem ?? 0) - (tweede.stem ?? 0)
  ));
  return kopie;
}
