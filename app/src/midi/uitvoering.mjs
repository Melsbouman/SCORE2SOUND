const STAPPEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function menselijkVerschil(noot, positieInMaat) {
  const toonhoogte = noot.toonhoogte ?? {};
  const toets = (toonhoogte.octaaf + 1) * 12 + STAPPEN[toonhoogte.stap] + (toonhoogte.alter ?? 0);
  return ((toets + Math.floor(positieInMaat / 480)) % 5 + 5) % 5 - 2;
}

export function uitvoeringVanNoot(noot, { sterkte, positieInMaat }) {
  const articulaties = noot.articulaties ?? [];
  let duurFactor = 0.92;
  if (articulaties.includes('staccatissimo')) duurFactor = 0.3;
  else if (articulaties.includes('staccato')) duurFactor = 0.5;
  else if (articulaties.includes('tenuto')) duurFactor = 1;
  else if (articulaties.includes('marcato')) duurFactor = 0.9;
  else if (noot.legato?.begin || noot.legato?.eind) duurFactor = 1.02;

  let velocity = sterkte + menselijkVerschil(noot, positieInMaat);
  if (articulaties.includes('accent') || articulaties.includes('marcato')) velocity += 18;
  if (positieInMaat === 0) velocity += 4;
  if (positieInMaat === 960) velocity += 2;

  return { velocity: Math.max(1, Math.min(127, velocity)), duurFactor };
}
