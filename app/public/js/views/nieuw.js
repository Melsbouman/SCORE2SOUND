import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { SJABLONEN, maakLeegStuk, maakVoorbeeldStuk } from '/src/model/nieuw.mjs';

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

function maakTekstveld(naam, tekst) {
  const label = document.createElement('label');
  const veld = document.createElement('input');
  veld.id = `nieuw-${naam}`;
  veld.name = naam;
  veld.type = 'text';
  label.htmlFor = veld.id;
  label.textContent = tekst;
  label.append(veld);
  return { label, veld };
}

function maakSelect(naam, tekst, opties) {
  const label = document.createElement('label');
  const select = document.createElement('select');
  select.id = `nieuw-${naam}`;
  select.name = naam;
  label.htmlFor = select.id;
  label.textContent = tekst;
  for (const [waarde, naamOptie] of opties) {
    const optie = document.createElement('option');
    optie.value = waarde;
    optie.textContent = naamOptie;
    select.append(optie);
  }
  label.append(select);
  return { label, select };
}

export function start(app) {
  const vlak = document.getElementById('nieuw');
  const kop = document.createElement('h2');
  kop.textContent = 'Nieuw stuk';

  const formulier = document.createElement('form');
  const titel = maakTekstveld('titel', 'Titel');
  const componist = maakTekstveld('componist', 'Componist');

  const sjabloon = maakSelect(
    'sjabloon',
    'Sjabloon',
    SJABLONEN.map((item) => [item.id, item.naam]),
  );
  sjabloon.select.value = 'leeg';

  const instrumenten = document.createElement('fieldset');
  const instrumentenKop = document.createElement('legend');
  instrumentenKop.textContent = 'Instrumenten';
  instrumenten.append(instrumentenKop);
  for (const instrument of INSTRUMENTEN) {
    const label = document.createElement('label');
    const keuze = document.createElement('input');
    keuze.type = 'checkbox';
    keuze.name = 'instrumenten';
    keuze.value = instrument.id;
    keuze.checked = instrument.id === 'trompet';
    label.append(keuze, ` ${instrument.naam}`);
    instrumenten.append(label);
  }

  sjabloon.select.addEventListener('change', () => {
    const gekozenSjabloon = SJABLONEN.find((item) => item.id === sjabloon.select.value);
    const gekozenIds = new Set(gekozenSjabloon?.instrumenten ?? []);
    for (const keuze of instrumenten.querySelectorAll('input[name="instrumenten"]')) {
      keuze.checked = gekozenIds.has(keuze.value);
    }
  });

  const maatsoort = maakSelect('maatsoort', 'Maatsoort', [
    ['2/4', '2/4'],
    ['3/4', '3/4'],
    ['4/4', '4/4'],
    ['6/8', '6/8'],
  ]);
  maatsoort.select.value = '4/4';

  const toonsoort = maakSelect('toonsoort', 'Toonsoort', TOONSOORTEN);
  toonsoort.select.value = '0';

  const tempoLabel = document.createElement('label');
  const tempo = document.createElement('input');
  tempo.id = 'nieuw-tempo';
  tempo.name = 'tempo';
  tempo.type = 'number';
  tempo.min = '20';
  tempo.max = '300';
  tempo.value = '100';
  tempo.required = true;
  tempoLabel.htmlFor = tempo.id;
  tempoLabel.textContent = 'Tempo (kwartnoten per minuut)';
  tempoLabel.append(tempo);

  const matenLabel = document.createElement('label');
  const aantalMaten = document.createElement('input');
  aantalMaten.id = 'nieuw-aantal-maten';
  aantalMaten.name = 'aantalMaten';
  aantalMaten.type = 'number';
  aantalMaten.min = '1';
  aantalMaten.value = '8';
  aantalMaten.required = true;
  matenLabel.htmlFor = aantalMaten.id;
  matenLabel.textContent = 'Aantal maten';
  matenLabel.append(aantalMaten);

  const knop = document.createElement('button');
  knop.type = 'submit';
  knop.className = 'knop knop--hoofd';
  knop.textContent = 'Maak stuk';

  const voorbeeldKnop = document.createElement('button');
  voorbeeldKnop.type = 'button';
  voorbeeldKnop.className = 'knop';
  voorbeeldKnop.textContent = 'Laad voorbeeld';

  const status = document.createElement('p');
  status.className = 'melding--fout';
  status.setAttribute('role', 'status');

  formulier.append(
    titel.label,
    componist.label,
    sjabloon.label,
    instrumenten,
    maatsoort.label,
    toonsoort.label,
    tempoLabel,
    matenLabel,
    knop,
    voorbeeldKnop,
    status,
  );
  vlak.replaceChildren(kop, formulier);

  formulier.addEventListener('submit', (gebeurtenis) => {
    gebeurtenis.preventDefault();
    status.textContent = '';
    const aangevinkteInstrumenten = Array.from(
      formulier.querySelectorAll('input[name="instrumenten"]:checked'),
      (keuze) => keuze.value,
    );
    const gekozenSjabloon = SJABLONEN.find((item) => item.id === sjabloon.select.value);
    const gekozenInstrumenten = aangevinkteInstrumenten.flatMap((id) => {
      const aantal = gekozenSjabloon?.instrumenten.filter((instrumentId) => instrumentId === id).length ?? 0;
      return Array(Math.max(1, aantal)).fill(id);
    });
    const [teller, noemer] = maatsoort.select.value.split('/').map(Number);

    try {
      const partituur = maakLeegStuk({
        titel: titel.veld.value.trim(),
        componist: componist.veld.value.trim(),
        instrumenten: gekozenInstrumenten,
        maatsoort: { teller, noemer },
        kwinten: Number(toonsoort.select.value),
        tempo: Number(tempo.value),
        aantalMaten: Number(aantalMaten.value),
      });
      app.zet({ partituur, meldingen: [], project: null });
      app.meld('bewaar-project', { naam: partituur.titel || 'Nieuw stuk' });
      app.meld('start-invoermodus', { partijId: partituur.partijen[0].id, maat: 0 });
      window.location.hash = '#weergave';
    } catch (fout) {
      status.textContent = fout.message;
    }
  });

  voorbeeldKnop.addEventListener('click', () => {
    const partituur = maakVoorbeeldStuk();
    app.zet({ partituur, meldingen: [], project: null });
    app.meld('bewaar-project', { naam: partituur.titel });
    window.location.hash = '#weergave';
  });
}
