const TEMPOWOORDEN = new Map([
  ['vivace', 160],
  ['allegro', 120],
  ['andante', 76],
  ['moderato', 100],
  ['adagio', 66],
  ['presto', 180],
  ['largo', 50],
  ['lento', 56],
  ['allegretto', 108],
  ['larghetto', 60],
  ['andantino', 84],
  ['maestoso', 80],
]);

export function tempoVoorWoord(woord) {
  return TEMPOWOORDEN.get(woord.toLocaleLowerCase('nl')) ?? null;
}

export function tempoUitTekst(partituur) {
  const nieuw = structuredClone(partituur);
  const tempowoorden = new Map([
    ['vivace', 140],
    ['allegro', 120],
    ['andante', 76],
    ['moderato', 108],
    ['adagio', 66],
    ['allegretto', 108],
    ['larghetto', 60],
    ['andantino', 84],
    ['maestoso', 80],
  ]);
  const patroon = /\(?\s*(?:[♩J]|𝅘𝅥)(\.?)\s*=\s*(?:c\.?|0\.)?\s*(\d{2,3})\s*\)?/;

  const losGetalPatroon = /^\s*(?:q|\u2669|J)?(\.?)\s*=\s*(\d{2,3})\s*$/i;

  for (const partij of nieuw.partijen) {
    for (const [maatIndex, maat] of partij.maten.entries()) {
      const elementen = [];
      for (const element of maat.elementen) {
        if (element.soort !== 'aanwijzing' || element.type !== 'tekst' || typeof element.waarde !== 'string') {
          elementen.push(element);
          continue;
        }

        const woordtempo = tempowoorden.get(element.waarde.trim().toLocaleLowerCase('nl'));
        if (woordtempo != null && maat.tempo == null) {
          elementen.push({
            soort: 'aanwijzing',
            start: element.start,
            type: 'tempo',
            waarde: woordtempo,
            zekerheid: 1,
          });
          if (element.start === 0) maat.tempo = woordtempo;
          continue;
        }

        const overeenkomst = element.waarde.match(patroon)
          ?? (maatIndex === 0 ? element.waarde.match(losGetalPatroon) : null);
        if (!overeenkomst) {
          elementen.push(element);
          continue;
        }

        const n = Number(overeenkomst[2]);
        if (n < 30 || n > 300) {
          elementen.push(element);
          continue;
        }

        const punt = Boolean(overeenkomst[1]);
        const bpm = Math.round(punt ? n * 1.5 : n);
        const waarde = `${element.waarde.slice(0, overeenkomst.index)} ${element.waarde.slice(overeenkomst.index + overeenkomst[0].length)}`
          .replace(/\s+/g, ' ')
          .trim();

        if (waarde) elementen.push({ ...element, waarde });

        if (maat.tempo == null) {
          elementen.push({
            soort: 'aanwijzing',
            start: element.start,
            type: 'tempo',
            waarde: bpm,
            getoond: { eenheid: 'quarter', punt, getal: n },
            zekerheid: 1,
          });
          if (element.start === 0) maat.tempo = bpm;
        }
      }
      maat.elementen = elementen;
    }
  }

  return nieuw;
}
