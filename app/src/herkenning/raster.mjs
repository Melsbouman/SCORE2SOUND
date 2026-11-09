// Herkenning, stap GRID deel 1 (naar het voorbeeld van Audiveris): de notenbalken vinden.
// Werkwijze, in eigen woorden:
// 1. Alleen dunne zwarte stukjes tellen mee: per kolom de zwarte runs die niet dikker zijn dan een notenbalklijn.
//    Nootkoppen, stokken, balken en maatstrepen vallen zo grotendeels weg.
// 2. Het blad wordt in verticale stroken verdeeld. In elke strook geeft een horizontale projectie van die dunne stukjes
//    pieken op de hoogte van de lijnen.
// 3. Vijf pieken op ongeveer een lijnafstand van elkaar vormen in die strook een stukje notenbalk.
// 4. Stukjes in naburige stroken op dezelfde hoogte (met een kleine helling) horen bij dezelfde notenbalk.
// 5. Per lijn gaat er een rechte lijn door de pieken (kleinste kwadraten); het begin en eind van de balk volgt de lijnen
//    tot de dunne pixels ophouden.
// Uitkomst: { helling, balken: [{ lijnen: [{ a, b, links, rechts }], links, rechts, lijnafstand }] }, van boven naar beneden.
// Een lijn is y = a + b * x. Alleen balken van vijf lijnen (de eerste versie leest losse partijen).

// Per pixel: 1 als hij in een dunne zwarte run zit (kolomgewijs), anders 0.
export function dunneLijnen(zw, maxDikte) {
  const { breedte, hoogte, pixels } = zw;
  const uit = new Uint8Array(breedte * hoogte);
  for (let x = 0; x < breedte; x += 1) {
    let y = 0;
    while (y < hoogte) {
      if (pixels[y * breedte + x] !== 1) {
        y += 1;
        continue;
      }
      const begin = y;
      while (y < hoogte && pixels[y * breedte + x] === 1) y += 1;
      if (y - begin <= maxDikte) for (let i = begin; i < y; i += 1) uit[i * breedte + x] = 1;
    }
  }
  return uit;
}

// Pieken in een horizontale projectie: aaneengesloten rijen boven de drempel, met hun gewogen midden.
function pieken(projectie, drempel) {
  const uit = [];
  let y = 0;
  while (y < projectie.length) {
    if (projectie[y] < drempel) {
      y += 1;
      continue;
    }
    let som = 0;
    let gewicht = 0;
    while (y < projectie.length && projectie[y] >= drempel) {
      som += y * projectie[y];
      gewicht += projectie[y];
      y += 1;
    }
    uit.push({ y: som / gewicht, sterkte: gewicht });
  }
  return uit;
}

// Groepen van vijf pieken met telkens ongeveer een lijnafstand ertussen. Vanaf elke piek zoeken we telkens de volgende piek
// die het best op een lijnafstand ligt. Overlappende groepen (een hulplijn of tekstregel boven de balk geeft een groep die
// één lijn verschoven is) beslissen we op sterkte: notenbalklijnen lopen door de hele strook, een hulplijn maar een stukje.
function vijftallen(lijst, lijnafstand) {
  const marge = Math.max(1.5, lijnafstand * 0.2);
  const kandidaten = [];
  for (let i = 0; i + 4 < lijst.length; i += 1) {
    const groep = [lijst[i]];
    while (groep.length < 5) {
      const vorige = groep.at(-1);
      let beste = null;
      for (const piek of lijst) {
        const afwijking = Math.abs(piek.y - vorige.y - lijnafstand);
        if (piek.y > vorige.y && afwijking <= marge && (!beste || afwijking < beste.afwijking)) beste = { piek, afwijking };
      }
      if (!beste) break;
      groep.push(beste.piek);
    }
    if (groep.length === 5) kandidaten.push({ groep, sterkte: groep.reduce((som, piek) => som + piek.sterkte, 0) });
  }
  const gekozen = [];
  for (const kandidaat of kandidaten.sort((a, b) => b.sterkte - a.sterkte)) {
    const boven = kandidaat.groep[0].y;
    const onder = kandidaat.groep[4].y;
    if (gekozen.some((ander) => ander.groep[0].y <= onder + marge && boven - marge <= ander.groep[4].y)) continue;
    gekozen.push(kandidaat);
  }
  return gekozen.sort((a, b) => a.groep[0].y - b.groep[0].y).map((kandidaat) => kandidaat.groep.map((piek) => piek.y));
}

// Rechte lijn door punten (x, y) met kleinste kwadraten.
function rechteLijn(punten) {
  const n = punten.length;
  if (n === 1) return { a: punten[0][1], b: 0 };
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (const [x, y] of punten) {
    sx += x;
    sy += y;
    sxx += x * x;
    sxy += x * y;
  }
  const noemer = n * sxx - sx * sx;
  const b = noemer === 0 ? 0 : (n * sxy - sx * sy) / noemer;
  return { a: (sy - b * sx) / n, b };
}

