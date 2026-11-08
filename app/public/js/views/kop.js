// De kop bovenaan toont de naam van het scherm waar je bent. Op de begin-schermen is hij verborgen:
// die schermen hebben zelf een grote kop.
const TITELS = [
  [/^(bewerken|editor|weergave)\b/, 'Editor'],
  [/^(projecten|bibliotheek)\b/, 'Bibliotheek'],
  [/^export\b/, 'Exporteren'],
  [/^instellingen\b/, 'Instellingen'],
  [/^inloggen\b/, 'Inloggen'],
];
const VERBORGEN = /^(begin|nieuw|nieuw-partij|nieuw-partituur)?$/;

export function kopTitel(hash) {
  const naam = String(hash ?? '').replace(/^#/, '');
  if (VERBORGEN.test(naam)) return null;
  for (const [patroon, titel] of TITELS) if (patroon.test(naam)) return titel;
  return 'SCORE2SOUND';
}

// Welk scherm bij welke hash hoort, en welke vlakken van de hoofdinhoud daarbij zichtbaar zijn.
const VLAKKEN = {
  begin: ['nieuw', 'upload', 'voorbeeld', 'hulp'],
  editor: ['lint', 'paletten', 'zoom', 'weergave'],
  bibliotheek: ['projecten'],
  inloggen: ['inloggen'],
  instellingen: ['instellingen'],
};
const SCHERMEN = [
  [/^(projecten|bibliotheek)\b/, 'bibliotheek'],
  [/^inloggen\b/, 'inloggen'],
  [/^instellingen\b/, 'instellingen'],
  [/^(|begin|nieuw|nieuw-partij|nieuw-partituur|upload|hulp|voorbeeld)$/, 'begin'],
];

// De vlakken van de hoofdinhoud die bij een scherm zichtbaar zijn.
export function vlakkenVoor(scherm) {
  return VLAKKEN[scherm] ?? [];
}

export function schermVoor(hash) {
  const naam = String(hash ?? '').replace(/^#/, '');
  for (const [patroon, scherm] of SCHERMEN) if (patroon.test(naam)) return scherm;
  return 'editor';
}

function toonScherm(scherm) {
  document.body.dataset.scherm = scherm;
  const zichtbaar = new Set(vlakkenVoor(scherm));
  const hoofd = document.getElementById('hoofdinhoud');
  for (const vlak of hoofd?.children ?? []) {
    vlak.classList.toggle('scherm-weg', !zichtbaar.has(vlak.id));
  }
  // Vlakken die het lint in zijn tabbladen of het palettenpaneel in zich heeft gezet, volgen dat lint of paneel.
  for (const vlak of hoofd?.querySelectorAll('.lint__paneel > section, .paletten > section') ?? []) vlak.classList.remove('scherm-weg');
}

export function vernieuw() {
  toonScherm(schermVoor(window.location.hash));
}

export function start() {
  window.addEventListener('hashchange', () => toonScherm(schermVoor(window.location.hash)));
  toonScherm(schermVoor(window.location.hash));
  const kop = document.querySelector('header.kop');
  if (!kop) return;
  const h1 = kop.querySelector('h1');
  const p = kop.querySelector('p');
  function werkBij() {
    const titel = kopTitel(window.location.hash);
    kop.hidden = titel === null;
    if (titel !== null && h1) h1.textContent = titel;
    if (p) p.hidden = true;
  }
  window.addEventListener('hashchange', werkBij);
  werkBij();
}
