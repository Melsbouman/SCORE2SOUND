// Het vaste aantal tikken per kwartnoot.
export const TIKKEN_PER_KWART = 480;

// Zet een MusicXML-duur om naar tikken en meldt of de uitkomst exact is.
export function naarTikken(duur, divisions) {
  if (divisions <= 0) {
    throw new Error('Divisions moet groter zijn dan nul.');
  }

  const ongerond = duur * TIKKEN_PER_KWART / divisions;
  return {
    tikken: Math.round(ongerond),
    exact: Number.isInteger(ongerond),
  };
}

// Berekent de lengte van een maat in tikken.
export function maatLengte({ teller, noemer }) {
  return teller * TIKKEN_PER_KWART * 4 / noemer;
}

// Berekent de duur van een genoteerde notenwaarde met eventuele punten.
export function notatieDuur(type, punten = 0) {
  const duren = {
    whole: TIKKEN_PER_KWART * 4,
    half: TIKKEN_PER_KWART * 2,
    quarter: TIKKEN_PER_KWART,
    eighth: TIKKEN_PER_KWART / 2,
    '16th': TIKKEN_PER_KWART / 4,
    '32nd': TIKKEN_PER_KWART / 8,
    '64th': TIKKEN_PER_KWART / 16,
  };
  const basis = duren[type];

  if (basis === undefined) {
    throw new Error(`Onbekende notenwaarde: ${type}.`);
  }

  let duur = basis;
  let toevoeging = basis;
  for (let punt = 0; punt < punten; punt += 1) {
    toevoeging /= 2;
    duur += toevoeging;
  }
  return duur;
}

// Rekent een onregelmatige notengroep om naar de gespeelde duur.
export function triool(tikken, werkelijk = 3, normaal = 2) {
  return tikken * normaal / werkelijk;
}

// Zet tikken om naar een aantal kwartnoten.
export function alsKwarten(tikken) {
  return tikken / TIKKEN_PER_KWART;
}
