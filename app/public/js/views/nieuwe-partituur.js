// Nieuwe partituur-scherm: instrumentkiezer met tabs en details-stap.
// Exporteert de startfunctie die called wordt wanneer het #begin scherm actief is.

import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { FAMILIES_KIEZER, GENRES, instrumentenVoorFamilie, zoekInstrumenten, sorteerPartituur } from '/src/model/instrumentkiezer.mjs';
import { SJABLONEN, maakLeegStuk, maakVoorbeeldStuk } from '/src/model/nieuw.mjs';

// Hulpfuncties voor DOM manipulatie (gekopieerd uit begin.js)
function maakElement(naam, klasse, tekst = '') {
  const element = document.createElement(naam);
  if (klasse) element.className = klasse;
  element.textContent = tekst;
  return element;
}

function maakKop(bovenregel, accent, vervolg) {
  const groep = maakElement('div', 'begin__kop');
  const label = maakElement('span', 'begin__label', bovenregel);
  const kop = document.createElement('h2');
  kop.append(document.createTextNode(`${vervolg} `), maakElement('em', '', accent));
  groep.append(label, kop);
  return groep;
}

export function start(app) {
  // Container for the begin screen (same as before)
  const vlak = document.getElementById('nieuw');
  vlak.className = 'begin';
  vlak.tabIndex = -1;

  // State voor de nieuwe partituur
  let huidigeTab = 'kies';
  let geselecteerdeFamilieId = FAMILIES_KIEZER[0]?.id ?? null;
  let geselecteerdGenreId = GENRES[0]?.id ?? null;
  let zoekTerm = '';
  let geselecteerdInstrumentId = null; // instrument dat aangeklikt is in de instrumentenlijst
  let partituurInstrumentIds = []; // instrumenten die aan de partituur zijn toegevoegd (volgorde)
  // Voor details-stap: tijdelijke opslag van titel/componist/key/maatsoort
  let detailTitel = '';
  let detailComponist = '';
  let detailToonsoort = '0'; // kwinten waarde
  let detailMaatsoort = '4/4';

  // Bouw de UI
  const inhoud = maakElement('div', 'begin__inhoud');

  // ----- Scankaart (Bladmuziek inscannen) blijft als eerste keuze bovenaan -----
  const scanKaart = maakElement('article', 'begin__hoofdkaart');
  const scanKnop = maakElement('button', 'begin__scan-knop');
  scanKnop.type = 'button';
  scanKnop.append(
    maakElement('span', 'begin__kaarticoon', '↑'),
    maakElement('h3', '', 'Bladmuziek inscannen'),
    maakElement('p', '', 'Zet een pdf, scan of foto om in muziek die je kunt horen en bewerken.'),
  );
  // De uploadVlak section is al aanwezig in het DOM (id="upload")
  const uploadVlak = document.getElementById('upload');
  uploadVlak.classList.add('begin__upload');
  const uploadKop = uploadVlak.querySelector('h2');
  const uploadUitleg = uploadVlak.querySelector('p');
  if (uploadKop) uploadKop.hidden = true;
  if (uploadUitleg) uploadUitleg.textContent = 'Sleep een pdf of foto hierheen of kies een bestand.';
  scanKaart.append(scanKnop, uploadVlak);
  scanKnop.addEventListener('click', () => uploadVlak.querySelector('input[type="file"]')?.click());

  // ----- Tabs -----
  const tabContainer = maakElement('div', 'nieuwe-partituur__tabs');
  const knopKies = maakElement('button', 'nieuwe-partituur__tab', 'Kies instrumenten');
  knopKies.type = 'button';
  const knopSjabloon = maakElement('button', 'nieuwe-partituur__tab', 'Maak van sjabloon');
  knopSjabloon.type = 'button';
  knopKies.addEventListener('click', () => wisselTab('kies'));
  knopSjabloon.addEventListener('click', () => wisselTab('sjabloon'));
  tabContainer.append(knopKies, knopSjabloon);

  // Inhoud van de tabpanelen
  const tabPaneelContainer = maakElement('div', 'nieuwe-partituur__paneel-container');

  const paneelKies = maakElement('section', 'nieuwe-partituur__paneel', 'kies');
  paneelKies.id = 'tab-kies';
  const paneelSjabloon = maakElement('section', 'nieuwe-partituur:\_paneel', 'sjabloon');
  paneelSjabloon.id = 'tab-sjabloon';
  paneelSjabloon.hidden = true;
  tabPaneelContainer.append(paneelKies, paneelSjabloon);

  // ----- Kolom 1: Familie (GENRES dropdown + FAMILIES_KIEZER lijst) -----
  const kolomFamilie = maakElement('div', 'nieuwe-partituur__kolom nieuwe-partituur__kolom--familie');
  kolomFamilie.append(maakKop('Stap 1', 'beginnen?', 'Hoe wil je'));

  // Genre dropdown
  const genreSelect = document.createElement('select');
  genreSelect.className = 'nieuwe-partituur__genre-select';
  for (const genre of GENRES) {
    const optie = document.createElement('option');
    optie.value = genre.id;
    optie.textContent = genre.naam;
    genreSelect.append(optie);
  }
  genreSelect.value = geselecteerdGenreId;
  genreSelect.addEventListener('change', (e) => {
    geselecteerdGenreId = e.target.value;
    renderInstrumenten();
    renderPartituur(); // bij verandering van volgorde
  });

  kolomFamilie.append(genreSelect);

  // Lijst van families (FAMILIES_KIEZER)
  const familiesList = maakElement('div', 'nieuwe-partituur__families-list');
  function renderFamiliesList() {
    familiesList.replaceChildren();
    for (const familie of FAMILIES_KIEZER) {
      const knop = maakElement('button', 'nieuwe-partituur__familie-knop', familie.naam);
      knop.type = 'button';
      if (familie.id === geselecteerdeFamilieId) knop.classList.add('nieuwe-partituur__familie-knop--gekozen');
      knop.addEventListener('click', () => {
        geselecteerdeFamilieId = familie.id;
        renderInstrumenten();
      });
      familiesList.append(knop);
    }
  }
  renderFamiliesList();

  kolomFamilie.append(familiesList);

  // ----- Kolom 2: Instrumenten (zoek + lijst) -----
  const kolomInstrumenten = maakElement('div', 'nieuwe-partituur__kolom nieuwe-partituur__kolom--instrumenten');
  kolomInstrumenten.append(maakKop('Stap 2', 'kies?', 'Kies je'));

  const zoekInput = document.createElement('input');
  zoekInput.type = 'search';
  zoekInput.placeholder = 'Zoek instrument...';
  zoekInput.className = 'nieuwe-partituur__zoek-input';
  zoekInput.addEventListener('input', (e) => {
    zoekTerm = e.target.value;
    renderInstrumenten();
  });
  kolomInstrumenten.append(zoekInput);

  const instrumentList = maakElement('div', 'nieuwe-partituur__instrumenten-list');

  function renderInstrumenten() {
    instrumentList.replaceChildren();
    const instrumenten = instrumentenVoorFamilie(geselecteerdeFamilieId);
    const gefilterd = zoekTerm
      ? zoekInstrumenten(zoekTerm).filter((inst) => FAMILIE_VAN[inst.id] === geselecteerdeFamilieId)
      : instrumenten;
    for (const inst of gefilterd) {
      const knop = maakElement('button', 'nieuwe-partituur__instrument-knop', inst.naam);
      knop.type = 'button';
      if (inst.id === geselecteerdInstrumentId) knop.classList.add('nieuwe-partituur__instrument-knop--gekozen');
      knop.addEventListener('click', () => {
        // single click select
        geselecteerdInstrumentId = inst.id;
        renderInstrumenten();
      });
      knop.addEventListener('dblclick', () => {
        voegInstrumentToe(inst.id);
      });
      instrumentList.append(knop);
    }
  }

  kolomInstrumenten.append(instrumentList);

  // ----- Kolom 3: Pijlknop -----
  const kolomPijl = maakElement('div', 'nieuwe-partituur__kolom nieuwe-partituur__kolom--pfeil');
  const pijlKnop = maakElement('button', 'nieuwe-partituur__pfeil-knop', '→');
  pijlKnop.type = 'button';
  pijlKnop.ariaLabel = 'Instrument toevoegen';
  pijlKnop.addEventListener('click', () => {
    if (geselecteerdInstrumentId) voegInstrumentToe(geselecteerdInstrumentId);
  });
  kolomPijl.append(pijlKnop);

  // ----- Kolom 4: Uw partituur -----
  const kolomPartituur = maakElement('div', 'nieuwe-partituur__kolom nieuwe-partituur__kolom--partituur');
  kolomPartituur.append(maakKop('Uw partituur', 'constructie', 'Stel'));

  // Volgorde dropdown
  const volgordeSelect = document.createElement('select');
  volgordeSelect.className = 'nieuwe-partituur__volgorde-select';
  const labelVolgorde = maakElement('span', '', 'Volgorde:');
  volgordeSelect.append(labelVolgorde);
  for (const genre of GENRES) {
    const optie = document.createElement('option');
    optie.value = genre.id;
    optie.textContent = genre.naam;
    volgordeSelect.append(optie);
  }
  volgordeSelect.value = geselecteerdGenreId;
  volgordeSelect.addEventListener('change', (e) => {
    geselecteerdGenreId = e.target.value;
    renderPartituur();
  });
  kolomPartituur.append(volgordeSelect);

  // Lijst van geselecteerde instrumenten
  const partituurList = maakElement('ul', 'nieuwe-partituur__partituur-list');

  function renderPartituur() {
    // sorteer met sorteerPartituur
    const gesorteerd = sorteerPartituur(partituurInstrumentIds, geselecteerdGenreId);
    partituurList.replaceChildren();
    for (let i = 0; i < gesorteerd.length; i++) {
      const id = gesorteerd[i];
      const instrument = INSTRUMENTEN.find((i) => i.id === id);
      if (!instrument) continue;
      const li = maakElement('li', 'nieuwe-partituur__partij-item', instrument.naam);
      const acties = maakElement('div', 'nieuwe-partituur__partij-acties');
      if (gesorteerd.length > 1) {
        const upKnop = maakElement('button', 'nieuwe-partituur__verplaats-knop', '↑');
        upKnop.type = 'button';
        upKnop.addEventListener('click', () => {
          if (i > 0) {
            [gesorteerd[i - 1], gesorteerd[i]] = [gesorteerd[i], gesorteerd[i - 1]];
            partituurInstrumentIds = gesorteerd;
            renderPartituur();
          }
        });
        const downKnop = maakElement('button', 'nieuwe-partituur__verplaats-knop', '↓');
        downKnop.type = 'button';
        downKnop.addEventListener('click', () => {
          if (i < gesorteerd.length - 1) {
            [gesorteerd[i], gesorteerd[i + 1]] = [gesorteerd[i + 1], gesorteerd[i]];
            partituurInstrumentIds = gesorteerd;
            renderPartituur();
          }
        });
        acties.append(upKnop, downKnop);
      }
      const delKnop = maakElement('button', 'nieuwe-partituur__verwijder-knop', '×');
      delKnop.type = 'button';
      delKnop.addEventListener('click', () => {
        partituurInstrumentIds = partituurInstrumentIds.filter((_, idx) => idx !== i);
        renderPartituur();
        if (geselecteerdInstrumentId === id) geselecteerdInstrumentId = null;
      });
      acties.append(delKnop);
      li.append(acties);
      partituurList.append(li);
    }
    // Update de partituurInstrumentIds array met de gesorteerde volgorde
    partituurInstrumentIds = gesorteerd;
  }

  kolomPartituur.append(volgordeSelect, partituurList);

  // Voeg kolommen toe aan paneelKies
  paneelKies.append(kolomFamilie, kolomInstrumenten, kolomPijl, kolomPartituur);

  // ----- Tab 'Maak van sjabloon' -----
  const sjabloonList = maakElement('div', 'nieuwe-partituur__sjabloon-lijst');
  for (const sjabloon of SJABLONEN) {
    const kaart = maakElement('article', 'nieuwe-partituur__sjabloon-kaart');
    const naam = maakElement('h3', '', sjabloon.naam);
    const beschrijving = maakElement('p', '', `Bevat ${sjabloon.instrumenten.length} instrument${sjabloon.instrumenten.length === 1 ? '' : 'en'}.`);
    const kiesKnop = maakElement('button', 'nieuwe-partituur__sjabloon-knop', 'Kies');
    kiesKnop.type = 'button';
    kiesKnop.addEventListener('click', () => {
      for (const id of sjabloon.instrumenten) {
        if (!partituurInstrumentIds.includes(id)) partituurInstrumentIds.push(id);
      }
      renderPartituur();
    });
    kaart.append(naam, beschrijving, kiesKnop);
    sjabloonList.append(kaart);
  }
  paneelSjabloon.append(sjabloonList);

  // ----- Onderstaande acties (Annuleren, Volgende, Klaar) -----
  const onderActions = maakElement('div', 'nieuwe-partituur__onder-actions');
  const annuleerKnop = maakElement('button', 'nieuwe-partituur__annuleer-knop', 'Annuleren');
  annuleerKnop.type = 'button';
  annuleerKnop.addEventListener('click', () => {
    window.location.hash = '#projecten';
  });
  const volgendeKnop = maakElement('button', 'nieuwe-partituur__volgende-knop', 'Volgende');
  volgendeKnop.type = 'button';
  volgendeKnop.disabled = partituurInstrumentIds.length === 0;
  volgendeKnop.addEventListener('click', toonDetailsStap);
  const klaarKnop = maakElement('button', 'nieuwe-partituur__klaar-knop', 'Klaar');
  klaarKnop.type = 'button';
  klaarKnop.disabled = partituurInstrumentIds.length === 0;
  klaarKnop.addEventListener('click', maakStuk);

  partituurInstrumentIds.length === 0 ? (volgendeKnop.disabled = true, klaarKnop.disabled = true) : (volgendeKnop.disabled = false, klaarKnop.disabled = false);

  onderActions.append(annuleerKnop, volgendeKnop, klaarKnop);

  // Hulpfuncties
  function voegInstrumentToe(id) {
    if (!partituurInstrumentIds.includes(id)) partituurInstrumentIds.push(id);
    geselecteerdInstrumentId = null;
    renderInstrumenten();
    renderPartituur();
    volgendeKnop.disabled = false;
    klaarKnop.disabled = false;
  }

  function wisselTab(tab) {
    huidigeTab = tab;
    knopKies.classList.toggle('nieuwe-partituur__tab--actief', tab === 'kies');
    knopSjabloon.classList.toggle('nieuwe-partituur__tab--actief', tab === 'sjabloon');
    paneelKies.hidden = tab !== 'kies';
    paneelSjabloon.hidden = tab !== 'sjabloon';
  }

  function renderInstrumenten() {
    // reeds gedefinieerd hierboven, maar we hebben een versie nodig die het externe STATE kan aanvullen
    instrumentList.replaceChildren();
    const instrumenten = instrumentenVoorFamilie(geselecteerdeFamilieId);
    const gefilterd = zoekTerm
      ? zoekInstrumenten(zoekTerm).filter((inst) => FAMILIE_VAN[inst.id] === geselecteerdeFamilieId)
      : instrumenten;
    for (const inst of gefilterd) {
      const knop = maakElement('button', 'nieuwe-partituur__instrument-knop', inst.naam);
      knop.type = 'button';
      if (inst.id === geselecteerdInstrumentId) knop.classList.add('nieuwe-partituur__instrument-knop--gekozen');
      knop.addEventListener('click', () => {
        geselecteerdInstrumentId = inst.id;
        renderInstrumenten();
      });
      knop.addEventListener('dblclick', () => voegInstrumentToe(inst.id));
      instrumentList.append(knop);
    }
  }

  // Initiale weergave
  wisselTab('kies');
  // Bouw de UI-struktuur in vlak
  vlak.replaceChildren(scanKaart, tabContainer, tabPaneelContainer, onderActions);

  // ---- Details stap UI ----
  function toonDetailsStap() {
    // Verberg het huidige scherm en toon het detailsformulier
    vlak.replaceChildren();
    const kop = maakKop('Stap 3', 'details', 'Vul de');
    const uitleg = maakElement('p', 'begin__intro', 'Geef je stuk een naam en kies de muzikale basis. Je kunt dit later nog aanpassen.');
    const indeling = maakElement('div', 'begin__details');
    const formulier = maakElement('form', 'begin__formulier');
    formulier.noValidate = true;

    // Titelveld
    const titelGroep = maakElement('label', 'begin__veld');
    const titelLabel = maakElement('span', 'begin__veldlabel', 'Titel');
    const titelVeld = document.createElement('input');
    titelVeld.id = 'begin-titel';
    titelVeld.name = 'titel';
    titelVeld.type = 'text';
    titelVeld.placeholder = 'Naam van je stuk';
    titelGroep.htmlFor = titelVeld.id;
    titelGroep.append(titelLabel, titelVeld);

    // Componistveld
    const componistGroep = maakElement('label', 'begin__veld');
    const componistLabel = maakElement('span', 'begin__veldlabel', 'Componist');
    const componistVeld = document.createElement('input');
    componistVeld.id = 'begin-componist';
    componistVeld.name = 'componist';
    componistVeld.type = 'text';
    componistVeld.placeholder = 'Naam van de componist';
    componistGroep.htmlFor = componistVeld.id;
    componistGroep.append(componistLabel, componistVeld);

    // Maatsoortkeuze
    const maatsoortGroep = maakElement('fieldset', 'begin__veld begin__keuzeveld');
    maatsoortGroep.append(maakElement('legend', 'begin__veldlabel', 'Maatsoort'));
    const maatsoorten = maakElement('div', 'begin__maatsoorten');
    let geselecteerdeMaatsoort = '4/4';
    for (const waarde of ['2/4', '3/4', '4/4', '6/8', '3/8', '2/2']) {
      const knop = maakElement('button', 'begin__maatsoort', waarde);
      knop.type = 'button';
      knop.classList.toggle('begin__maatsoort--gekozen', waarde === geselecteerdeMaatsoort);
      knop.setAttribute('aria-pressed', String(waarde === geselecteerdeMaatsoort));
      knop.addEventListener('click', () => {
        geselecteerdeMaatsoort = waarde;
        for (const andereKnop of maatsoorten.children) {
          const gekozen = andereKnop === knop;
          andereKnop.classList.toggle('begin__maatsoort--gekozen', gekozen);
          andereKnop.setAttribute('aria-pressed', String(gekozen));
        }
      });
      maatsoorten.append(knop);
    }
    maatsoortGroep.append(maatsoorten);

    // Toonsoortselectie (gebaseerd op TOONSOORTEN uit begin.js)
    const toonsoortGroep = maakElement('label', 'begin__veld');
    toonsoortGroep.append(maakElement('span', 'begin__veldlabel', 'Toonsoort'));
    const toonsoortSelect = document.createElement('select');
    toonsoortSelect.id = 'begin-toonsoort';
    toonsoortSelect.name = 'toonsoort';
    toonsoortGroep.htmlFor = toonsoortSelect.id;
    const TOONSOORTEN = [
      [-7, 'Ces majeur'], [-6, 'Ges majeur'], [-5, 'Des majeur'], [-4, 'As majeur'],
      [-3, 'Es majeur'], [-2, 'Bes majeur'], [-1, 'F majeur'], [0, 'C majeur'],
      [1, 'G majeur'], [2, 'D majeur'], [3, 'A majeur'], [4, 'E majeur'],
      [5, 'B majeur'], [6, 'Fis majeur'], [7, 'Cis majeur']
    ];
    for (const [waarde, naam] of TOONSOORTEN) {
      const optie = document.createElement('option');
      optie.value = waarde;
      optie.textContent = naam;
      toonsoortSelect.append(optie);
    }
    toonsoortSelect.value = detailToonsoort;
    toonsoortGroep.append(tonsoortSelect);

    // Error placeholder
    const instrumentFout = maakElement('p', 'begin__veldfout');

    formulier.append(titelGroep, componistGroep, maatsoortGroep, toonsoortGroep, instrumentFout);

    const acties = maakElement('div', 'begin__acties begin__acties--details');
    const terugKnop = maakElement('button', 'begin__knop begin__knop--licht', 'Terug');
    terugKnop.type = 'button';
    terugKnop.addEventListener('click', () => {
      vlak.replaceChildren(scanKaart, tabContainer, tabPaneelContainer, onderActions);
      wisselTab('kies');
      // herstel de state van de instrumentkiezer indien nodig
    });
    const maakStukKnop = maakElement('button', 'begin__knop begin__knop--hoofd', 'Maak mijn stuk');
    maakStukKnop.type = 'submit';
    acties.append(terugKnop, maakStukKnop);
    formulier.append(acties);

    indeling.append(formulier);
    inhoud.append(kop, uitleg, indeling);
    vlak.replaceChildren(inhoud);

    // Handler voor details formulier submit
    formulier.addEventListener('submit', (e) => {
      e.preventDefault();
      detailTitel = titelVeld.value.trim();
      detailComponist = componistVeld.value.trim();
      detailToonsoort = toonsoortSelect.value;
      // maatsoort we already have geselecteerdeMaatsoort; need to capture chosen one; for now use default '4/4'
      detailMaatsoort = geselecteerdeMaatsoort;
      maakStuk();
    });
  }

  function maakStuk() {
    const [teller, noemer] = detailMaatsoort.split('/').map(Number);
    const partituur = maakLeegStuk({
      titel: detailTitel,
      componist: detailComponist,
      instrumenten: partituurInstrumentIds,
      maatsoort: { teller, noemer },
      kwinten: Number(detailToonsoort),
      tempo: 100,
      aantalMaten: 8,
    });
    app.zet({ partituur, meldingen: [], project: null });
    app.meld('bewaar-project', { naam: partituur.titel || 'Nieuw stuk' });
    app.meld('start-invoermodus', { partijId: partituur.partijen[0].id, maat: 0 });
    window.location.hash = '#bewerken';
  }

  // Expose functions for testing if needed
  start.app = app;
  return start;
}