// Volg een lijn vanaf x in een richting zolang er genoeg dunne pixels op of vlak bij de lijn liggen. We kijken naar de
// laatste `venster` kolommen: een nootkop onderbreekt de lijn even (minder dan de helft van het venster), losse ruis naast
// de balk geeft maar een paar procent treffers. Onder een kwart houdt de lijn op; het eind is de laatste plek met minstens
// vier treffers op rij.
function volg(dun, breedte, hoogte, lijn, x, stap, venster, ruimte) {
  const raakOp = (px) => {
    const y = Math.round(lijn.a + lijn.b * px);
    for (let d = -ruimte; d <= ruimte; d += 1) {
      const py = y + d;
      if (py >= 0 && py < hoogte && dun[py * breedte + px]) return 1;
    }
    return 0;
  };
  let laatste = null;
  const recent = [];
  let raakInVenster = 0;
  let opRij = 0;
  for (let px = x; px >= 0 && px < breedte; px += stap) {
    const raak = raakOp(px);
    recent.push(raak);
    raakInVenster += raak;
    if (recent.length > venster) raakInVenster -= recent.shift();
    // Een echte lijn geeft treffers op rij; losse ruis bijna nooit vier kolommen achter elkaar.
    opRij = raak ? opRij + 1 : 0;
    if (opRij >= 4) laatste = px;
    if (recent.length >= venster && raakInVenster < venster * 0.25) break;
  }
  if (laatste !== null) return laatste;
  // Het beginpunt (het midden van de eerste of laatste strook) lag al voorbij het eind van de balk: zoek terug naar binnen
  // tot de eerste vier treffers op rij; de buitenste daarvan is het eind.
  opRij = 0;
  for (let px = x - stap; px >= 0 && px < breedte; px -= stap) {
    opRij = raakOp(px) ? opRij + 1 : 0;
    if (opRij >= 4) return px - 3 * -stap;
  }
  return x;
}

