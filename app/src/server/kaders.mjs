// Kaders (repetitieletters in een rechthoek) vinden in de zwart-witafbeelding van een blad.
import { inflateSync } from 'node:zlib';

// Greyscale of RGB PNG: geeft per pixel 1 voor zwart. Zwart-wit uit Audiveris is 8 bit grijs.
export function leesPng(buffer) {
  let positie = 8;
  let breedte = 0;
  let hoogte = 0;
  let diepte = 8;
  let kleur = 0;
  const delen = [];
  while (positie + 8 <= buffer.length) {
    const lengte = buffer.readUInt32BE(positie);
    const soort = buffer.toString('latin1', positie + 4, positie + 8);
    const inhoud = buffer.subarray(positie + 8, positie + 8 + lengte);
    if (soort === 'IHDR') {
      breedte = inhoud.readUInt32BE(0);
      hoogte = inhoud.readUInt32BE(4);
      diepte = inhoud[8];
      kleur = inhoud[9];
    }
    if (soort === 'IDAT') delen.push(inhoud);
    positie += 12 + lengte;
  }
  const kanalen = { 0: 1, 2: 3, 4: 2, 6: 4 }[kleur];
  if (!breedte || !kanalen || ![1, 8].includes(diepte)) throw new Error('Deze afbeelding kan niet worden gelezen.');
  const kaal = inflateSync(Buffer.concat(delen));
  const bpp = Math.max(1, (diepte * kanalen) >> 3);
  const rij = Math.ceil((breedte * diepte * kanalen) / 8);
  const zwart = new Uint8Array(breedte * hoogte);
  let vorige = new Uint8Array(rij);
  for (let y = 0; y < hoogte; y += 1) {
    const filter = kaal[y * (rij + 1)];
    const huidig = Uint8Array.from(kaal.subarray(y * (rij + 1) + 1, (y + 1) * (rij + 1)));
    for (let i = 0; i < rij; i += 1) {
      const a = i >= bpp ? huidig[i - bpp] : 0;
      const b = vorige[i];
      const c = i >= bpp ? vorige[i - bpp] : 0;
      if (filter === 1) huidig[i] += a;
      else if (filter === 2) huidig[i] += b;
      else if (filter === 3) huidig[i] += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        huidig[i] += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
    }
    for (let x = 0; x < breedte; x += 1) {
      const waarde = diepte === 1 ? (huidig[x >> 3] >> (7 - (x & 7))) & 1 : huidig[x * bpp];
      zwart[y * breedte + x] = (diepte === 1 ? waarde === 0 : waarde < 128) ? 1 : 0;
    }
    vorige = huidig;
  }
  return { breedte, hoogte, zwart };
}

// Samenhangende zwarte vormen, met hun omlijnende rechthoek en het aantal pixels.
function vormen({ breedte, hoogte, zwart }) {
  const gezien = new Uint8Array(zwart.length);
  const stapel = new Int32Array(zwart.length);
  const uit = [];
  for (let start = 0; start < zwart.length; start += 1) {
    if (!zwart[start] || gezien[start]) continue;
    let top = 0;
    stapel[top++] = start;
    gezien[start] = 1;
    let x1 = breedte;
    let x2 = 0;
    let y1 = hoogte;
    let y2 = 0;
    let n = 0;
    while (top > 0) {
      const p = stapel[--top];
      const x = p % breedte;
      const y = (p - x) / breedte;
      if (x < x1) x1 = x;
      if (x > x2) x2 = x;
      if (y < y1) y1 = y;
      if (y > y2) y2 = y;
      n += 1;
      for (const q of [p - 1, p + 1, p - breedte, p + breedte]) {
        if (q >= 0 && q < zwart.length && zwart[q] && !gezien[q] && Math.abs((q % breedte) - x) <= 1) {
          gezien[q] = 1;
          stapel[top++] = q;
        }
      }
    }
    uit.push({ x: x1, y: y1, w: x2 - x1 + 1, h: y2 - y1 + 1, n });
  }
  return uit;
}

// Kaders: een holle, ongeveer vierkante vorm waarvan de vier zijden zwart zijn, met iets erin.
export function vindKaders(beeld) {
  const { breedte, zwart } = beeld;
  const alle = vormen(beeld);
  const kaders = [];
  for (const v of alle) {
    if (v.w < 30 || v.w > 100 || v.h < 30 || v.h > 100) continue;
    if (Math.max(v.w, v.h) / Math.min(v.w, v.h) > 1.6) continue;
    if (v.n / (v.w * v.h) > 0.3) continue;
    const zwartLangs = (plek, lengte, horizontaal) => {
      let n = 0;
      for (let i = 0; i < lengte; i += 1) {
        const [x, y] = plek(i);
        let raak = false;
        for (const d of [-2, -1, 0, 1, 2]) if (zwart[(horizontaal ? y + d : y) * breedte + (horizontaal ? x : x + d)]) raak = true;
        if (raak) n += 1;
      }
      return n / lengte;
    };
    const binnenB = Math.round(v.w * 0.7);
    const binnenH = Math.round(v.h * 0.7);
    const dx = Math.round((v.w - binnenB) / 2);
    const dy = Math.round((v.h - binnenH) / 2);
    const zijden = [
      zwartLangs((i) => [v.x + dx + i, v.y + 1], binnenB, true),
      zwartLangs((i) => [v.x + dx + i, v.y + v.h - 2], binnenB, true),
      zwartLangs((i) => [v.x + 1, v.y + dy + i], binnenH, false),
      zwartLangs((i) => [v.x + v.w - 2, v.y + dy + i], binnenH, false),
    ];
    if (Math.min(...zijden) < 0.95) continue;
    const tekens = alle.filter((b) => b !== v && b.x > v.x && b.y > v.y && b.x + b.w < v.x + v.w && b.y + b.h < v.y + v.h && b.n > 8).length;
    if (tekens > 0) kaders.push({ x: v.x, y: v.y, w: v.w, h: v.h, tekens });
  }
  return kaders;
}
