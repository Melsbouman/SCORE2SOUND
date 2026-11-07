// Ontdekken: zoeken in de catalogus met gratis stukken (puur, draait ook in de browser).
function normaliseer(tekst) {
  return String(tekst ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function zoekWerken(werken, tekst, { max = 60, categorie = null } = {}) {
  const woorden = normaliseer(tekst).split(/\s+/).filter(Boolean);
  if (woorden.length === 0 && !categorie) return [];
  const uit = [];
  for (const werk of werken) {
    if (categorie && werk.categorie !== categorie) continue;
    const hooi = normaliseer(`${werk.titel} ${werk.componist} ${werk.reeks ?? ''}`);
    if (woorden.every((woord) => hooi.includes(woord))) {
      uit.push(werk);
      if (uit.length >= max) break;
    }
  }
  return uit;
}

export function uitgelicht(werken, aantal, dagnummer) {
  if (werken.length === 0) return [];
  const begin = ((Math.abs(Math.trunc(dagnummer)) * 7919) % werken.length);
  return Array.from({ length: Math.min(aantal, werken.length) }, (_, i) => werken[(begin + i * 37) % werken.length]);
}

const VOLGORDE = ['Liederen', 'Strijkkwartetten', 'Bach-koralen', 'Klassiek en barok', 'Ragtime en meer', 'Oude muziek'];

// De categorieën met hun aantal, in een vaste volgorde (onbekende achteraan, alfabetisch).
export function categorieen(werken) {
  const aantallen = new Map();
  for (const werk of werken) aantallen.set(werk.categorie, (aantallen.get(werk.categorie) ?? 0) + 1);
  const rang = (naam) => (VOLGORDE.includes(naam) ? VOLGORDE.indexOf(naam) : VOLGORDE.length);
  return [...aantallen]
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => rang(a.naam) - rang(b.naam) || a.naam.localeCompare(b.naam, 'nl'));
}

// Uit elke categorie een paar stukken die voor een dag steeds dezelfde zijn: afwisseling op de startpagina.
export function perCategorie(werken, perRij, dagnummer) {
  return categorieen(werken).map(({ naam }) => ({
    categorie: naam,
    werken: uitgelicht(werken.filter((werk) => werk.categorie === naam), perRij, dagnummer),
  }));
}

export function componisten(werken) {
  const aantallen = new Map();
  for (const werk of werken) aantallen.set(werk.componist, (aantallen.get(werk.componist) ?? 0) + 1);
  return [...aantallen]
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam, 'nl'));
}
