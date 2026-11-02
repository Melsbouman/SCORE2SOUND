function heeftNoten(maat) {
  return maat?.noten?.some((noot) => !noot.rust) ?? false;
}

function heeftEenNotenbalk(partij) {
  const sleutels = partij.maten.flatMap((maat) => maat.sleutels ?? []);
  return sleutels.every((sleutel) => (sleutel.notenbalk ?? 1) === 1);
}

function isAlgemeneNaam(naam, eersteNaam) {
  const waarde = (naam ?? '').trim();
  return waarde === ''
    || waarde === 'Voice'
    || /^Partij\s+\d+$/.test(waarde)
    || waarde === (eersteNaam ?? '').trim();
}

export function voegSplitsingenSamen(partituur) {
  const partijen = partituur.partijen ?? [];
  if (partijen.length < 2) return { partituur, samengevoegd: 0 };

  const aantalMaten = partijen[0].maten?.length;
  const eersteNaam = partijen[0].naam;
  const geschikt = partijen.every((partij) =>
    partij.maten?.length === aantalMaten
    && heeftEenNotenbalk(partij)
    && isAlgemeneNaam(partij.naam, eersteNaam));
  if (!geschikt) return { partituur, samengevoegd: 0 };

  const maten = [];
  for (let index = 0; index < aantalMaten; index += 1) {
    const metNoten = partijen.filter((partij) => heeftNoten(partij.maten[index]));
    if (metNoten.length > 1) return { partituur, samengevoegd: 0 };
    maten.push(metNoten[0]?.maten[index] ?? partijen[0].maten[index]);
  }

  const eerste = partijen[0];
  const partij = {
    ...eerste,
    maten: maten.map((maat, index) => ({
      ...maat,
      nummer: index + 1,
      index,
    })),
  };
  return {
    partituur: { ...partituur, partijen: [partij] },
    samengevoegd: partijen.length - 1,
  };
}
