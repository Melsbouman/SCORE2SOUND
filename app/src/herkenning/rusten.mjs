// Herkenning, rusten (deel van de stap SYMBOLS bij Audiveris), in eigen code. Werkwijze:
// 1. Op het beeld zonder notenbalklijnen nemen we de losse vormen (vormen.mjs) in en rond de balk die niet bij een nootkop,
//    stok of maatstreep horen en niet in de sleutelzone staan.
// 2. Een meermaatsrust is een dikke balk (minstens tweeënhalve lijnafstand lang) precies op de middelste lijn. Die zoeken we
//    rechtstreeks per kolom (hij zit vaak vast aan de sleutel of een maatstreep, dan is het geen losse vorm). Een waardestreep
//    van achtsten op de middelste lijn heeft onderweg stokken; een meermaatsrust alleen een streepje aan beide uiteinden.
// 3. Een hele rust hangt als gevuld blokje onder de tweede lijn; een halve rust staat op de middelste lijn.
// 4. Kwart-, achtste-, zestiende- en tweeëndertigste rusten vergelijken we met de sjablonen uit Bravura, op dezelfde maat
//    geschaald als de vorm (lettertypen verschillen in de details, niet in de grote lijn). Voortekens vergelijken we mee als er
//    vlak rechts een nootkop staat: lijkt de vorm dan meer op een kruis dan op een rust, dan is het een voorteken.
// Uitkomst per balk: [{ x, soort, links, rechts }] met soort 'meermaats', 'heel', 'half', 'kwart', '8', '16' of '32' en
// x het midden.
import { vindVormen } from './vormen.mjs';
import { sjabloon } from './sjablonen.mjs';

const RUSTEN = [['kwart', 'rust-kwart'], ['8', 'rust-8'], ['16', 'rust-16'], ['32', 'rust-32']];
// Cijfers staan niet midden in een maat op de balk (een 7 lijkt op een achtste rust); voortekens wel, vlak voor een kop.
const ANDERE = ['kruis', 'mol', 'herstel'];

// Hoe goed past een vorm (uitsnede uit labels) op een sjabloon, beide op hetzelfde kader geschaald. Dunne lijnen (een achtste
// rust) vallen na het schalen net naast elkaar; daarom telt een pixel als raak als de ander binnen één pixel ligt. De score is
// het gemiddelde van beide kanten: hoeveel van de vorm bij het sjabloon past, en hoeveel van het sjabloon bij de vorm.
function overlap(labels, breedte, vorm, t) {
  const w = vorm.rechts - vorm.links + 1;
  const h = vorm.onder - vorm.boven + 1;
  const v = new Uint8Array(w * h);
  const s = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    const ty = Math.min(t.hoogte - 1, Math.floor(((y + 0.5) * t.hoogte) / h));
    for (let x = 0; x < w; x += 1) {
      const tx = Math.min(t.breedte - 1, Math.floor(((x + 0.5) * t.breedte) / w));
      v[y * w + x] = labels[(vorm.boven + y) * breedte + vorm.links + x] === vorm.id ? 1 : 0;
      s[y * w + x] = t.pixels[ty * t.breedte + tx];
    }
  }
  const dichtbij = (masker, x, y) => {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < w && py >= 0 && py < h && masker[py * w + px]) return true;
      }
    }
    return false;
  };
  let vormRaak = 0; let vormAlle = 0; let sjabloonRaak = 0; let sjabloonAlle = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (v[y * w + x]) { vormAlle += 1; if (dichtbij(s, x, y)) vormRaak += 1; }
      if (s[y * w + x]) { sjabloonAlle += 1; if (dichtbij(v, x, y)) sjabloonRaak += 1; }
    }
  }
  return vormAlle && sjabloonAlle ? (vormRaak / vormAlle + sjabloonRaak / sjabloonAlle) / 2 : 0;
}

