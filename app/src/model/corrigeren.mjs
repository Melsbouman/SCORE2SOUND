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
export function keurMaatGoed(partituur, partijId, maatIndex) {
  const kopie = structuredClone(partituur);
  const partij = kopie.partijen.find((item) => item.id === partijId);
  const maat = partij?.maten.find((item) => item.index === maatIndex);

  if (maat) {
    for (const element of maat.elementen) {
      if (element.soort === 'noot' || element.soort === 'rust') element.zekerheid = 1;
    }
  }

  return kopie;
}

export function kopieerMaat(partituur, partijId, vanIndex, naarIndex) {
  const partij = partituur.partijen.find((kandidaat) => kandidaat.id === partijId);
  const vanMaat = partij?.maten[vanIndex];
  const naarMaat = partij?.maten[naarIndex];
  if (!partij || !vanMaat || !naarMaat) return partituur;

  const nieuw = structuredClone(partituur);
  nieuw.partijen.find((kandidaat) => kandidaat.id === partijId).maten[naarIndex].elementen = structuredClone(vanMaat.elementen);
  return nieuw;
}

export function suggestieToonhoogte(partituur, id) {
  if (!leesId(id)) return null;

  const partij = partituur.partijen.find((kandidaat) => id.startsWith(`n-${kandidaat.id}-`));
  if (!partij) return null;

  const plaats = id.slice(`n-${partij.id}-`.length).match(/^(\d+)-(\d+)$/);
  if (!plaats) return null;

  const maatIndex = Number(plaats[1]);
  const elementIndex = Number(plaats[2]);
  const doel = partij.maten[maatIndex]?.elementen[elementIndex];
  if (doel?.soort !== 'noot') return null;

  const noten = partij.maten.flatMap((maat) => maat.elementen.filter((element) => element.soort === 'noot'));
  const index = noten.indexOf(doel);
  if (index < 0) return null;

  for (let i = index - 1; i >= 0; i -= 1) {
    if (noten[i].zekerheid >= 0.8) return structuredClone(noten[i].toonhoogte);
  }
  for (let i = index + 1; i < noten.length; i += 1) {
    if (noten[i].zekerheid >= 0.8) return structuredClone(noten[i].toonhoogte);
  }
  return null;
}

