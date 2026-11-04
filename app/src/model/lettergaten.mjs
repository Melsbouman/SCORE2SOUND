export function vulLetterGaten(partituur) {
  const resultaat = structuredClone(partituur);

  for (const partij of resultaat.partijen) {
    const letters = partij.maten.flatMap((maat, maatindex) =>
      maat.elementen
        .filter((element) => element.type === 'letter' && /^[A-Z]$/.test(element.waarde))
        .map((element) => ({ waarde: element.waarde, maatindex })),
    );

    for (let i = 1; i < letters.length; i += 1) {
      const vorige = letters[i - 1];
      const volgende = letters[i];
      const aantalOntbrekend = volgende.waarde.charCodeAt(0) - vorige.waarde.charCodeAt(0) - 1;
      const beschikbareMaten = volgende.maatindex - vorige.maatindex - 1;

      if (aantalOntbrekend < 1 || beschikbareMaten < aantalOntbrekend) continue;

      for (let j = 1; j <= aantalOntbrekend; j += 1) {
        const maatindex = vorige.maatindex + Math.round((j * (volgende.maatindex - vorige.maatindex)) / (aantalOntbrekend + 1));
        partij.maten[maatindex].elementen.unshift({
          soort: 'aanwijzing', start: 0, type: 'letter',
          waarde: String.fromCharCode(vorige.waarde.charCodeAt(0) + j), zekerheid: 0.3,
        });
      }
    }
  }

  return resultaat;
}
