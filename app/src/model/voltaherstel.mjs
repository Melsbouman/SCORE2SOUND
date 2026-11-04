export function vulVoltas(partituur) {
  const uit = structuredClone(partituur);

  for (const partij of uit.partijen) {
    const maten = partij.maten;
    for (let i = 0; i < maten.length - 1; i += 1) {
      const eerste = maten[i];
      const tweede = maten[i + 1];
      const daarna = maten[i + 2];
      const begintMetLetter = daarna?.elementen?.some(
        (element) => element.type === 'letter' && element.start === 0,
      );

      if (eerste.herhaling?.eind !== true
        || eerste.volta
        || tweede.herhaling?.eind === true
        || tweede.volta
        || (daarna && !begintMetLetter)) {
        continue;
      }

      eerste.volta = { nummers: [1], begin: true, eind: true };
      tweede.volta = { nummers: [2], begin: true, eind: true };
    }
  }

  return uit;
}
