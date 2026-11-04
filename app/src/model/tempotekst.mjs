export function tempoUitTekst(partituur) {
  const nieuw = structuredClone(partituur);
  const patroon = /\(?\s*(?:[♩J]|𝅘𝅥)(\.?)\s*=\s*(\d{2,3})\s*\)?/;

  for (const partij of nieuw.partijen) {
    for (const maat of partij.maten) {
      const elementen = [];
      for (const element of maat.elementen) {
        if (element.soort !== 'aanwijzing' || element.type !== 'tekst' || typeof element.waarde !== 'string') {
          elementen.push(element);
          continue;
        }

        const overeenkomst = element.waarde.match(patroon);
        if (!overeenkomst) {
          elementen.push(element);
          continue;
        }

        const n = Number(overeenkomst[2]);
        if (n < 20 || n > 300) {
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
