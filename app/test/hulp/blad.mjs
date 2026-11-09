// Kunstmatige bladen voor de tests van de herkenning: notenbalken op een bekende plek, met nootkoppen, stokken, maatstrepen,
// scheefstand, ruis en ongelijke belichting. Zo weet de test precies wat het goede antwoord is.
// Geeft { beeld: { breedte, hoogte, pixels } (grijs, 0 = zwart), verwacht: { balken: [{ lijnen: [{ a, b }], links, rechts }] } }.

function willekeur(zaad) {
  let staat = zaad >>> 0;
  return () => {
    staat = (staat + 0x6d2b79f5) >>> 0;
    let t = staat;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function maakBlad({
  breedte = 1200, hoogte = 1500, balken = 5, lijnafstand = 20, lijndikte = 2, helling = 0, links = 100, rechts = 1100,
  boven = 150, afstandBalken = 220, koppen = true, maatstrepen = true, ruis = 0, achtergrond = 255, inkt = 0, verloop = 0,
  zaad = 1,
} = {}) {
  const kans = willekeur(zaad);
  const inktLaag = new Uint8Array(breedte * hoogte);
  const zet = (x, y) => {
    const px = Math.round(x);
    const py = Math.round(y);
    if (px >= 0 && px < breedte && py >= 0 && py < hoogte) inktLaag[py * breedte + px] = 1;
  };
  const midden = (breedte - 1) / 2;
  const verwacht = { balken: [] };
  for (let s = 0; s < balken; s += 1) {
    const lijnen = [];
    for (let l = 0; l < 5; l += 1) {
      const y0 = boven + s * afstandBalken + l * lijnafstand;
      // Het midden van de lijn ligt op y0 bij x = midden; de lijn is lijndikte pixels dik.
      const a = y0 - helling * midden;
      lijnen.push({ a, b: helling });
      for (let x = links; x <= rechts; x += 1) {
        const y = a + helling * x;
        for (let d = 0; d < lijndikte; d += 1) zet(x, y - (lijndikte - 1) / 2 + d);
      }
    }
    verwacht.balken.push({ lijnen, links, rechts });
    const yOp = (x, stap) => lijnen[0].a + helling * x + (stap * lijnafstand) / 2;
    if (maatstrepen) {
      for (const x of [links, links + (rechts - links) / 3, links + (2 * (rechts - links)) / 3, rechts]) {
        for (let y = yOp(x, 0); y <= yOp(x, 8); y += 0.5) zet(x, y);
        zet(x + 1, yOp(x, 4));
      }
    }
    if (koppen) {
      for (let x = links + 60; x < rechts - 40; x += 55) {
        if (Math.abs(x - (links + (rechts - links) / 3)) < 20 || Math.abs(x - (links + (2 * (rechts - links)) / 3)) < 20) continue;
        const stap = Math.floor(kans() * 9);
        const cx = x;
        const cy = yOp(x, stap);
        const rx = lijnafstand * 0.65;
        const ry = lijnafstand * 0.45;
        for (let dy = -ry; dy <= ry; dy += 0.5) {
          for (let dx = -rx; dx <= rx; dx += 0.5) {
            if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) zet(cx + dx, cy + dy);
          }
        }
        // Stok omhoog aan de rechterkant, 3,5 lijnafstand lang.
        for (let y = cy; y >= cy - lijnafstand * 3.5; y -= 0.5) {
          zet(cx + rx - 1, y);
          zet(cx + rx, y);
        }
      }
    }
  }
  const pixels = new Uint8Array(breedte * hoogte);
  for (let y = 0; y < hoogte; y += 1) {
    for (let x = 0; x < breedte; x += 1) {
      // Ongelijke belichting: het papier wordt naar rechts toe donkerder (verloop 0..1).
      const papier = achtergrond - verloop * 120 * (x / breedte);
      let waarde = inktLaag[y * breedte + x] ? inkt : papier;
      if (ruis && kans() < ruis) waarde = waarde > 127 ? inkt : papier;
      pixels[y * breedte + x] = Math.max(0, Math.min(255, Math.round(waarde)));
    }
  }
  return { beeld: { breedte, hoogte, pixels }, verwacht };
}
