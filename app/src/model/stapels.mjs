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