export function zetToonhoogte(partituur, id, toonhoogte) {
  const { kopie } = kopieMetPlaats(partituur, id);
  const element = zoekElement(kopie, id);
  if (element?.soort === 'noot') {
    element.toonhoogte = { ...toonhoogte };
    element.zekerheid = 1;
  }
  return kopie;
}
export function verschuifHalvetoon(partituur, id, richting) {
  const { kopie } = kopieMetPlaats(partituur, id);
  const element = zoekElement(kopie, id);
  if (!element || element.soort !== 'noot') return kopie;

  const tonen = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const { stap, alter, octaaf: oudOctaaf } = element.toonhoogte;
  const midi = (oudOctaaf + 1) * 12 + tonen[stap] + alter;
  const nieuw = midi + richting;
  const pc = ((nieuw % 12) + 12) % 12;
  const octaaf = Math.floor(nieuw / 12) - 1;
  const namen = richting === 1
    ? [['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0], ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0]]
    : [['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0], ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0]];
  const [nieuweStap, nieuweAlter] = namen[pc];
  element.toonhoogte = { stap: nieuweStap, alter: nieuweAlter, octaaf };
  return kopie;
}
export function nootBijLetter(partituur, id, letter) {
  const kopie = structuredClone(partituur);
  const stap = typeof letter === 'string' ? letter.toUpperCase() : '';
  const tonen = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  if (!(stap in tonen)) return kopie;

  const delen = id.match(/^n-(.+)-(\d+)-(\d+)$/);
  if (!delen) return kopie;
  const partijIndex = kopie.partijen.findIndex((partij) => partij.id === delen[1]);
  const maatIndex = Number(delen[2]);
  const elementIndex = Number(delen[3]);
  const partij = kopie.partijen[partijIndex];
  const element = partij?.maten[maatIndex]?.elementen[elementIndex];
  if (!element || (element.soort !== 'noot' && element.soort !== 'rust')) return kopie;

  let referentieMidi = 72;
  let referentieOctaaf = 5;
  let heeftReferentie = false;
  if (element.soort === 'noot') {
    heeftReferentie = true;
    referentieOctaaf = element.toonhoogte.octaaf;
    referentieMidi = (referentieOctaaf + 1) * 12 + tonen[element.toonhoogte.stap] + element.toonhoogte.alter;
  } else {
    let vorigeNoot = null;
    for (let vorigeMaat = maatIndex; vorigeMaat >= 0 && !vorigeNoot; vorigeMaat -= 1) {
      const elementen = partij.maten[vorigeMaat].elementen;
      const begin = vorigeMaat === maatIndex ? elementIndex - 1 : elementen.length - 1;
      for (let vorigElement = begin; vorigElement >= 0; vorigElement -= 1) {
        if (elementen[vorigElement].soort === 'noot') {
          vorigeNoot = elementen[vorigElement];
          break;
        }
      }
    }
    if (vorigeNoot) {
      heeftReferentie = true;
      referentieOctaaf = vorigeNoot.toonhoogte.octaaf;
      referentieMidi = (referentieOctaaf + 1) * 12 + tonen[vorigeNoot.toonhoogte.stap] + vorigeNoot.toonhoogte.alter;
    }
  }

  const octaaf = heeftReferentie
    ? [referentieOctaaf - 1, referentieOctaaf, referentieOctaaf + 1].reduce((beste, kandidaat) => {
      const afstand = Math.abs((kandidaat + 1) * 12 + tonen[stap] - referentieMidi);
      const besteAfstand = Math.abs((beste + 1) * 12 + tonen[stap] - referentieMidi);
      return afstand < besteAfstand ? kandidaat : beste;
    })
    : 5;
  const toonhoogte = { stap, alter: 0, octaaf };

  partij.maten[maatIndex].elementen[elementIndex] = element.soort === 'noot'
    ? { ...element, toonhoogte, zekerheid: 1 }
    : {
      soort: 'noot', start: element.start, duur: element.duur, stem: element.stem, notenbalk: element.notenbalk,
      ...(element.plek === undefined ? {} : { plek: element.plek }),
      toonhoogte, akkoord: false,
      overbinding: { begin: false, eind: false }, articulaties: [],
      legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
    };
  return kopie;
}


export function kopieerMaten(partituur, vanBegin, vanEinde, naarBegin) {
  const aantalMaten = Math.max(0, ...partituur.partijen.map((partij) => partij.maten.length));
  if (vanBegin < 0 || vanBegin > vanEinde || vanEinde >= aantalMaten || naarBegin < 0 || naarBegin >= aantalMaten) {
    return partituur;
  }

  const bronnen = partituur.partijen.map((partij) => partij.maten
    .slice(vanBegin, vanEinde + 1)
    .map((maat) => maat.elementen));
  const resultaat = structuredClone(partituur);
  for (let partijIndex = 0; partijIndex < resultaat.partijen.length; partijIndex += 1) {
    const partij = resultaat.partijen[partijIndex];
    for (let i = 0; i <= vanEinde - vanBegin; i += 1) {
      if (!partij.maten[naarBegin + i]) break;
      if (bronnen[partijIndex][i]) {
        partij.maten[naarBegin + i].elementen = structuredClone(bronnen[partijIndex][i]);
      }
    }
  }
  return resultaat;
}

export function voegAanwijzingToe(partituur, partijId, maatIndex, start, type, waarde) {
  const partij = partituur.partijen.find((kandidaat) => kandidaat.id === partijId);
  const maat = partij?.maten[maatIndex];
  if (!maat) return partituur;

  const nieuw = structuredClone(partituur);
  const elementen = nieuw.partijen.find((kandidaat) => kandidaat.id === partijId).maten[maatIndex].elementen;
  const index = elementen.findIndex((element) => element.start >= start);
  elementen.splice(index < 0 ? elementen.length : index, 0, {
    soort: 'aanwijzing', start, type, waarde, zekerheid: 1,
  });
  return nieuw;
}

export function verwijderAanwijzing(partituur, id) {
  const plaats = zoekPlaats(partituur, id);
  if (!plaats || plaats.element.soort !== 'aanwijzing') return partituur;

  const nieuw = structuredClone(partituur);
  nieuw.partijen.find((partij) => partij.id === plaats.partijId)
    .maten[plaats.maatIndex].elementen.splice(plaats.elementIndex, 1);
  return nieuw;
}

export function voegHaakToe(partituur, partijId, vanMaat, vanStart, totMaat, totStart, soort) {
  if (soort !== 'crescendo' && soort !== 'decrescendo') return partituur;
  const partij = partituur.partijen.find((p) => p.id === partijId);
  if (!partij || !partij.maten[vanMaat] || !partij.maten[totMaat]) return partituur;
  if (totMaat < vanMaat || (totMaat === vanMaat && totStart < vanStart)) return partituur;
  const metBegin = voegAanwijzingToe(partituur, partijId, vanMaat, vanStart, soort, 'begin');
  return voegAanwijzingToe(metBegin, partijId, totMaat, totStart, soort, 'eind');
}
