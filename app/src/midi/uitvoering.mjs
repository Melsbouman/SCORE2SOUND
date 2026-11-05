function begrens(waarde) {
  return Math.max(1, Math.min(127, Math.round(waarde)));
}

function kleineAfwijking(noot) {
  const stap = String(noot.toonhoogte?.stap ?? '').charCodeAt(0) || 0;
  return ((noot.start ?? 0) + (noot.duur ?? 0) + stap) % 3 - 1;
}

export function uitvoeringVanNoot(noot, { sterkte, positieInMaat }) {
  const articulaties = noot.articulaties ?? [];
  let velocity = sterkte + kleineAfwijking(noot);
  let duurFactor = 0.92;

  if (articulaties.includes('accent') || articulaties.includes('marcato')) velocity += 18;
  if (articulaties.includes('marcato')) duurFactor = 0.9;
  if (articulaties.includes('staccato')) duurFactor = 0.5;
  if (articulaties.includes('staccatissimo')) duurFactor = 0.25;
  if (articulaties.includes('tenuto')) duurFactor = 1;
  if (noot.legato?.begin || noot.legato?.eind) duurFactor = 1.02;

  if (positieInMaat === 0) velocity += 4;
  if (positieInMaat === 960) velocity += 2;

  return { velocity: begrens(velocity), duurFactor };
}
