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
  zaad = 1, hulplijnNoten = 0, extraLijn = null, streepDikte = 2, strepen = null, langeStokken = 0, eindstreep = false, bogen = false,
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
    // Een dunne extra lijn (zoals een tekstregel of een stuk van een boog) op dy pixels onder de bovenste lijn.
    if (extraLijn) {
      for (let x = extraLijn.van ?? links; x <= (extraLijn.tot ?? rechts); x += 1) zet(x, lijnen[0].a + helling * x + extraLijn.dy);
    }
    // Noten op de tweede hulplijn boven de balk, met de eerste hulplijn erbij (1,6 lijnafstand breed), elke 120 pixels.
    for (let n = 0; n < hulplijnNoten; n += 1) {
      const x = links + 60 + n * 120;
      if (x > rechts - 60) break;
      for (const stap of [1, 2]) {
        const y = lijnen[0].a + helling * x - stap * lijnafstand;
        for (let dx = -0.8 * lijnafstand; dx <= 0.8 * lijnafstand; dx += 1) for (let d = 0; d < lijndikte; d += 1) zet(x + dx, y - (lijndikte - 1) / 2 + d);
      }
      const cy = lijnen[0].a + helling * x - 2 * lijnafstand;
      for (let dy = -lijnafstand * 0.45; dy <= lijnafstand * 0.45; dy += 0.5) {
        for (let dx = -lijnafstand * 0.65; dx <= lijnafstand * 0.65; dx += 0.5) {
          if ((dx * dx) / (0.4225 * lijnafstand * lijnafstand) + (dy * dy) / (0.2025 * lijnafstand * lijnafstand) <= 1) zet(x + dx, cy + dy);
        }
      }
    }
    const yOp = (x, stap) => lijnen[0].a + helling * x + (stap * lijnafstand) / 2;
    // Maatstrepen: standaard aan het begin, op een derde, op twee derde en aan het eind van de balk; `strepen` geeft eigen
    // plekken (als deel van de breedte). Met eindstreep staat aan het eind een dunne en een dikke streep.
    verwacht.balken.at(-1).strepen = [];
    if (maatstrepen) {
      const delen = strepen ?? [0, 1 / 3, 2 / 3, 1];
      for (const deel of delen) {
        const x0 = Math.round(links + deel * (rechts - links));
        const laatste = deel === delen.at(-1) && eindstreep;
        const stukken = laatste ? [[x0 - Math.round(lijnafstand * 0.9), streepDikte], [x0 - Math.round(lijnafstand * 0.5), Math.round(lijnafstand * 0.5)]] : [[x0, streepDikte]];
        for (const [xs, w] of stukken) {
          for (let x = xs; x < xs + w; x += 1) for (let y = yOp(x, 0) - lijndikte / 2; y <= yOp(x, 8) + lijndikte / 2; y += 0.5) zet(x, y);
        }
        verwacht.balken.at(-1).strepen.push({ x: laatste ? x0 - Math.round(lijnafstand * 0.5) : x0 + (streepDikte - 1) / 2, soort: laatste ? 'eind' : 'enkel' });
      }
    }
    // Een rij overbindingen vlak boven de balk (zoals hele noten die over de maatstreep doorklinken): bogen van 100 pixels met
    // gaten ertussen, op ongeveer 0,7 lijnafstand boven de bovenste lijn.
    if (bogen) {
      for (let x0 = links + 80; x0 + 100 < rechts; x0 += 120) {
        // Een vlakke boog (hele noten die doorklinken) op een lijnafstand boven de bovenste lijn.
        for (let x = x0; x <= x0 + 100; x += 0.5) {
          const t = (x - x0) / 100;
          const y = lijnen[0].a + helling * x - lijnafstand - 4 * t * (1 - t) * 1.5;
          for (let d = 0; d < lijndikte; d += 1) zet(x, y - (lijndikte - 1) / 2 + d);
        }
        // Een hele noot op de onderste lijn (die onderbreekt die lijn), onder het begin van de boog.
        const cx = x0 - 10;
        const cy = lijnen[4].a + helling * cx;
        for (let dy = -lijnafstand * 0.45; dy <= lijnafstand * 0.45; dy += 0.5) {
          for (let dx = -lijnafstand * 0.8; dx <= lijnafstand * 0.8; dx += 0.5) {
            const r = (dx * dx) / (0.64 * lijnafstand * lijnafstand) + (dy * dy) / (0.2025 * lijnafstand * lijnafstand);
            if (r <= 1 && r >= 0.35) zet(cx + dx, cy + dy);
          }
        }
      }
    }
    // Lange stokken dwars door de hele balk (een nootkop ver onder de balk, de stok tot boven de balk, zoals bij een balk van
    // achtsten): dat zijn geen maatstrepen.
    for (let n = 0; n < langeStokken; n += 1) {
      const x = links + 90 + n * 170;
      if (x > rechts - 60) break;
      const kop = yOp(x, 14);
      for (let dy = -lijnafstand * 0.45; dy <= lijnafstand * 0.45; dy += 0.5) {
        for (let dx = -lijnafstand * 0.65; dx <= lijnafstand * 0.65; dx += 0.5) {
          if ((dx * dx) / (0.4225 * lijnafstand * lijnafstand) + (dy * dy) / (0.2025 * lijnafstand * lijnafstand) <= 1) zet(x + dx, kop + dy);
        }
      }
      for (let y = kop; y >= yOp(x, -3); y -= 0.5) { zet(x + lijnafstand * 0.65 - 1, y); zet(x + lijnafstand * 0.65, y); }
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
