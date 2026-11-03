export function start(app) {
  const kop = document.querySelector('.kop');
  if (!kop) return;

  const openen = document.createElement('button');
  openen.type = 'button';
  openen.className = 'knop sneltoetsen__open';
  openen.textContent = 'Sneltoetsen';
  openen.setAttribute('aria-haspopup', 'dialog');
  kop.append(openen);

  const achtergrond = document.createElement('div');
  achtergrond.className = 'sneltoetsen__achtergrond';
  const venster = document.createElement('section');
  venster.className = 'sneltoetsen';
  venster.setAttribute('role', 'dialog');
  venster.setAttribute('aria-modal', 'true');
  venster.setAttribute('aria-labelledby', 'sneltoetsen-titel');

  const titel = document.createElement('h2');
  titel.id = 'sneltoetsen-titel';
  titel.textContent = 'Sneltoetsen';
  const lijst = document.createElement('ul');
  for (const [toets, omschrijving] of [
    ['Shift + ↑ / ↓', 'Verschuif de geselecteerde noot een octaaf omhoog of omlaag.'],
    ['← / →', 'Ga naar de vorige of volgende noot.'],
    ['Shift + klik', 'Voeg een noot toe aan de keuze of haal hem eruit.'],
    ['N', 'Ga naar de volgende onzekere noot.'],
    ['Enter', 'Keur de geselecteerde noot goed.'],
    ['A tot en met G', 'Voer een noot in of vervang de gekozen noot door die toon.'],
    ['↑ / ↓', 'Een halve toon hoger of lager (Shift: een octaaf).'],
    ['Shift + A / Shift + F', 'Accent en fermate.'],
    ['Ctrl + C / Ctrl + V', 'Kopieer en plak de gekozen maten.'],
    ['Shift + klik', 'Kies een reeks maten.'],
    ['Ctrl + scrollen', 'Zoom het muziekstuk in of uit.'],
    ['Ctrl + + / Ctrl + − / Ctrl + 0', 'Zoom het muziekstuk in, uit of terug naar 80 procent.'],
    ['Escape', 'Hef de gekozen noten of maat op.'],
    ['Alt + 1 tot 6', 'Kies een tabblad van het lint.'],
    ['Delete', 'Maak van de gekozen noot of noten een rust.'],
  ]) {
    const item = document.createElement('li');
    const kbd = document.createElement('kbd');
    kbd.textContent = toets;
    item.append(kbd, `: ${omschrijving}`);
    lijst.append(item);
  }
  const sluiten = document.createElement('button');
  sluiten.type = 'button';
  sluiten.className = 'knop';
  sluiten.textContent = 'Sluiten';
  venster.append(titel, lijst, sluiten);
  achtergrond.append(venster);

  function sluit() {
    achtergrond.remove();
    openen.focus();
  }

  function open() {
    if (achtergrond.isConnected) return;
    document.body.append(achtergrond);
    sluiten.focus();
  }

  openen.addEventListener('click', open);
  sluiten.addEventListener('click', sluit);
  achtergrond.addEventListener('click', (gebeurtenis) => {
    if (gebeurtenis.target === achtergrond) sluit();
  });
  document.addEventListener('keydown', (gebeurtenis) => {
    if (gebeurtenis.key === 'Escape' && achtergrond.isConnected) {
      gebeurtenis.preventDefault();
      sluit();
      return;
    }

    const doel = gebeurtenis.target;
    if (
      gebeurtenis.key !== '?'
      || gebeurtenis.repeat
      || achtergrond.isConnected
      || doel.matches('input, select, textarea, [contenteditable]')
      || doel.isContentEditable
    ) return;
    gebeurtenis.preventDefault();
    open();
  });
}
