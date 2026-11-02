// Versies: bewaar de huidige partituur als versie, zie waar een versie verschilt en luister om en om.
// app.stand.versies: [{ id, naam, tijd, partituur }]; ze worden bewaard met het project (zie projecten.js).
// Meldt 'luister-versie' (een partituur, of null voor de huidige) aan de speler en 'verschil-maten' ({ maten }) aan de weergave.
import { controleerMaatduur } from '/src/controle/maatduur.mjs';
import { maatReeks, verschillen } from '/src/model/versies.mjs';

const knop = (tekst, klik) => {
  const element = Object.assign(document.createElement('button'), { type: 'button', className: 'knop', textContent: tekst });
  element.addEventListener('click', klik);
  return element;
};
const tijdTekst = (tijd) => new Date(tijd).toLocaleString('nl-NL', { dateStyle: 'medium', timeStyle: 'short' });

export function start(app) {
  const vlak = document.getElementById('versies');
  let gekozen = null; // id van de versie die vergeleken wordt
  let luistert = false; // true als de gekozen versie klinkt in plaats van de huidige
  let status = '';

  const versies = () => app.stand.versies ?? [];
  const gekozenVersie = () => versies().find((versie) => versie.id === gekozen) ?? null;
  const nieuweVersie = (naam) => ({ id: crypto.randomUUID(), naam, tijd: new Date().toISOString(), partituur: structuredClone(app.stand.partituur) });

  function luister(ja) {
    luistert = ja;
    app.meld('luister-versie', ja ? gekozenVersie().partituur : null);
    teken();
  }

  function kies(id) {
    if (luistert) app.meld('luister-versie', null);
    luistert = false;
    gekozen = id;
    meldVerschil();
    teken();
  }

  function meldVerschil() {
    const versie = gekozenVersie();
    app.meld('verschil-maten', { maten: versie && app.stand.partituur ? verschillen(versie.partituur, app.stand.partituur).maten : [] });
  }

  function zetTerug(versie) {
    const reserve = nieuweVersie(`Voor het terugzetten van ${versie.naam}`);
    app.zet({ versies: [...versies(), reserve] });
    const partituur = structuredClone(versie.partituur);
    app.zet({ partituur, meldingen: controleerMaatduur(partituur) });
    status = `${versie.naam} staat weer in beeld. De vorige stand is bewaard als versie.`;
    kies(null);
  }

  function regel(partij) {
    const li = document.createElement('li');
    if (partij.soort === 'nieuw') li.textContent = `${partij.naam}: nieuwe partij`;
    else if (partij.soort === 'weg') li.textContent = `${partij.naam}: partij is weg`;
    else if (partij.maten.length === 0) li.textContent = `${partij.naam}: ander instrument`;
    else {
      const maten = app.stand.partituur.partijen.find((p) => p.id === partij.id).maten;
      li.append(knop(`${partij.naam}: maat ${maatReeks(partij.maten, maten)}`, () => app.meld('naar-maat', { maat: partij.maten[0] })));
    }
    return li;
  }

  function vergelijking(versie) {
    const vak = document.createElement('div');
    vak.className = 'versies__vergelijking';
    const { partijen } = verschillen(versie.partituur, app.stand.partituur);
    if (partijen.length === 0) {
      vak.append(Object.assign(document.createElement('p'), { className: 'zacht', textContent: 'Geen verschil in de muziek.' }));
      return vak;
    }
    const lijst = document.createElement('ul');
    lijst.append(...partijen.map(regel));
    const knoppen = document.createElement('div');
    knoppen.className = 'origineel__knoppen';
    const huidig = knop('Luister: huidige versie', () => luister(false));
    const oud = knop(`Luister: ${versie.naam}`, () => luister(true));
    huidig.setAttribute('aria-pressed', String(!luistert));
    oud.setAttribute('aria-pressed', String(luistert));
    knoppen.append(huidig, oud);
    vak.append(lijst, knoppen);
    return vak;
  }

  function teken() {
    if (!app.stand.partituur) return vlak.replaceChildren();
    const kop = document.createElement('h2');
    kop.textContent = 'Versies';
    const formulier = document.createElement('form');
    const label = document.createElement('label');
    const naam = Object.assign(document.createElement('input'), { type: 'text', required: true, value: `Versie ${versies().length + 1}` });
    label.append('Naam van de versie ', naam);
    const bewaar = Object.assign(document.createElement('button'), { type: 'submit', className: 'knop', textContent: 'Deze versie bewaren' });
    formulier.append(label, bewaar);
    formulier.addEventListener('submit', (gebeurtenis) => {
      gebeurtenis.preventDefault();
      if (!naam.value.trim()) return;
      status = app.stand.project ? 'Bewaard. Kies Wijzigingen bewaren om hem in het project te houden.' : 'Bewaard. Bewaar ook het project om hem te houden.';
      app.zet({ versies: [...versies(), nieuweVersie(naam.value.trim())] });
    });
    const melding = Object.assign(document.createElement('p'), { className: 'zacht', textContent: status });
    melding.setAttribute('role', 'status');
    vlak.replaceChildren(kop, formulier, melding);

    for (const versie of versies()) {
      const rij = document.createElement('div');
      rij.className = 'versies__rij';
      const titel = document.createElement('p');
      titel.textContent = `${versie.naam} `;
      titel.append(Object.assign(document.createElement('span'), { className: 'zacht', textContent: tijdTekst(versie.tijd) }));
      const knoppen = document.createElement('div');
      knoppen.className = 'origineel__knoppen';
      knoppen.append(
        knop(gekozen === versie.id ? 'Sluiten' : 'Vergelijken', () => kies(gekozen === versie.id ? null : versie.id)),
        knop('Terugzetten', () => zetTerug(versie)),
      );
      rij.append(titel, knoppen);
      if (gekozen === versie.id) rij.append(vergelijking(versie));
      vlak.append(rij);
    }
  }

  app.op('partituur', () => {
    luistert = false; // de speler laadt de nieuwe partituur
    meldVerschil();
    teken();
  });
  app.op('versies', () => {
    if (gekozen && !gekozenVersie()) kies(null);
    else teken();
  });
  app.op('project', (project) => {
    status = '';
    if (!project) app.zet({ versies: [] }); // een nieuw bestand begint zonder versies
  });
  teken();
}
