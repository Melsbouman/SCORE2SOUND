export function leesId(id) {
  const delen = id.split('-');
  if (delen[0] !== 'n' || delen.length < 4) return null;
  const elementIndex = Number(delen.pop());
  const maatIndex = Number(delen.pop());
  const partijId = delen.slice(1).join('-');
  if (!partijId || !Number.isInteger(maatIndex) || !Number.isInteger(elementIndex)) return null;
  return { partijId, maatIndex, elementIndex };
}

function zoekPlaats(partituur, id) {
  const gelezen = leesId(id);
  if (!gelezen) return null;
  const partij = partituur.partijen.find((kandidaat) => kandidaat.id === gelezen.partijId);
  const maat = partij?.maten[gelezen.maatIndex];
  const element = maat?.elementen[gelezen.elementIndex];
  if (!element) return null;
  return { ...gelezen, maat, element };
}

export function zoekElement(partituur, id) {
  return zoekPlaats(partituur, id)?.element ?? null;
}

export function onzekereElementen(partituur) {
  const ids = [];
  const aantalMaten = Math.max(0, ...partituur.partijen.map((partij) => partij.maten.length));
  for (let maatIndex = 0; maatIndex < aantalMaten; maatIndex += 1) {
    for (const partij of partituur.partijen) {
      const maat = partij.maten[maatIndex];
      if (!maat) continue;
      maat.elementen.forEach((element, elementIndex) => {
        if ((element.soort === 'noot' || element.soort === 'rust') && element.zekerheid < 0.8) {
          ids.push(`n-${partij.id}-${maatIndex}-${elementIndex}`);
        }
      });
    }
  }
  return ids;
}

function kopieMetPlaats(partituur, id) {
  const kopie = structuredClone(partituur);
  return { kopie, plaats: zoekPlaats(kopie, id) };
}

export function verschuif(partituur, id, stappen) {
  const { kopie, plaats } = kopieMetPlaats(partituur, id);
  if (!plaats || plaats.element.soort !== 'noot') return kopie;
  const letters = 'CDEFGAB';
  let positie = letters.indexOf(plaats.element.toonhoogte.stap);
  let octaaf = plaats.element.toonhoogte.octaaf;
  const richting = Math.sign(stappen);
  for (let stap = 0; stap < Math.abs(stappen); stap += 1) {
    positie += richting;
    if (positie === letters.length) {
      positie = 0;
      octaaf += 1;
    } else if (positie === -1) {
      positie = letters.length - 1;
      octaaf -= 1;
    }
  }
  plaats.element.toonhoogte = { stap: letters[positie], alter: 0, octaaf };
  plaats.element.zekerheid = 1;
  return kopie;
}

export function zetAlter(partituur, id, alter) {
  const { kopie, plaats } = kopieMetPlaats(partituur, id);
  if (!plaats || plaats.element.soort !== 'noot') return kopie;
  plaats.element.toonhoogte.alter = alter;
  plaats.element.zekerheid = 1;
  return kopie;
}

export function zetDuur(partituur, id, duur) {
  const { kopie, plaats } = kopieMetPlaats(partituur, id);
  if (!plaats) return kopie;
  if (plaats.element.soort === 'noot') {
    for (const element of plaats.maat.elementen) {
      if (element.soort === 'noot' && element.start === plaats.element.start && element.stem === plaats.element.stem) {
        element.duur = duur;
      }
    }
  } else {
    plaats.element.duur = duur;
  }
  plaats.element.zekerheid = 1;
  return kopie;
}

export function maakRust(partituur, id) {
  const { kopie, plaats } = kopieMetPlaats(partituur, id);
  if (!plaats || plaats.element.soort !== 'noot') return kopie;
  const { element, maat, elementIndex } = plaats;
  const andereNoten = maat.elementen.filter((kandidaat, index) => (
    index !== elementIndex && kandidaat.soort === 'noot'
    && kandidaat.start === element.start && kandidaat.stem === element.stem
  ));
  if (andereNoten.length > 0) {
    maat.elementen.splice(elementIndex, 1);
    if (!andereNoten.some((noot) => noot.akkoord === false)) andereNoten[0].akkoord = false;
    return kopie;
  }
  maat.elementen[elementIndex] = {
    soort: 'rust', start: element.start, duur: element.duur, stem: element.stem,
    notenbalk: element.notenbalk, heleMaat: false, zekerheid: 1,
    ...(element.plek ? { plek: element.plek } : {}),
  };
  return kopie;
}

export function maakNoot(partituur, id, toonhoogte) {
  const { kopie, plaats } = kopieMetPlaats(partituur, id);
  if (!plaats || plaats.element.soort !== 'rust') return kopie;
  const { element } = plaats;
  plaats.maat.elementen[plaats.elementIndex] = {
    soort: 'noot', start: element.start, duur: element.duur, stem: element.stem,
    notenbalk: element.notenbalk, toonhoogte, akkoord: false,
    overbinding: { begin: false, eind: false }, articulaties: [],
    legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
    ...(element.plek ? { plek: element.plek } : {}),
  };
  return kopie;
}

export function keurGoed(partituur, id) {
  const { kopie, plaats } = kopieMetPlaats(partituur, id);
  if (plaats) plaats.element.zekerheid = 1;
  return kopie;
}
