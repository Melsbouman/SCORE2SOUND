import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { FAMILIES, combinatieKaarten, maakVoorbeeldStuk } from '/src/model/nieuw.mjs';

function maakElement(naam, klasse, tekst = '') {
  const element = document.createElement(naam);
  if (klasse) element.className = klasse;
  element.textContent = tekst;
  return element;
}

export function start(app) {
  const vlak = document.getElementById('nieuw');
  const uploadVlak = document.getElementById('upload');
  vlak.className = 'begin';
  vlak.tabIndex = -1;

  const stappen = maakElement('ol', 'begin__stappen');
  const stapNamen = ['Begin', 'Voor wie', 'Details'];
  const stapKnoppen = stapNamen.map((naam, index) => {
    const stap = maakElement('li', 'begin__stap');
    const nummer = maakElement('span', 'begin__stapnummer', String(index + 1));
    stap.append(nummer, document.createTextNode(naam));
    stappen.append(stap);
    return stap;
  });

  const inhoud = maakElement('div', 'begin__inhoud');
  vlak.replaceChildren(stappen, inhoud);

  function toonStap(nummer) {
    stapKnoppen.forEach((stap, index) => {
      stap.classList.toggle('begin__stap--actief', index === nummer - 1);
      if (index === nummer - 1) stap.setAttribute('aria-current', 'step');
      else stap.removeAttribute('aria-current');
    });
    if (nummer === 1) toonBegin();
    if (nummer === 2) toonVoorWie();
    if (nummer === 3) toonDetails();
  }

  function maakKop(bovenregel, accent, vervolg) {
    const groep = maakElement('div', 'begin__kop');
    const label = maakElement('span', 'begin__label', bovenregel);
    const kop = document.createElement('h2');
    kop.append(document.createTextNode(`${vervolg} `), maakElement('em', '', accent));
    groep.append(label, kop);
    return groep;
  }

  function toonBegin() {
    inhoud.replaceChildren();
    const kop = maakKop('Stap 1', 'beginnen?', 'Hoe wil je');
    const uitleg = maakElement('p', 'begin__intro', 'Open bestaande bladmuziek of begin met een leeg muziekblad.');
    const kaarten = maakElement('div', 'begin__keuzekaarten');

    const scanKaart = maakElement('article', 'begin__hoofdkaart');
    scanKaart.append(
      maakElement('span', 'begin__kaarticoon', '↑'),
      maakElement('h3', '', 'Bladmuziek inscannen'),
      maakElement('p', '', 'Zet een pdf, scan of foto om in muziek die je kunt horen en bewerken.'),
    );
    uploadVlak.classList.add('begin__upload');
    const uploadKop = uploadVlak.querySelector('h2');
    const uploadUitleg = uploadVlak.querySelector('p');
    if (uploadKop) uploadKop.hidden = true;
    if (uploadUitleg) uploadUitleg.textContent = 'Sleep een pdf of foto hierheen of kies een bestand.';
    scanKaart.append(uploadVlak);

    const leegKnop = maakElement('button', 'begin__hoofdkaart begin__hoofdkaart--knop');
    leegKnop.type = 'button';
    leegKnop.append(
      maakElement('span', 'begin__kaarticoon', '+'),
      maakElement('h3', '', 'Leeg blad'),
      maakElement('p', '', 'Kies voor wie je schrijft en stel daarna je nieuwe stuk samen.'),
      maakElement('span', 'begin__pill', 'Kies instrumenten'),
    );
    leegKnop.addEventListener('click', () => toonStap(2));
    kaarten.append(scanKaart, leegKnop);

    const voorbeeld = maakElement('button', 'begin__voorbeeld', 'Voorbeeld bekijken');
    voorbeeld.type = 'button';
    voorbeeld.addEventListener('click', () => {
      const partituur = maakVoorbeeldStuk();
      app.zet({ partituur, meldingen: [], project: null });
      app.meld('bewaar-project', { naam: partituur.titel });
      window.location.hash = '#weergave';
    });
    inhoud.append(kop, uitleg, kaarten, voorbeeld);
  }

  function toonVoorWie() {
    inhoud.replaceChildren();
    const kop = maakKop('Stap 2', 'schrijf je?', 'Voor wie');
    const uitleg = maakElement('p', 'begin__intro', 'Kies een bezetting. Bij Eigen keuze stel je zelf de instrumenten samen.');
    const kaarten = maakElement('div', 'begin__combinaties');
    const eigenKeuze = maakElement('div', 'begin__families');
    eigenKeuze.hidden = true;
    let gekozenKaart = null;
    const gekozenInstrumenten = new Set();

    const verder = maakElement('button', 'begin__knop begin__knop--hoofd', 'Verder');
    verder.type = 'button';
    verder.disabled = true;

    function werkVerderBij() {
      verder.disabled = !gekozenKaart || (gekozenKaart.id === 'eigen' && gekozenInstrumenten.size === 0);
    }

    for (const combinatie of combinatieKaarten()) {
      const kaart = maakElement('button', 'begin__combinatie');
      kaart.type = 'button';
      kaart.append(maakElement('strong', '', combinatie.naam), maakElement('span', '', combinatie.beschrijving));
      kaart.addEventListener('click', () => {
        gekozenKaart = combinatie;
        for (const andereKaart of kaarten.children) andereKaart.classList.remove('begin__combinatie--gekozen');
        kaart.classList.add('begin__combinatie--gekozen');
        eigenKeuze.hidden = combinatie.id !== 'eigen';
        werkVerderBij();
      });
      kaarten.append(kaart);
    }

    for (const familie of FAMILIES) {
      const groep = maakElement('fieldset', 'begin__familie');
      groep.append(maakElement('legend', '', familie.naam));
      const blokken = maakElement('div', 'begin__instrumenten');
      for (const id of familie.instrumenten) {
        const instrument = INSTRUMENTEN.find((item) => item.id === id);
        if (!instrument) continue;
        const knop = maakElement('button', 'begin__instrument', instrument.naam);
        knop.type = 'button';
        knop.setAttribute('aria-pressed', 'false');
        knop.addEventListener('click', () => {
          if (gekozenInstrumenten.has(id)) gekozenInstrumenten.delete(id);
          else gekozenInstrumenten.add(id);
          const gekozen = gekozenInstrumenten.has(id);
          knop.classList.toggle('begin__instrument--gekozen', gekozen);
          knop.setAttribute('aria-pressed', String(gekozen));
          werkVerderBij();
        });
        blokken.append(knop);
      }
      groep.append(blokken);
      eigenKeuze.append(groep);
    }

    const acties = maakElement('div', 'begin__acties');
    const terug = maakElement('button', 'begin__knop begin__knop--licht', 'Terug');
    terug.type = 'button';
    terug.addEventListener('click', () => toonStap(1));
    verder.addEventListener('click', () => toonStap(3));
    acties.append(terug, verder);
    inhoud.append(kop, uitleg, kaarten, eigenKeuze, acties);
  }

  function toonDetails() {
    inhoud.replaceChildren();
    const kop = maakKop('Stap 3', 'details', 'Vul de');
    const plaatshouder = maakElement('div', 'begin__plaatshouder');
    const terug = maakElement('button', 'begin__knop begin__knop--licht', 'Terug');
    terug.type = 'button';
    terug.addEventListener('click', () => toonStap(2));
    plaatshouder.append(terug);
    inhoud.append(kop, plaatshouder);
  }

  function openBegin() {
    if (window.location.hash !== '#begin') return;
    toonStap(1);
    vlak.scrollIntoView({ block: 'start' });
    vlak.focus({ preventScroll: true });
  }

  window.addEventListener('hashchange', openBegin);
  toonStap(1);
  openBegin();
}
