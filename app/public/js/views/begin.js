import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { FAMILIES, combinatieKaarten, maakLeegStuk, maakVoorbeeldStuk } from '/src/model/nieuw.mjs';

const TOONSOORTEN = [
  [-7, 'Ces majeur'],
  [-6, 'Ges majeur'],
  [-5, 'Des majeur'],
  [-4, 'As majeur'],
  [-3, 'Es majeur'],
  [-2, 'Bes majeur'],
  [-1, 'F majeur'],
  [0, 'C majeur'],
  [1, 'G majeur'],
  [2, 'D majeur'],
  [3, 'A majeur'],
  [4, 'E majeur'],
  [5, 'B majeur'],
  [6, 'Fis majeur'],
  [7, 'Cis majeur'],
];

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
  let gekozenInstrumenten = [];

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
    const eigenInstrumenten = new Set();

    const verder = maakElement('button', 'begin__knop begin__knop--hoofd', 'Verder');
    verder.type = 'button';
    verder.disabled = true;

    function werkVerderBij() {
      verder.disabled = !gekozenKaart || (gekozenKaart.id === 'eigen' && eigenInstrumenten.size === 0);
    }

    for (const combinatie of combinatieKaarten()) {
      const kaart = maakElement('button', 'begin__combinatie');
      kaart.type = 'button';
      kaart.append(maakElement('strong', '', combinatie.naam), maakElement('span', '', combinatie.beschrijving));
      kaart.addEventListener('click', () => {
        gekozenKaart = combinatie;
        gekozenInstrumenten = combinatie.id === 'eigen' ? [...eigenInstrumenten] : [...combinatie.instrumenten];
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
          if (eigenInstrumenten.has(id)) eigenInstrumenten.delete(id);
          else eigenInstrumenten.add(id);
          gekozenInstrumenten = [...eigenInstrumenten];
          const gekozen = eigenInstrumenten.has(id);
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
    const uitleg = maakElement('p', 'begin__intro', 'Geef je stuk een naam en kies de muzikale basis. Je kunt dit later nog aanpassen.');
    const indeling = maakElement('div', 'begin__details');
    const formulier = maakElement('form', 'begin__formulier');
    formulier.noValidate = true;

    function maakTekstveld(naam, labelTekst, plaatshouder) {
      const groep = maakElement('label', 'begin__veld');
      const label = maakElement('span', 'begin__veldlabel', labelTekst);
      const veld = document.createElement('input');
      veld.id = `begin-${naam}`;
      veld.name = naam;
      veld.type = 'text';
      veld.placeholder = plaatshouder;
      groep.htmlFor = veld.id;
      groep.append(label, veld);
      return { groep, veld };
    }

    const titel = maakTekstveld('titel', 'Titel', 'Naam van je stuk');
    const componist = maakTekstveld('componist', 'Componist', 'Naam van de componist');

    const maatsoortGroep = maakElement('fieldset', 'begin__veld begin__keuzeveld');
    maatsoortGroep.append(maakElement('legend', 'begin__veldlabel', 'Maatsoort'));
    const maatsoorten = maakElement('div', 'begin__maatsoorten');
    let gekozenMaatsoort = '4/4';
    for (const waarde of ['2/4', '3/4', '4/4', '6/8', '3/8', '2/2']) {
      const knop = maakElement('button', 'begin__maatsoort', waarde);
      knop.type = 'button';
      knop.classList.toggle('begin__maatsoort--gekozen', waarde === gekozenMaatsoort);
      knop.setAttribute('aria-pressed', String(waarde === gekozenMaatsoort));
      knop.addEventListener('click', () => {
        gekozenMaatsoort = waarde;
        for (const andereKnop of maatsoorten.children) {
          const gekozen = andereKnop === knop;
          andereKnop.classList.toggle('begin__maatsoort--gekozen', gekozen);
          andereKnop.setAttribute('aria-pressed', String(gekozen));
        }
        werkSamenvattingBij();
      });
      maatsoorten.append(knop);
    }
    maatsoortGroep.append(maatsoorten);

    const toonsoortGroep = maakElement('label', 'begin__veld');
    toonsoortGroep.append(maakElement('span', 'begin__veldlabel', 'Toonsoort'));
    const toonsoort = document.createElement('select');
    toonsoort.id = 'begin-toonsoort';
    toonsoort.name = 'toonsoort';
    toonsoortGroep.htmlFor = toonsoort.id;
    for (const [waarde, naam] of TOONSOORTEN) {
      const optie = document.createElement('option');
      optie.value = waarde;
      optie.textContent = naam;
      toonsoort.append(optie);
    }
    toonsoort.value = '0';
    toonsoortGroep.append(toonsoort);

    function maakGetalveld(naam, labelTekst, waarde, minimum, maximum) {
      const groep = maakElement('div', 'begin__veld');
      const label = maakElement('label', 'begin__veldlabel', labelTekst);
      const regel = maakElement('div', 'begin__getalregel');
      const min = maakElement('button', 'begin__getalknop', '−');
      const veld = document.createElement('input');
      const plus = maakElement('button', 'begin__getalknop', '+');
      const fout = maakElement('p', 'begin__veldfout');
      veld.id = `begin-${naam}`;
      veld.name = naam;
      veld.type = 'number';
      veld.min = String(minimum);
      veld.max = String(maximum);
      veld.value = String(waarde);
      veld.required = true;
      label.htmlFor = veld.id;
      min.type = 'button';
      plus.type = 'button';
      min.setAttribute('aria-label', `${labelTekst} verlagen`);
      plus.setAttribute('aria-label', `${labelTekst} verhogen`);
      min.addEventListener('click', () => {
        veld.value = String(Number(veld.value) - 1);
        veld.dispatchEvent(new Event('input'));
      });
      plus.addEventListener('click', () => {
        veld.value = String(Number(veld.value) + 1);
        veld.dispatchEvent(new Event('input'));
      });
      regel.append(min, veld, plus);
      groep.append(label, regel, fout);
      return { groep, veld, fout };
    }

    const tempo = maakGetalveld('tempo', 'Tempo', 100, 30, 300);
    const aantalMaten = maakGetalveld('aantal-maten', 'Aantal maten', 8, 1, 400);
    const instrumentFout = maakElement('p', 'begin__veldfout');
    formulier.append(
      titel.groep,
      componist.groep,
      maatsoortGroep,
      toonsoortGroep,
      tempo.groep,
      aantalMaten.groep,
      instrumentFout,
    );

    const samenvatting = maakElement('aside', 'begin__samenvatting');
    samenvatting.append(maakElement('span', 'begin__label', 'Overzicht'), maakElement('h3', '', 'Jouw stuk'));
    const overzicht = document.createElement('dl');
    samenvatting.append(overzicht);

    function voegSamenvattingToe(naam, waarde) {
      overzicht.append(maakElement('dt', '', naam), maakElement('dd', '', waarde));
    }

    function instrumentNamen() {
      return gekozenInstrumenten.map((id) => INSTRUMENTEN.find((instrument) => instrument.id === id)?.naam ?? id);
    }

    function werkSamenvattingBij() {
      overzicht.replaceChildren();
      voegSamenvattingToe('Instrumenten', instrumentNamen().join(', ') || 'Nog niet gekozen');
      voegSamenvattingToe('Maatsoort', gekozenMaatsoort);
      voegSamenvattingToe('Toonsoort', toonsoort.options[toonsoort.selectedIndex].textContent);
      voegSamenvattingToe('Tempo', `${tempo.veld.value || '—'} bpm`);
      voegSamenvattingToe('Aantal maten', aantalMaten.veld.value || '—');
    }

    for (const veld of [toonsoort, tempo.veld, aantalMaten.veld]) {
      veld.addEventListener('input', werkSamenvattingBij);
    }
    werkSamenvattingBij();

    const acties = maakElement('div', 'begin__acties begin__acties--details');
    const terug = maakElement('button', 'begin__knop begin__knop--licht', 'Terug');
    terug.type = 'button';
    terug.addEventListener('click', () => toonStap(2));
    const maken = maakElement('button', 'begin__knop begin__knop--hoofd', 'Maak mijn stuk');
    maken.type = 'submit';
    acties.append(terug, maken);
    formulier.append(acties);
    indeling.append(formulier, samenvatting);
    inhoud.append(kop, uitleg, indeling);

    formulier.addEventListener('submit', (gebeurtenis) => {
      gebeurtenis.preventDefault();
      instrumentFout.textContent = gekozenInstrumenten.length ? '' : 'Kies minstens één instrument.';
      const matenWaarde = Number(aantalMaten.veld.value);
      if (!Number.isInteger(matenWaarde) || matenWaarde < 1) {
        aantalMaten.fout.textContent = 'Het aantal maten moet minstens 1 zijn.';
      } else if (matenWaarde > 400) {
        aantalMaten.fout.textContent = 'Het aantal maten mag niet meer dan 400 zijn.';
      } else aantalMaten.fout.textContent = '';
      const tempoWaarde = Number(tempo.veld.value);
      tempo.fout.textContent = Number.isFinite(tempoWaarde) && tempoWaarde >= 30 && tempoWaarde <= 300
        ? ''
        : 'Kies een tempo tussen 30 en 300.';
      if (instrumentFout.textContent || aantalMaten.fout.textContent || tempo.fout.textContent) return;

      const [teller, noemer] = gekozenMaatsoort.split('/').map(Number);
      const partituur = maakLeegStuk({
        titel: titel.veld.value.trim(),
        componist: componist.veld.value.trim(),
        instrumenten: gekozenInstrumenten,
        maatsoort: { teller, noemer },
        kwinten: Number(toonsoort.value),
        tempo: tempoWaarde,
        aantalMaten: matenWaarde,
      });
      app.zet({ partituur, meldingen: [], project: null });
      app.meld('bewaar-project', { naam: partituur.titel || 'Nieuw stuk' });
      app.meld('start-invoermodus', { partijId: partituur.partijen[0].id, maat: 0 });
      window.location.hash = '#weergave';
    });
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
