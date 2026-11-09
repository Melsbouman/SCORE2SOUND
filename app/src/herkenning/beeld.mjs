// Herkenning, stap BINARY (naar het voorbeeld van de stappen van Audiveris): van een kleurenbeeld naar grijs en naar zwart-wit.
// Alleen Uint8Array en gewone JavaScript, zodat dit in de browser en in Node draait.
// Een grijsbeeld is { breedte, hoogte, pixels } met 0 = zwart en 255 = wit.
// Een zwart-witbeeld heeft dezelfde vorm, met 1 = zwart (inkt) en 0 = wit.

// RGBA (zoals canvas.getImageData geeft) naar grijs; doorzichtig telt als wit papier.
export function naarGrijs(rgba, breedte, hoogte) {
  const pixels = new Uint8Array(breedte * hoogte);
  for (let i = 0, j = 0; i < pixels.length; i += 1, j += 4) {
    const dekking = rgba[j + 3] / 255;
    const grijs = 0.299 * rgba[j] + 0.587 * rgba[j + 1] + 0.114 * rgba[j + 2];
    pixels[i] = Math.round(grijs * dekking + 255 * (1 - dekking));
  }
  return { breedte, hoogte, pixels };
}

// Otsu: de drempel die inkt en papier het best scheidt, voor het hele beeld (schone pdf's en goede scans).
export function otsuDrempel(pixels) {
  const histogram = new Float64Array(256);
  for (const waarde of pixels) histogram[waarde] += 1;
  const totaal = pixels.length;
  let somAlles = 0;
  for (let waarde = 0; waarde < 256; waarde += 1) somAlles += waarde * histogram[waarde];
  let somDonker = 0;
  let aantalDonker = 0;
  let beste = 0;
  let drempel = 127;
  for (let waarde = 0; waarde < 256; waarde += 1) {
    aantalDonker += histogram[waarde];
    if (aantalDonker === 0) continue;
    const aantalLicht = totaal - aantalDonker;
    if (aantalLicht === 0) break;
    somDonker += waarde * histogram[waarde];
    const verschil = somDonker / aantalDonker - (somAlles - somDonker) / aantalLicht;
    const spreiding = aantalDonker * aantalLicht * verschil * verschil;
    if (spreiding > beste) {
      beste = spreiding;
      drempel = waarde;
    }
  }
  return drempel;
}

// Sauvola: een drempel per pixel uit het gemiddelde en de spreiding in een venster eromheen, voor scans die niet overal even
// licht zijn. Met integraalbeelden kost dat per pixel evenveel, hoe groot het venster ook is.
function sauvola(beeld, venster, k) {
  const { breedte, hoogte, pixels } = beeld;
  const w1 = breedte + 1;
  const som = new Float64Array(w1 * (hoogte + 1));
  const kwadraat = new Float64Array(w1 * (hoogte + 1));
  for (let y = 0; y < hoogte; y += 1) {
    let rijSom = 0;
    let rijKwadraat = 0;
    for (let x = 0; x < breedte; x += 1) {
      const waarde = pixels[y * breedte + x];
      rijSom += waarde;
      rijKwadraat += waarde * waarde;
      som[(y + 1) * w1 + x + 1] = som[y * w1 + x + 1] + rijSom;
      kwadraat[(y + 1) * w1 + x + 1] = kwadraat[y * w1 + x + 1] + rijKwadraat;
    }
  }
  const half = Math.floor(venster / 2);
  const uit = new Uint8Array(breedte * hoogte);
  for (let y = 0; y < hoogte; y += 1) {
    const y0 = Math.max(0, y - half);
    const y1 = Math.min(hoogte, y + half + 1);
    for (let x = 0; x < breedte; x += 1) {
      const x0 = Math.max(0, x - half);
      const x1 = Math.min(breedte, x + half + 1);
      const aantal = (x1 - x0) * (y1 - y0);
      const s = som[y1 * w1 + x1] - som[y0 * w1 + x1] - som[y1 * w1 + x0] + som[y0 * w1 + x0];
      const q = kwadraat[y1 * w1 + x1] - kwadraat[y0 * w1 + x1] - kwadraat[y1 * w1 + x0] + kwadraat[y0 * w1 + x0];
      const gemiddelde = s / aantal;
      const afwijking = Math.sqrt(Math.max(0, q / aantal - gemiddelde * gemiddelde));
      const drempel = gemiddelde * (1 + k * (afwijking / 128 - 1));
      uit[y * breedte + x] = pixels[y * breedte + x] < drempel ? 1 : 0;
    }
  }
  return uit;
}

// Van grijs naar zwart-wit. methode 'otsu' (standaard) of 'sauvola' (venster in pixels, standaard 1/20 van de kleinste
// zijde, en k: hoe streng; 0,34 werkt goed voor gedrukte muziek).
export function zwartWit(beeld, { methode = 'otsu', venster, k = 0.34 } = {}) {
  const { breedte, hoogte, pixels } = beeld;
  if (methode === 'sauvola') {
    const maat = venster ?? Math.max(15, Math.round(Math.min(breedte, hoogte) / 20) | 1);
    return { breedte, hoogte, pixels: sauvola(beeld, maat, k) };
  }
  const drempel = otsuDrempel(pixels);
  const uit = new Uint8Array(breedte * hoogte);
  for (let i = 0; i < uit.length; i += 1) uit[i] = pixels[i] <= drempel ? 1 : 0;
  return { breedte, hoogte, pixels: uit };
}
