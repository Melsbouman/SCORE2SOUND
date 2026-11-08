import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { SJABLONEN } from '/src/model/nieuw.mjs';
import { FAMILIES_KIEZER, GENRES, instrumentenVoorFamilie, sorteerPartituur, zoekInstrumenten } from '/src/model/instrumentkiezer.mjs';

function maak(naam, klasse, tekst = '') {
  const element = document.createElement(naam);
  if (klasse) element.className = klasse;
  element.textContent = tekst;
  return element;
}

function maakKnop(klasse, tekst, label) {
  const knop = maak('button', klasse, tekst);
  knop.type = 'button';
  if (label) knop.setAttribute('aria-label', label);
  return knop;
}

function instrumentNaam(id) {
  return INSTRUMENTEN.find((instrument) => instrument.id === id)?.naam ?? id;
}

// Het keuzescherm "Nieuwe partituur": twee tabs, vier kolommen en de knoppen Annuleren, Volgende en Klaar.
export function maakKiezer({ gekozen = [], genre = 'regulier', onAnnuleren, onVolgende, onKlaar }) {
  const wortel = maak('section', 'kiezer');
  let lijst = [...gekozen];
  let genreId = genre;
  let familieId = FAMILIES_KIEZER[0].id;
  let zoektekst = '';
  let gekozenInstrument = null;
  let gekozenRij = -1;

  const tabs = maak('div', 'kiezer__tabs');
  tabs.setAttribute('role', 'tablist');
  const tabInstrumenten = maakKnop('kiezer__tab kiezer__tab--actief', 'Kies instrumenten');
  const tabSjabloon = maakKnop('kiezer__tab', 'Maak van sjabloon');
  for (const tab of [tabInstrumenten, tabSjabloon]) tab.setAttribute('role', 'tab');
  tabs.append(tabInstrumenten, tabSjabloon);

  const paneelInstrumenten = maak('div', 'kiezer__kolommen');
  const paneelSjabloon = maak('div', 'kiezer__sjablonen');
  paneelSjabloon.hidden = true;

  function kiesTab(sjabloon) {
    paneelInstrumenten.hidden = sjabloon;
    paneelSjabloon.hidden = !sjabloon;
    tabInstrumenten.classList.toggle('kiezer__tab--actief', !sjabloon);
    tabSjabloon.classList.toggle('kiezer__tab--actief', sjabloon);
    tabInstrumenten.setAttribute('aria-selected', String(!sjabloon));
    tabSjabloon.setAttribute('aria-selected', String(sjabloon));
  }
  tabInstrumenten.addEventListener('click', () => kiesTab(false));
  tabSjabloon.addEventListener('click', () => kiesTab(true));
  kiesTab(false);

  // Kolom 1: familie.
  const kolomFamilie = maak('div', 'kiezer__kolom');
  kolomFamilie.append(maak('h3', '', 'Familie'));
  const genreKeuze = document.createElement('select');
  genreKeuze.className = 'kiezer__keuzelijst';
  genreKeuze.setAttribute('aria-label', 'Genre');
  for (const item of GENRES) {
    const optie = document.createElement('option');
    optie.value = item.id;
    optie.textContent = item.naam;
    genreKeuze.append(optie);
  }
  genreKeuze.value = genreId;
  const familieLijst = maak('ul', 'kiezer__lijst');
  kolomFamilie.append(genreKeuze, familieLijst);

  // Kolom 2: instrumenten.
  const kolomInstrumenten = maak('div', 'kiezer__kolom');
  kolomInstrumenten.append(maak('h3', '', 'Instrumenten'));
  const zoekveld = document.createElement('input');
  zoekveld.type = 'search';
  zoekveld.className = 'kiezer__zoek';
  zoekveld.placeholder = 'Zoek instrument';
  zoekveld.setAttribute('aria-label', 'Zoek instrument');
  const instrumentLijst = maak('ul', 'kiezer__lijst');
  kolomInstrumenten.append(zoekveld, instrumentLijst);

  // Kolom 3: toevoegen.
  const kolomPijl = maak('div', 'kiezer__kolom kiezer__kolom--pijl');
  const toevoegKnop = maakKnop('kiezer__pijl', '→', 'Voeg het gekozen instrument toe aan uw partituur');
  kolomPijl.append(toevoegKnop);

  // Kolom 4: uw partituur.
  const kolomPartituur = maak('div', 'kiezer__kolom');
  kolomPartituur.append(maak('h3', '', 'Uw partituur'));
  const volgordeKeuze = document.createElement('select');
  volgordeKeuze.className = 'kiezer__keuzelijst';
  volgordeKeuze.setAttribute('aria-label', 'Volgorde');
  for (const item of GENRES) {
    const optie = document.createElement('option');
    optie.value = item.id;
    optie.textContent = `Volgorde: ${item.naam}`;
    volgordeKeuze.append(optie);
  }
  volgordeKeuze.value = genreId;
  const partituurLijst = maak('ol', 'kiezer__lijst');
  const rijKnoppen = maak('div', 'kiezer__rijknoppen');
  const omhoog = maakKnop('kiezer__klein', '↑', 'Omhoog');
  const omlaag = maakKnop('kiezer__klein', '↓', 'Omlaag');
  const weg = maakKnop('kiezer__klein', '✕', 'Verwijderen');
  rijKnoppen.append(omhoog, omlaag, weg);
  kolomPartituur.append(volgordeKeuze, partituurLijst, rijKnoppen);

  paneelInstrumenten.append(kolomFamilie, kolomInstrumenten, kolomPijl, kolomPartituur);

  const acties = maak('div', 'begin__acties kiezer__acties');
  const annuleren = maakKnop('begin__knop begin__knop--licht', 'Annuleren');
  const volgende = maakKnop('begin__knop begin__knop--hoofd', 'Volgende');
  const klaar = maakKnop('begin__knop begin__knop--hoofd', 'Klaar');
  acties.append(annuleren, volgende, klaar);

  function voegToe(id) {
    if (!id) return;
    lijst = sorteerPartituur([...lijst, id], genreId);
    gekozenRij = lijst.lastIndexOf(id);
    tekenPartituur();
  }

  function tekenFamilies() {
    familieLijst.replaceChildren();
    for (const familie of FAMILIES_KIEZER) {
      const item = maak('li');
      const knop = maakKnop('kiezer__item', familie.naam);
      const actief = familie.id === familieId;
      knop.classList.toggle('kiezer__item--gekozen', actief);
      knop.setAttribute('aria-pressed', String(actief));
      knop.addEventListener('click', () => {
        familieId = familie.id;
        zoektekst = '';
        zoekveld.value = '';
        gekozenInstrument = null;
        tekenFamilies();
        tekenInstrumenten();
      });
      item.append(knop);
      familieLijst.append(item);
    }
  }

  function tekenInstrumenten() {
    instrumentLijst.replaceChildren();
    const bron = zoektekst.trim() ? zoekInstrumenten(zoektekst) : instrumentenVoorFamilie(familieId);
    for (const instrument of bron) {
      const item = maak('li');
      const knop = maakKnop('kiezer__item', instrument.naam);
      const actief = instrument.id === gekozenInstrument;
      knop.classList.toggle('kiezer__item--gekozen', actief);
      knop.setAttribute('aria-pressed', String(actief));
      knop.addEventListener('click', () => {
        gekozenInstrument = instrument.id;
        tekenInstrumenten();
      });
      knop.addEventListener('dblclick', () => voegToe(instrument.id));
      item.append(knop);
      instrumentLijst.append(item);
    }
    if (bron.length === 0) instrumentLijst.append(maak('li', 'kiezer__leeg', 'Geen instrumenten gevonden.'));
    toevoegKnop.disabled = !gekozenInstrument;
  }

  function tekenPartituur() {
    partituurLijst.replaceChildren();
    lijst.forEach((id, index) => {
      const item = maak('li');
      const knop = maakKnop('kiezer__item', instrumentNaam(id));
      const actief = index === gekozenRij;
      knop.classList.toggle('kiezer__item--gekozen', actief);
      knop.setAttribute('aria-pressed', String(actief));
      knop.addEventListener('click', () => {
        gekozenRij = index;
        tekenPartituur();
      });
      item.append(knop);
      partituurLijst.append(item);
    });
    if (lijst.length === 0) partituurLijst.append(maak('li', 'kiezer__leeg', 'Nog geen instrumenten gekozen.'));
    omhoog.disabled = gekozenRij <= 0;
    omlaag.disabled = gekozenRij < 0 || gekozenRij >= lijst.length - 1;
    weg.disabled = gekozenRij < 0;
    volgende.disabled = lijst.length === 0;
    klaar.disabled = lijst.length === 0;
  }

  function verplaats(richting) {
    const doel = gekozenRij + richting;
    if (gekozenRij < 0 || doel < 0 || doel >= lijst.length) return;
    [lijst[gekozenRij], lijst[doel]] = [lijst[doel], lijst[gekozenRij]];
    gekozenRij = doel;
    tekenPartituur();
  }

  genreKeuze.addEventListener('change', () => {
    genreId = genreKeuze.value;
    volgordeKeuze.value = genreId;
    lijst = sorteerPartituur(lijst, genreId);
    tekenPartituur();
  });
  volgordeKeuze.addEventListener('change', () => {
    genreId = volgordeKeuze.value;
    genreKeuze.value = genreId;
    lijst = sorteerPartituur(lijst, genreId);
    gekozenRij = -1;
    tekenPartituur();
  });
  zoekveld.addEventListener('input', () => {
    zoektekst = zoekveld.value;
    tekenInstrumenten();
  });
  toevoegKnop.addEventListener('click', () => voegToe(gekozenInstrument));
  omhoog.addEventListener('click', () => verplaats(-1));
  omlaag.addEventListener('click', () => verplaats(1));
  weg.addEventListener('click', () => {
    if (gekozenRij < 0) return;
    lijst.splice(gekozenRij, 1);
    gekozenRij = Math.min(gekozenRij, lijst.length - 1);
    tekenPartituur();
  });
  annuleren.addEventListener('click', () => onAnnuleren?.());
  volgende.addEventListener('click', () => onVolgende?.([...lijst], genreId));
  klaar.addEventListener('click', () => onKlaar?.([...lijst], genreId));

  for (const sjabloon of SJABLONEN) {
    const kaart = maakKnop('kiezer__sjabloon');
    kaart.append(maak('strong', '', sjabloon.naam), maak('span', '', sjabloon.instrumenten.map(instrumentNaam).join(', ')));
    kaart.addEventListener('click', () => {
      lijst = sorteerPartituur([...sjabloon.instrumenten], genreId);
      gekozenRij = -1;
      tekenPartituur();
      kiesTab(false);
    });
    paneelSjabloon.append(kaart);
  }

  tekenFamilies();
  tekenInstrumenten();
  tekenPartituur();
  wortel.append(tabs, paneelInstrumenten, paneelSjabloon, acties);
  return wortel;
}
