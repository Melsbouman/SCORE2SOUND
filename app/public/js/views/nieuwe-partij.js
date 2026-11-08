import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { FAMILIES, voegPartijToe } from '/src/model/nieuw.mjs';
import { controleerMaatduur } from '/src/controle/maatduur.mjs';

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
  const vlak = document.getElementById('nieuw-partij');
  if (!vlak) return;
  vlak.className = 'begin nieuwe-partij-scherm';
  vlak.tabIndex = -1;

  let gekozenInstrumentId = null;

  function render() {
    vlak.replaceChildren();

    const container = maakElement('div', 'begin__inhoud');
    const kopGroep = maakElement('div', 'begin__kop');
    const label = maakElement('span', 'begin__label', 'Partij toevoegen');
    const kop = document.createElement('h2');
    kop.append(document.createTextNode('Nieuwe '), maakElement('em', '', 'partij'));
    kopGroep.append(label, kop);

    const uitleg = maakElement('p', 'begin__intro', 'Kies een instrument en vul eventueel de gegevens aan om een nieuwe partij aan je stuk toe te voegen.');

    const formulier = maakElement('form', 'begin__formulier');
    formulier.noValidate = true;

    // Instrumentkiezer met kolommen Familie en Instrumenten met zoekveld
    const instrumentKiezerSectie = maakElement('div', 'begin__keuzevenster');
    instrumentKiezerSectie.style.gridColumn = '1 / -1';

    const zoekBalk = maakElement('div', 'nieuwe-partij__zoekbalk');
    const zoekInput = document.createElement('input');
    zoekInput.type = 'search';
    zoekInput.placeholder = 'Zoek instrument...';
    zoekInput.className = 'nieuwe-partij__zoekinput';
    zoekBalk.append(zoekInput);

    const kolommenContainer = maakElement('div', 'nieuwe-partij__kolommen');
    const familiesKolom = maakElement('div', 'nieuwe-partij__kolom nieuwe-partij__kolom--families');
    const instrumentenKolom = maakElement('div', 'nieuwe-partij__kolom nieuwe-partij__kolom--instrumenten');

    let geselecteerdeFamilieId = FAMILIES[0].id;
    let zoekTerm = '';

    function renderInstrumentenLijst() {
      instrumentenKolom.replaceChildren();
      const gefilterd = INSTRUMENTEN.filter((inst) => {
        if (zoekTerm) {
          return inst.naam.toLowerCase().includes(zoekTerm.toLowerCase());
        }
        const fam = FAMILIES.find((f) => f.id === geselecteerdeFamilieId);
        return fam && fam.instrumenten.includes(inst.id);
      });

      if (gefilterd.length === 0) {
        instrumentenKolom.append(maakElement('p', 'nieuwe-partij__geen-resultaat', 'Geen instrumenten gevonden.'));
        return;
      }

      for (const instrument of gefilterd) {
        const knop = maakElement('button', 'begin__instrument', instrument.naam);
        knop.type = 'button';
        const gekozen = gekozenInstrumentId === instrument.id;
        knop.classList.toggle('begin__instrument--gekozen', gekozen);
        knop.setAttribute('aria-pressed', String(gekozen));
        knop.addEventListener('click', () => {
          gekozenInstrumentId = instrument.id;
          renderInstrumentenLijst();
          werkKnopBij();
        });
        instrumentenKolom.append(knop);
      }
    }

    function renderFamiliesLijst() {
      if (zoekTerm) {
        familiesKolom.hidden = true;
        return;
      }
      familiesKolom.hidden = false;
      familiesKolom.replaceChildren();
      for (const familie of FAMILIES) {
        const knop = maakElement('button', 'nieuwe-partij__familie-knop', familie.naam);
        knop.type = 'button';
        const actief = familie.id === geselecteerdeFamilieId;
        knop.classList.toggle('nieuwe-partij__familie-knop--actief', actief);
        knop.addEventListener('click', () => {
          geselecteerdeFamilieId = familie.id;
          renderFamiliesLijst();
          renderInstrumentenLijst();
        });
        familiesKolom.append(knop);
      }
    }

    zoekInput.addEventListener('input', () => {
      zoekTerm = zoekInput.value.trim();
      renderFamiliesLijst();
      renderInstrumentenLijst();
    });

    renderFamiliesLijst();
    renderInstrumentenLijst();

    kolommenContainer.append(familiesKolom, instrumentenKolom);
    instrumentKiezerSectie.append(zoekBalk, kolommenContainer);

    const instrumentFout = maakElement('p', 'begin__veldfout');

    // Velden Titel, Componist, Toonsoort, Maatsoort
    const state = app.staat();
    const huidigePartituur = state.partituur;

    const titelGroep = maakElement('label', 'begin__veld');
    const titelLabel = maakElement('span', 'begin__veldlabel', 'Titel');
    const titelVeld = document.createElement('input');
    titelVeld.type = 'text';
    titelVeld.value = huidigePartituur?.titel ?? '';
    titelVeld.placeholder = 'Naam van je stuk';
    titelGroep.append(titelLabel, titelVeld);

    const componistGroep = maakElement('label', 'begin__veld');
    const componistLabel = maakElement('span', 'begin__veldlabel', 'Componist');
    const componistVeld = document.createElement('input');
    componistVeld.type = 'text';
    componistVeld.value = huidigePartituur?.componist ?? '';
    componistVeld.placeholder = 'Naam van de componist';
    componistGroep.append(componistLabel, componistVeld);

    const maatsoortGroep = maakElement('fieldset', 'begin__veld begin__keuzeveld');
    maatsoortGroep.append(maakElement('legend', 'begin__veldlabel', 'Maatsoort'));
    const maatsoorten = maakElement('div', 'begin__maatsoorten');
    const eersteMaat = huidigePartituur?.partijen?.[0]?.maten?.[0];
    let gekozenMaatsoort = eersteMaat ? `${eersteMaat.maatsoort.teller}/${eersteMaat.maatsoort.noemer}` : '4/4';

    for (const waarde of ['2/4', '3/4', '4/4', '6/8', '3/8', '2/2']) {
      const knop = maakElement('button', 'begin__maatsoort', waarde);
      knop.type = 'button';
      const gekozen = waarde === gekozenMaatsoort;
      knop.classList.toggle('begin__maatsoort--gekozen', gekozen);
      knop.setAttribute('aria-pressed', String(gekozen));
      knop.addEventListener('click', () => {
        gekozenMaatsoort = waarde;
        for (const andereKnop of maatsoorten.children) {
          const isGekozen = andereKnop === knop;
          andereKnop.classList.toggle('begin__maatsoort--gekozen', isGekozen);
          andereKnop.setAttribute('aria-pressed', String(isGekozen));
        }
      });
      maatsoorten.append(knop);
    }
    maatsoortGroep.append(maatsoorten);

    const toonsoortGroep = maakElement('label', 'begin__veld');
    toonsoortGroep.append(maakElement('span', 'begin__veldlabel', 'Toonsoort'));
    const toonsoortSelect = document.createElement('select');
    const huidigeKwinten = eersteMaat?.toonsoort?.kwinten ?? 0;
    for (const [waarde, naam] of TOONSOORTEN) {
      const optie = document.createElement('option');
      optie.value = String(waarde);
      optie.textContent = naam;
      if (waarde === huidigeKwinten) optie.selected = true;
      toonsoortSelect.append(optie);
    }
    toonsoortGroep.append(toonsoortSelect);

    const acties = maakElement('div', 'begin__acties begin__acties--details');
    const maakKnop = maakElement('button', 'begin__knop begin__knop--hoofd', 'Partij maken');
    maakKnop.type = 'submit';
    acties.append(maakKnop);

    function werkKnopBij() {
      maakKnop.disabled = !gekozenInstrumentId;
    }
    werkKnopBij();

    formulier.append(
      instrumentKiezerSectie,
      instrumentFout,
      titelGroep,
      componistGroep,
      maatsoortGroep,
      toonsoortGroep,
      acties,
    );

    formulier.addEventListener('submit', (gebeurtenis) => {
      gebeurtenis.preventDefault();
      if (!gekozenInstrumentId) {
        instrumentFout.textContent = 'Kies een instrument.';
        return;
      }

      let partituur = huidigePartituur;
      const [teller, noemer] = gekozenMaatsoort.split('/').map(Number);
      const kwinten = Number(toonsoortSelect.value);
      const titelTekst = titelVeld.value.trim();
      const componistTekst = componistVeld.value.trim();

      if (!partituur || !partituur.partijen || partituur.partijen.length === 0) {
        // Maak een nieuw stuk als er nog geen partituur is
        import('/src/model/nieuw.mjs').then(({ maakLeegStuk }) => {
          const nieuwStuk = maakLeegStuk({
            titel: titelTekst,
            componist: componistTekst,
            instrumenten: [gekozenInstrumentId],
            maatsoort: { teller, noemer },
            kwinten,
          });
          app.zet({ partituur: nieuwStuk, meldingen: [], project: null });
          app.meld('bewaar-project', { naam: nieuwStuk.titel || 'Nieuw stuk' });
          window.location.hash = '#bewerken';
        });
        return;
      }

      // Voeg toe aan bestaande partituur en werk eventueel titel/componist bij
      partituur = {
        ...partituur,
        titel: titelTekst !== '' ? titelTekst : partituur.titel,
        componist: componistTekst !== '' ? componistTekst : partituur.componist,
      };

      try {
        partituur = voegPartijToe(partituur, gekozenInstrumentId);
      } catch (fout) {
        instrumentFout.textContent = fout.message;
        return;
      }

      app.zet({
        partituur,
        meldingen: controleerMaatduur(partituur),
      });
      app.meld('bewaar-project', { naam: partituur.titel || 'Nieuw stuk' });
      window.location.hash = '#bewerken';
    });

    container.append(kopGroep, uitleg, formulier);
    vlak.append(container);
  }

  function openScherm() {
    if (window.location.hash !== '#nieuw-partij') return;
    render();
    vlak.scrollIntoView({ block: 'start' });
  }

  window.addEventListener('hashchange', openScherm);
  if (window.location.hash === '#nieuw-partij') {
    openScherm();
  }
}
