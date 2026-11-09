// Hulplijnen: de stap na de nootkoppen in de herkenning.
// Een hulplijn is een kort lijntje boven of onder de notenbalk bij een noot die daar buiten staat.
// Raakt een voorteken (een kruis of mol) zo'n hulplijn, dan is het één vorm met de lijn en wordt het gemist.
//
// Een zwart-witbeeld is { breedte, hoogte, pixels } met 1 = zwart en 0 = wit.
// - verwijderHulplijnen haalt de dunne hulplijnstukken rond nootkoppen buiten de balk weg
//   en laat staan wat langer is (de kop zelf, stokken, strepen van een voorteken).
// Het beeld dat erin gaat blijft ongewijzigd: er wordt op een kopie gewerkt.
// Alleen Uint8Array en gewone JavaScript: het draait ook in de browser.

export function verwijderHulplijnen(kaal, raster, schaal, koppen) {
  const { breedte, hoogte } = kaal;
  const pixels = Uint8Array.from(kaal.pixels);
  const ia = schaal.lijnafstand;
  const maxDikte = Math.max(schaal.lijndikteMax + 1, Math.round(schaal.lijndikte * 1.8));
  const ruimte = Math.max(1, Math.ceil(schaal.lijndikte));
  for (let b = 0; b < raster.balken.length; b += 1) {
    const balk = raster.balken[b];
    const lijn = balk.lijnen[0];
    for (const kop of koppen[b] ?? []) {
      const stappen = [];
      if (kop.stap <= -2) {
        for (let s = -2; s >= Math.ceil(kop.stap / 2) * 2; s -= 2) stappen.push(s);
      } else if (kop.stap >= 10) {
        for (let s = 10; s <= Math.floor(kop.stap / 2) * 2; s += 2) stappen.push(s);
      }
      const van = Math.max(0, Math.round(kop.x - ia * 1.6));
      const tot = Math.min(breedte - 1, Math.round(kop.x + ia * 1.6));
      for (const stap of stappen) {
        for (let x = van; x <= tot; x += 1) {
          const yc = Math.round(lijn.a + lijn.b * x + (stap * ia) / 2);
          const y0 = Math.max(0, yc - ruimte);
          const y1 = Math.min(hoogte - 1, yc + ruimte);
          let start = -1;
          for (let y = y0; y <= y1; y += 1) {
            if (pixels[y * breedte + x] === 1) { start = y; break; }
          }
          if (start < 0) continue;
          let boven = start;
          while (boven > 0 && pixels[(boven - 1) * breedte + x] === 1) boven -= 1;
          let onder = start;
          while (onder < hoogte - 1 && pixels[(onder + 1) * breedte + x] === 1) onder += 1;
          if (onder - boven + 1 <= maxDikte) {
            for (let y = boven; y <= onder; y += 1) pixels[y * breedte + x] = 0;
          }
        }
      }
    }
  }
  return { breedte, hoogte, pixels };
}