export function vindBalken(zw, schaal) {
  const { breedte, hoogte } = zw;
  if (!schaal) return { helling: 0, balken: [] };
  const { lijnafstand } = schaal;
  // Dun is hoogstens zo dik als een lijn (met wat ruimte), maar nooit zo dik als een balk (een halve lijnafstand).
  const maxDikte = Math.min(Math.max(schaal.lijndikteMax + 1, Math.round(schaal.lijndikte * 1.8)), Math.floor(lijnafstand * 0.35));
  const dun = dunneLijnen(zw, maxDikte);
  const strookBreedte = Math.max(24, Math.round(lijnafstand * 6));
  const stroken = [];
  for (let x0 = 0; x0 < breedte; x0 += strookBreedte) {
    const x1 = Math.min(breedte, x0 + strookBreedte);
    const projectie = new Float64Array(hoogte);
    for (let y = 0; y < hoogte; y += 1) {
      let aantal = 0;
      for (let x = x0; x < x1; x += 1) aantal += dun[y * breedte + x];
      projectie[y] = aantal;
    }
    // Drie rijen samen, zodat een licht scheve lijn (verdeeld over een paar rijen) toch één volle piek geeft.
    const glad = new Float64Array(hoogte);
    for (let y = 0; y < hoogte; y += 1) glad[y] = projectie[y] + (projectie[y - 1] ?? 0) + (projectie[y + 1] ?? 0);
    // Een lijn vult (bijna) de hele strook; symbolen en tekst maar een stukje. De helft is een veilige drempel.
    const gevonden = vijftallen(pieken(glad, (x1 - x0) * 0.5), lijnafstand);
    stroken.push({ midden: (x0 + x1) / 2, x0, x1, groepen: gevonden.map((ys) => ({ ys, gebruikt: false })) });
  }

  // Stukjes notenbalk van strook tot strook aan elkaar rijgen.
  const ketens = [];
  for (let s = 0; s < stroken.length; s += 1) {
    for (const groep of stroken[s].groepen) {
      if (groep.gebruikt) continue;
      const keten = [{ x: stroken[s].midden, ys: groep.ys }];
      groep.gebruikt = true;
      let leeg = 0;
      for (let t = s + 1; t < stroken.length && leeg <= 2; t += 1) {
        const vorige = keten.at(-1);
        const helling = keten.length > 1 ? (vorige.ys[2] - keten[0].ys[2]) / (vorige.x - keten[0].x) : 0;
        const verwacht = vorige.ys[2] + helling * (stroken[t].midden - vorige.x);
        const volgende = stroken[t].groepen.find((kandidaat) => !kandidaat.gebruikt
          && Math.abs(kandidaat.ys[2] - verwacht) <= lijnafstand * 0.6);
        if (volgende) {
          volgende.gebruikt = true;
          keten.push({ x: stroken[t].midden, ys: volgende.ys });
          leeg = 0;
        } else {
          leeg += 1;
        }
      }
      ketens.push(keten);
    }
  }

  // Ketens op dezelfde hoogte horen bij één notenbalk: een balk kan onderbroken zijn (veel noten op één plek), of een stukje
  // is één lijn verschoven gevonden (een hulplijn of tekstregel als vijfde lijn). Notenbalken liggen altijd veel verder uit
  // elkaar dan tweeënhalve lijnafstand. Per groep is de langste keten de maat; van de andere tellen alleen de stukjes die
  // precies op die lijnen liggen.
  const middenVan = (keten, x) => {
    const lijn = rechteLijn(keten.map((stukje) => [stukje.x, stukje.ys[2]]));
    return lijn.a + lijn.b * x;
  };
  const xMidden = (breedte - 1) / 2;
  const samengevoegd = [];
  for (const keten of [...ketens].sort((a, b) => b.length - a.length)) {
    const thuis = samengevoegd.find((groep) => Math.abs(middenVan(groep, xMidden) - middenVan(keten, xMidden)) < lijnafstand * 2.5);
    if (!thuis) {
      samengevoegd.push([...keten]);
      continue;
    }
    const lijn = rechteLijn(thuis.map((stukje) => [stukje.x, stukje.ys[2]]));
    for (const stukje of keten) {
      if (Math.abs(stukje.ys[2] - (lijn.a + lijn.b * stukje.x)) <= lijnafstand * 0.5) thuis.push(stukje);
    }
    thuis.sort((a, b) => a.x - b.x);
  }

  const balken = [];
  for (const keten of samengevoegd) {
    // Een notenbalk loopt over een flink stuk van het blad; losse treffers (tekst, een balk van achtsten) tellen niet.
    if (keten.length < 3 && keten.length * strookBreedte < breedte * 0.2) continue;
    const ruimte = Math.max(1, Math.ceil(schaal.lijndikte));
    const gat = Math.round(lijnafstand * 3);
    let rechten = [0, 1, 2, 3, 4].map((l) => rechteLijn(keten.map((stukje) => [stukje.x, stukje.ys[l]])));
    // Controle: een notenbalklijn loopt (op nootkoppen na) door; een rij overbindingen of hulplijnen vlak boven of onder de
    // balk heeft gaten. Loopt de lijn een lijnafstand onder de balk beter door dan de bovenste, dan is de balk een lijn te hoog
    // gevonden (en andersom). De nieuwe lijn zoeken we tot twee pixels om de verwachte plek.
    const x0 = Math.round(keten[0].x);
    const x1 = Math.round(keten.at(-1).x);
    const dekking = (lijn) => {
      let raak = 0;
      let aantal = 0;
      for (let x = x0; x <= x1; x += 2) {
        aantal += 1;
        const y = Math.round(lijn.a + lijn.b * x);
        for (let d = -ruimte; d <= ruimte; d += 1) {
          if (y + d >= 0 && y + d < hoogte && dun[(y + d) * breedte + x]) { raak += 1; break; }
        }
      }
      return aantal ? raak / aantal : 0;
    };
    const besteBij = (a, b) => [-2, -1, 0, 1, 2].map((d) => ({ a: a + d, b })).sort((p, q) => dekking(q) - dekking(p))[0];
    for (let poging = 0; poging < 2; poging += 1) {
      const afstand = (rechten[4].a - rechten[0].a) / 4;
      const onder = besteBij(rechten[4].a + afstand, rechten[4].b);
      const boven = besteBij(rechten[0].a - afstand, rechten[0].b);
      if (dekking(onder) > Math.max(0.5, dekking(rechten[0]) + 0.1)) rechten = [...rechten.slice(1), onder];
      else if (dekking(boven) > Math.max(0.5, dekking(rechten[4]) + 0.1)) rechten = [boven, ...rechten.slice(0, 4)];
      else break;
    }
    const lijnen = rechten.map((lijn) => ({
      ...lijn,
      links: volg(dun, breedte, hoogte, lijn, x0, -1, gat, ruimte),
      rechts: volg(dun, breedte, hoogte, lijn, x1, 1, gat, ruimte),
    }));
    const midden = (breedte - 1) / 2;
    const yMidden = (lijn) => lijn.a + lijn.b * midden;
    const afstanden = [1, 2, 3, 4].map((l) => yMidden(lijnen[l]) - yMidden(lijnen[l - 1]));
    balken.push({
      lijnen,
      // Begin en eind van de balk: waar de meeste lijnen beginnen en eindigen (de middelste waarde van vijf).
      links: [...lijnen.map((lijn) => lijn.links)].sort((a, b) => a - b)[2],
      rechts: [...lijnen.map((lijn) => lijn.rechts)].sort((a, b) => a - b)[2],
      lijnafstand: afstanden.reduce((som, waarde) => som + waarde, 0) / 4,
    });
  }
  balken.sort((a, b) => a.lijnen[0].a - b.lijnen[0].a);
  const hellingen = balken.map((balk) => balk.lijnen[2].b).sort((a, b) => a - b);
  return { helling: hellingen.length ? hellingen[Math.floor(hellingen.length / 2)] : 0, balken };
}
