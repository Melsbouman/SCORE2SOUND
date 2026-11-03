import { leesId } from './corrigeren.mjs';

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

export function maakTriool(partituur, id) {
  const kopie = structuredClone(partituur);
  const plaats = zoekMaatEnElement(kopie, id);
  if (!plaats || !['noot', 'rust'].includes(plaats.element.soort)
    || plaats.element.tuplet || plaats.element.duur <= 0 || plaats.element.duur % 3 !== 0) {
    return kopie;
  }

  const { maat, element, elementIndex } = plaats;
  const duur = element.duur / 3;
  const triool = [0, 1, 2].map((positie) => {
    const deel = structuredClone(element);
    deel.start = element.start + positie * duur;
    deel.duur = duur;
    deel.tuplet = { aantal: 3, normaal: 2, begin: positie === 0, eind: positie === 2 };
    if (positie > 0) delete deel.plek;
    return deel;
  });
  maat.elementen.splice(elementIndex, 1, ...triool);
  maat.elementen.sort((eerste, tweede) => (
    eerste.start - tweede.start || (eerste.stem ?? 0) - (tweede.stem ?? 0)
  ));
  return kopie;
}

export function maakTriooLos(partituur, id) {
  const kopie = structuredClone(partituur);
  const plaats = zoekMaatEnElement(kopie, id);
  if (!plaats || !['noot', 'rust'].includes(plaats.element.soort)) return kopie;

  const { maat, element, elementIndex } = plaats;
  const tuplet = element.tuplet;
  if (tuplet?.aantal !== 3 || tuplet.normaal !== 2) return kopie;
  const delen = maat.elementen
    .map((deel, index) => ({ deel, index }))
    .filter(({ deel }) => (
      ['noot', 'rust'].includes(deel.soort)
      && deel.soort === element.soort
      && deel.stem === element.stem
      && deel.notenbalk === element.notenbalk
      && deel.tuplet?.aantal === 3
      && deel.tuplet?.normaal === 2
    ));
  const gekozenIndex = delen.findIndex(({ index }) => index === elementIndex);
  if (gekozenIndex === -1) return kopie;
  let begin = gekozenIndex;
  while (begin >= 0 && !delen[begin].deel.tuplet.begin) begin -= 1;
  let eind = gekozenIndex;
  while (eind < delen.length && !delen[eind].deel.tuplet.eind) eind += 1;
  if (begin < 0 || eind === delen.length) return kopie;
  const groep = delen.slice(begin, eind + 1);
  if (groep.length !== 3 || groep[0].deel.start + groep[0].deel.duur !== groep[1].deel.start
    || groep[1].deel.start + groep[1].deel.duur !== groep[2].deel.start
    || !groep[0].deel.tuplet.begin || !groep[2].deel.tuplet.eind) return kopie;

  const oorspronkelijk = structuredClone(groep[0].deel);
  oorspronkelijk.duur = groep.reduce((som, deel) => som + deel.deel.duur, 0);
  delete oorspronkelijk.tuplet;
  maat.elementen[groep[0].index] = oorspronkelijk;
  for (const { index } of groep.slice(1).reverse()) maat.elementen.splice(index, 1);
  maat.elementen.sort((eerste, tweede) => (
    eerste.start - tweede.start || (eerste.stem ?? 0) - (tweede.stem ?? 0)
  ));
  return kopie;
}

export const maakTrioolLos = maakTriooLos;
