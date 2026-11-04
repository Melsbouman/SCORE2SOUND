// Audiveris telt een samengestelde rust (bijvoorbeeld 6 maten rust) als één stapel (maat op het blad), de MusicXML heeft er zes maten voor.
// Deze kaart zet het nummer van een stapel om in de index van de maat in de partij.
export function stapelKaart(maten) {
  const kaart = [];
  for (let index = 0; index < maten.length;) {
    kaart.push(index);
    index += maten[index].maatrust > 1 ? maten[index].maatrust : 1;
  }
  return kaart;
}

export function aantalUitSamengesteldeRust(maat) {
  const heeftHeleMaatrust = maat.elementen.some((element) => element.soort === 'rust' && element.heleMaat);
  if (!heeftHeleMaatrust || maat.elementen.some((element) => element.soort === 'noot')) return null;
  const cijfer = maat.elementen.find((element) => (
    element.soort === 'aanwijzing'
    && element.type === 'letter'
    && /^\d+$/.test(String(element.waarde ?? '').trim())
  ));
  const aantal = Number(String(cijfer?.waarde ?? '').trim());
  return Number.isInteger(aantal) && aantal > 1 && aantal <= 40 ? aantal : null;
}

export function verwijderDubbeleSleutels(partituur) {
  for (const partij of partituur.partijen ?? []) {
    const geldendeSleutels = new Map();
    for (let index = 0; index < partij.maten.length; index += 1) {
      const maat = partij.maten[index];
      const naSamengesteldeRust = index > 0 && aantalUitSamengesteldeRust(partij.maten[index - 1]) !== null;
      maat.sleutels = (maat.sleutels ?? []).filter((sleutel) => {
        const notenbalk = sleutel.notenbalk ?? 1;
        const geldende = geldendeSleutels.get(notenbalk);
        if (naSamengesteldeRust && geldende?.teken === sleutel.teken && geldende?.lijn === sleutel.lijn) return false;
        geldendeSleutels.set(notenbalk, sleutel);
        return true;
      });
    }
  }
  return partituur;
}
