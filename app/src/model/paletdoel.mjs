// Het doel voor een aanwijzing (ff, cresc., een haak) uit het palet: de noot of rust die horizontaal het dichtst bij de muis
// staat, op de balk die het dichtst bij de muis is. Pure functie, zodat hij in Node getest kan worden; weergave.js geeft de
// kaders van de getekende noten mee.
// kandidaten: [{ links, rechts, balkAfstand, ... }] in pixels; x: de muis. Geeft de gekozen kandidaat, of null.
export function dichtsteBijX(kandidaten, x) {
  if (!kandidaten?.length) return null;
  const balk = Math.min(...kandidaten.map((kandidaat) => kandidaat.balkAfstand ?? 0));
  let beste = null;
  let besteAfstand = Infinity;
  for (const kandidaat of kandidaten) {
    if ((kandidaat.balkAfstand ?? 0) !== balk) continue;
    const afstand = x < kandidaat.links ? kandidaat.links - x : x > kandidaat.rechts ? x - kandidaat.rechts : 0;
    if (afstand < besteAfstand || (afstand === besteAfstand && kandidaat.links < beste.links)) {
      beste = kandidaat;
      besteAfstand = afstand;
    }
  }
  return beste;
}
