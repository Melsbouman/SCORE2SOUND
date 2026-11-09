// Herkenning, stap SCALE (naar het voorbeeld van Audiveris): de maten van het blad uit histogrammen van verticale stukken.
// Per kolom lopen we van boven naar beneden en tellen we de lengte van elk zwart en wit stuk (een "run").
// - Zwarte runs: de meest voorkomende lengte is de dikte van een notenbalklijn; een tweede piek rond een halve lijnafstand
//   is de dikte van een balk (waardestreep).
// - Wit plus de helft van de zwarte runs erboven en eronder: de meest voorkomende waarde is de lijnafstand (van lijn tot lijn).
// Geeft null als er geen duidelijke lijnafstand is (geen notenbalken op dit blad).

const MAX_RUN = 400;

function histogrammen(zw) {
  const { breedte, hoogte, pixels } = zw;
  const zwart = new Float64Array(MAX_RUN);
  const combo = new Float64Array(MAX_RUN);
  for (let x = 0; x < breedte; x += 1) {
    let vorigeZwart = 0;
    let wit = 0;
    let y = 0;
    while (y < hoogte) {
      const kleur = pixels[y * breedte + x];
      let lengte = 0;
      while (y < hoogte && pixels[y * breedte + x] === kleur) {
        lengte += 1;
        y += 1;
      }
      if (kleur === 1) {
        if (lengte < MAX_RUN) zwart[lengte] += 1;
        if (vorigeZwart > 0 && wit > 0) {
          const waarde = Math.round(wit + (vorigeZwart + lengte) / 2);
          if (waarde < MAX_RUN) combo[waarde] += 1;
        }
        vorigeZwart = lengte;
        wit = 0;
      } else {
        wit = lengte;
      }
    }
  }
  return { zwart, combo };
}

// De piek in een deel van het histogram, met de grenzen waar het onder een kwart van de piek zakt.
function piek(histogram, van = 1, tot = histogram.length - 1) {
  let plek = -1;
  for (let i = van; i <= tot; i += 1) if (plek === -1 || histogram[i] > histogram[plek]) plek = i;
  if (plek === -1 || histogram[plek] === 0) return null;
  const grens = histogram[plek] / 4;
  let min = plek;
  while (min > van && histogram[min - 1] >= grens) min -= 1;
  let max = plek;
  while (max < tot && histogram[max + 1] >= grens) max += 1;
  // Het midden van de piek, gewogen, voor een waarde tussen twee hele pixels in.
  let som = 0;
  let gewicht = 0;
  for (let i = min; i <= max; i += 1) {
    som += i * histogram[i];
    gewicht += histogram[i];
  }
  return { waarde: som / gewicht, min, max, hoogte: histogram[plek] };
}

export function meetSchaal(zw) {
  const { zwart, combo } = histogrammen(zw);
  const lijn = piek(zwart, 1, 30);
  if (!lijn) return null;
  const afstand = piek(combo, Math.max(4, Math.ceil(lijn.waarde * 2)), MAX_RUN - 1);
  // Een notenbalk heeft per kolom vier tussenruimtes; minder dan een handvol kolommen met zo'n patroon is geen notenbalk.
  if (!afstand || afstand.hoogte < 20) return null;
  const lijnafstand = afstand.waarde;
  const balk = piek(zwart, Math.max(lijn.max + 2, Math.round(lijnafstand * 0.3)), Math.round(lijnafstand * 0.75));
  return {
    lijndikte: lijn.waarde,
    lijndikteMax: lijn.max,
    lijnafstand,
    lijnafstandMin: afstand.min,
    lijnafstandMax: afstand.max,
    // Een balkdikte alleen als die piek er duidelijk is (op een blad zonder achtsten is er geen).
    balkdikte: balk && balk.hoogte >= lijn.hoogte / 50 ? balk.waarde : null,
  };
}
