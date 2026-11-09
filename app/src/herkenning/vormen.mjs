// Vormen: de stap na GRID in de herkenning.
// Naar het voorbeeld van de werkwijze van Audiveris (eerst de notenbalklijnen weghalen,
// dan de losse vormen zoeken), maar in eigen code.
//
// Een zwart-witbeeld is { breedte, hoogte, pixels } met 1 = zwart en 0 = wit.
// - verwijderLijnen haalt kale lijnstukken weg en laat staan wat een lijn kruist
//   (nootkoppen, stokken), zodat die symbolen niet beschadigd raken.
// - vindVormen zoekt de losse vormen (8 buren) met hun kader, zonder recursie.
// Alleen Uint8Array/Int32Array en gewone JavaScript: het draait ook in de browser.

export function verwijderLijnen(zw, raster, schaal) {
  const { breedte, hoogte } = zw;
  const pixels = Uint8Array.from(zw.pixels);
  const maxDikte = Math.max(schaal.lijndikteMax + 1, Math.round(schaal.lijndikte * 1.8));
  const ruimte = Math.max(1, Math.ceil(schaal.lijndikte));
  for (const balk of raster.balken) {
    for (const lijn of balk.lijnen) {
      const van = Math.max(0, lijn.links - 2);
      const tot = Math.min(breedte - 1, lijn.rechts + 2);
      for (let x = van; x <= tot; x += 1) {
        const yc = Math.round(lijn.a + lijn.b * x);
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
  return { breedte, hoogte, pixels };
}

export function vindVormen(zw, { minPixels = 1 } = {}) {
  const { breedte, hoogte, pixels } = zw;
  const n = breedte * hoogte;
  const labels = new Int32Array(n);
  const ouder = new Int32Array(Math.ceil(breedte / 2) * Math.ceil(hoogte / 2) + 2);
  let aantal = 0;
  const vind = (a) => {
    let wortel = a;
    while (ouder[wortel] !== wortel) wortel = ouder[wortel];
    while (ouder[a] !== wortel) { const volgende = ouder[a]; ouder[a] = wortel; a = volgende; }
    return wortel;
  };
  const verenig = (a, b) => {
    const ra = vind(a);
    const rb = vind(b);
    if (ra === rb) return;
    if (ra < rb) ouder[rb] = ra; else ouder[ra] = rb;
  };
  for (let y = 0; y < hoogte; y += 1) {
    for (let x = 0; x < breedte; x += 1) {
      const i = y * breedte + x;
      if (pixels[i] !== 1) continue;
      let label = 0;
      const buren = [];
      if (x > 0 && labels[i - 1]) buren.push(labels[i - 1]);
      if (y > 0) {
        const o = i - breedte;
        if (x > 0 && labels[o - 1]) buren.push(labels[o - 1]);
        if (labels[o]) buren.push(labels[o]);
        if (x < breedte - 1 && labels[o + 1]) buren.push(labels[o + 1]);
      }
      if (buren.length === 0) {
        aantal += 1;
        ouder[aantal] = aantal;
        label = aantal;
      } else {
        label = buren[0];
        for (let k = 1; k < buren.length; k += 1) verenig(label, buren[k]);
      }
      labels[i] = label;
    }
  }
  const gegevens = new Map();
  for (let y = 0; y < hoogte; y += 1) {
    for (let x = 0; x < breedte; x += 1) {
      const i = y * breedte + x;
      if (!labels[i]) continue;
      const wortel = vind(labels[i]);
      labels[i] = wortel;
      let vorm = gegevens.get(wortel);
      if (!vorm) {
        vorm = { id: 0, links: x, rechts: x, boven: y, onder: y, pixels: 0 };
        gegevens.set(wortel, vorm);
      }
      if (x < vorm.links) vorm.links = x;
      if (x > vorm.rechts) vorm.rechts = x;
      if (y < vorm.boven) vorm.boven = y;
      if (y > vorm.onder) vorm.onder = y;
      vorm.pixels += 1;
    }
  }
  const vormen = [...gegevens.entries()]
    .filter(([, vorm]) => vorm.pixels >= minPixels)
    .sort((p, q) => (p[1].links - q[1].links) || (p[1].boven - q[1].boven));
  const nieuw = new Map();
  vormen.forEach(([wortel, vorm], k) => { vorm.id = k + 1; nieuw.set(wortel, vorm.id); });
  for (let i = 0; i < n; i += 1) {
    if (labels[i]) labels[i] = nieuw.get(labels[i]) || 0;
  }
  return { labels, vormen: vormen.map(([, vorm]) => vorm) };
}
