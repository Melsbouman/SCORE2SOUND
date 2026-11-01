export function maatIndexVanNummer(maten, tekst) {
  const nummer = tekst.trim();
  const plek = maten.findIndex((maat) => maat.nummer === nummer);
  if (plek !== -1) return plek;

  const getal = Number(tekst);
  if (!Number.isFinite(getal)) return 0;
  return Math.min(Math.max(0, getal - 1), Math.max(0, maten.length - 1));
}

// De maten in de volgorde waarin ze klinken, met herhaalstrepen. Een herhaling zonder beginstreep gaat terug naar het begin
// of naar het einde van de vorige herhaling.
export function speelVolgorde(maten) {
  const volgorde = [];
  let begin = 0;
  maten.forEach((maat, index) => {
    if (maat.herhaling?.begin) begin = index;
    volgorde.push(index);
    if (maat.herhaling?.eind) {
      for (let keer = 1; keer < (maat.herhaling.keer ?? 2); keer += 1) {
        for (let plek = begin; plek <= index; plek += 1) volgorde.push(plek);
      }
      begin = index + 1;
    }
  });
  return volgorde;
}

// De partituur zoals hij klinkt: herhaalde maten staan er meer keer in, zonder herhaalstrepen.
export function uitgevouwen(partituur) {
  const volgorde = speelVolgorde(partituur.partijen[0]?.maten ?? []);
  return {
    ...partituur,
    partijen: partituur.partijen.map((partij) => ({
      ...partij,
      maten: volgorde.filter((index) => partij.maten[index]).map((index, plek) => ({
        ...partij.maten[index],
        index: plek,
        herhaling: { begin: false, eind: false, keer: 2 },
      })),
    })),
  };
}
