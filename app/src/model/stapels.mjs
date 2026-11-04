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