export function zoekRusten(kaal, raster, schaal, { koppen = [], strepen = [] } = {}) {
  const ia = schaal.lijnafstand;
  const { breedte } = kaal;
  const { labels, vormen } = vindVormen(kaal, { minPixels: Math.round(ia * ia * 0.08) });
  const sjablonen = [
    ...RUSTEN.map(([soort, naam]) => ({ soort, rust: true, ...sjabloon(naam, ia) })),
    ...ANDERE.map((naam) => ({ soort: naam, rust: false, ...sjabloon(naam, ia) })),
  ];
  const zwart = (x, y) => x >= 0 && x < breedte && y >= 0 && y < kaal.hoogte && kaal.pixels[y * breedte + x] === 1;
  return raster.balken.map((balk, b) => {
    const yOp = (stap, x) => balk.lijnen[0].a + balk.lijnen[0].b * x + (stap * ia) / 2;
    // Meermaatsrusten: per kolom de dikte van de zwarte strook door de middelste lijn.
    const balkenOpMidden = [];
    let begin = -1;
    const dikOpMidden = (x) => {
      const y = Math.round(yOp(4, x));
      if (!zwart(x, y)) return false;
      let o = y; let n = y;
      while (zwart(x, o - 1) && y - o < ia) o -= 1;
      while (zwart(x, n + 1) && n - y < ia) n += 1;
      const dikte = n - o + 1;
      return dikte >= ia * 0.35 && dikte <= ia * 1.2 && Math.abs((o + n) / 2 - y) <= ia * 0.3;
    };
    for (let x = Math.round(balk.links + ia * 2); x <= balk.rechts + 1; x += 1) {
      const dik = x <= balk.rechts && dikOpMidden(x);
      if (dik && begin < 0) begin = x;
      if (!dik && begin >= 0) {
        if (x - begin >= ia * 2.5) balkenOpMidden.push({ links: begin, rechts: x - 1 });
        begin = -1;
      }
    }
    // Stokken onderweg: kolommen binnen de balk (niet aan de uiteinden) waar een dunne strook boven of onder de balk ver doorloopt.
    const heeftStokken = (bar) => {
      for (let x = bar.links + Math.round(ia * 0.6); x <= bar.rechts - Math.round(ia * 0.6); x += 1) {
        const y = Math.round(yOp(4, x));
        let o = y; while (zwart(x, o - 1) && y - o < ia * 4) o -= 1;
        let n = y; while (zwart(x, n + 1) && n - y < ia * 4) n += 1;
        if (n - o >= ia * 2) return true;
      }
      return false;
    };
    const meermaats = balkenOpMidden.filter((bar) => !heeftStokken(bar));
    const bezet = (vorm) => (koppen[b] ?? []).some((kop) => kop.x >= vorm.links - ia * 0.3 && kop.x <= vorm.rechts + ia * 0.3
      && kop.y >= vorm.boven - ia * 0.3 && kop.y <= vorm.onder + ia * 0.3)
      || (strepen[b] ?? []).some((streep) => streep.links <= vorm.rechts && streep.rechts >= vorm.links);
    const uit = [];
    for (const vorm of vormen) {
      const x = (vorm.links + vorm.rechts) / 2;
      if (x < balk.links + ia * 3 || x > balk.rechts) continue;
      const boven = yOp(-1, x);
      const onder = yOp(9, x);
      if (vorm.onder < boven || vorm.boven > onder || bezet(vorm)) continue;
      if (meermaats.some((bar) => bar.links <= vorm.rechts && bar.rechts >= vorm.links)) continue;
      const w = (vorm.rechts - vorm.links + 1) / ia;
      const h = (vorm.onder - vorm.boven + 1) / ia;
      const midden = ((vorm.boven + vorm.onder) / 2 - yOp(0, x)) / (ia / 2); // in stappen
      const vulling = vorm.pixels / ((vorm.rechts - vorm.links + 1) * (vorm.onder - vorm.boven + 1));
      let soort = null;
      if (w >= 0.7 && w <= 1.7 && h >= 0.3 && h <= 0.75 && vulling >= 0.75) {
        // Bovenkant tegen de tweede lijn (stap 2): hele rust; onderkant op de middelste lijn (stap 4): halve rust.
        const bovenStap = (vorm.boven - yOp(0, x)) / (ia / 2);
        const onderStap = (vorm.onder - yOp(0, x)) / (ia / 2);
        if (Math.abs(bovenStap - 2) <= 0.6) soort = 'heel';
        else if (Math.abs(onderStap - 4) <= 0.6) soort = 'half';
      } else if (h >= 1.2 && h <= 4.2 && w >= 0.35 && w <= 1.6 && midden >= 1 && midden <= 7) {
        // Een voorteken staat vlak tegen de kop aan (tot een lijnafstand ertussen) en op dezelfde hoogte (een mol iets hoger).
        const midY = (vorm.boven + vorm.onder) / 2;
        const kopErnaast = (koppen[b] ?? []).some((kop) => {
          const gat = kop.x - ia * 0.6 - vorm.rechts;
          return gat >= -ia * 0.2 && gat <= ia && midY - kop.y >= -ia * 0.9 && midY - kop.y <= ia * 0.4;
        });
        const beste = sjablonen.filter((t) => t.rust || kopErnaast)
          .map((t) => ({ t, score: overlap(labels, breedte, vorm, t) })).sort((p, q) => q.score - p.score)[0];
        if (beste.t.rust && beste.score >= 0.7) soort = beste.t.soort;
      }
      if (soort) uit.push({ x: Math.round(x), soort, links: vorm.links, rechts: vorm.rechts });
    }
    for (const bar of meermaats) uit.push({ x: Math.round((bar.links + bar.rechts) / 2), soort: 'meermaats', links: bar.links, rechts: bar.rechts });
    return uit.sort((p, q) => p.x - q.x);
  });
}
