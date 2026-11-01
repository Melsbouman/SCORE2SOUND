import {
  leesId,
  zoekElement,
  onzekereElementen,
  verschuif,
  zetAlter,
  zetDuur,
  maakRust,
  maakNoot,
  keurGoed,
} from '/src/model/corrigeren.mjs';
import { controleerMaatduur } from '/src/controle/maatduur.mjs';

const DUUR_OPTIES = [
  ['Hele', 1920],
  ['Halve', 960],
  ['Gepunteerde kwart', 720],
  ['Kwart', 480],
  ['Gepunteerde achtste', 360],
  ['Achtste', 240],
  ['Zestiende', 120],
];

export function start(app) {
  const vlak = document.getElementById('corrigeren');
  let gekozen = null;

  function maakKnop(naam, actie) {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'knop';
    knop.textContent = naam;
    knop.addEventListener('click', actie);
    return knop;
  }

  function kiesOnzeker(richting) {
    const partituur = app.stand.partituur;
    if (!partituur) return;
    const ids = onzekereElementen(partituur);
    if (ids.length === 0) return;
    const index = ids.indexOf(gekozen);
    const volgende = index < 0
      ? (richting > 0 ? 0 : ids.length - 1)
      : (index + richting + ids.length) % ids.length;
    app.meld('kies-noot', { id: ids[volgende] });
  }

  function pas(nieuw) {
    app.zet({
      partituur: nieuw,
      meldingen: [
        ...app.stand.meldingen.filter((melding) => melding.soort !== 'maatduur'),
        ...controleerMaatduur(nieuw),
      ],
    });
    if (!zoekElement(nieuw, gekozen)) {
      gekozen = null;
      app.meld('kies-noot', { id: null });
    } else {
      app.meld('kies-noot', { id: gekozen });
    }
  }

  function maakKnoppen(knoppen) {
    const rij = document.createElement('div');
    rij.className = 'corrigeren__knoppen';
    for (const knop of knoppen) rij.append(knop);
    return rij;
  }

  function maakDuurSelect(element) {
    const label = document.createElement('label');
    const tekst = document.createElement('span');
    const select = document.createElement('select');
    tekst.textContent = 'Duur';
    label.append(tekst, select);

    for (const [naam, duur] of DUUR_OPTIES) {
      const optie = document.createElement('option');
      optie.value = String(duur);
      optie.textContent = naam;
      select.append(optie);
    }
    if (!DUUR_OPTIES.some(([, duur]) => duur === element.duur)) {
      const optie = document.createElement('option');
      optie.value = String(element.duur);
      optie.textContent = 'Anders';
      select.append(optie);
    }
    select.value = String(element.duur);
    select.addEventListener('change', () => {
      pas(zetDuur(app.stand.partituur, gekozen, Number(select.value)));
    });
    return label;
  }

  function teken() {
    const partituur = app.stand.partituur;
    const element = partituur && gekozen ? zoekElement(partituur, gekozen) : null;
    if (!partituur || (!partituur.bron && !element)) {
      vlak.replaceChildren();
      return;
    }

    const onzeker = onzekereElementen(partituur);
    const kop = document.createElement('h2');
    kop.textContent = 'Noot corrigeren';
    const aantal = document.createElement('p');
    aantal.className = 'zacht';
    aantal.textContent = onzeker.length === 0
      ? 'Geen onzekere noten meer.'
      : `${onzeker.length} onzekere noten`;
    vlak.replaceChildren(kop, aantal);

    vlak.append(maakKnoppen([
      maakKnop('Vorige onzekere', () => kiesOnzeker(-1)),
      maakKnop('Volgende onzekere', () => kiesOnzeker(1)),
    ]));

    if (!element) return;
    const plek = leesId(gekozen);
    const partij = plek && partituur.partijen.find((item) => item.id === plek.partijId);
    const maat = partij?.maten[plek.maatIndex];
    if (!partij || !maat) return;

    const omschrijving = document.createElement('p');
    const naam = element.soort === 'rust'
      ? 'rust'
      : `${element.toonhoogte.stap}${element.toonhoogte.alter === -1
        ? (element.toonhoogte.stap === 'E' || element.toonhoogte.stap === 'A' ? 's' : 'es')
        : element.toonhoogte.alter === 1
          ? 'is'
          : ''} ${element.toonhoogte.octaaf}`;
    omschrijving.textContent = `${partij.naam}, maat ${maat.nummer}: ${naam}${
      element.zekerheid < 0.8 ? ' (onzeker)' : ''
    }`;
    vlak.append(omschrijving);

    if (element.soort === 'noot') {
      vlak.append(maakKnoppen([
        maakKnop('Omhoog', () => pas(verschuif(app.stand.partituur, gekozen, 1))),
        maakKnop('Omlaag', () => pas(verschuif(app.stand.partituur, gekozen, -1))),
        maakKnop('Wordt rust', () => pas(maakRust(app.stand.partituur, gekozen))),
      ]));

      const voortekenLabel = document.createElement('label');
      const voortekenTekst = document.createElement('span');
      const voortekenSelect = document.createElement('select');
      voortekenTekst.textContent = 'Voorteken';
      voortekenLabel.append(voortekenTekst, voortekenSelect);
      for (const [naam, waarde] of [
        ['Dubbelmol', -2],
        ['Mol', -1],
        ['Geen', 0],
        ['Kruis', 1],
        ['Dubbelkruis', 2],
      ]) {
        const optie = document.createElement('option');
        optie.value = String(waarde);
        optie.textContent = naam;
        voortekenSelect.append(optie);
      }
      voortekenSelect.value = String(element.toonhoogte.alter);
      voortekenSelect.addEventListener('change', () => {
        pas(zetAlter(app.stand.partituur, gekozen, Number(voortekenSelect.value)));
      });
      vlak.append(voortekenLabel, maakDuurSelect(element));
    } else if (element.soort === 'rust') {
      vlak.append(maakKnoppen([
        maakKnop('Wordt noot', () => pas(maakNoot(
          app.stand.partituur,
          gekozen,
          { stap: 'B', alter: 0, octaaf: 4 },
        ))),
      ]));
      vlak.append(maakDuurSelect(element));
    }

    const onzekerIndex = onzeker.indexOf(gekozen);
    vlak.append(maakKnop('Klopt', () => {
      const nieuw = keurGoed(app.stand.partituur, gekozen);
      pas(nieuw);
      const resterend = onzekereElementen(nieuw);
      if (resterend.length === 0) {
        gekozen = null;
        app.meld('kies-noot', { id: null });
      } else {
        gekozen = resterend[onzekerIndex < 0 ? 0 : onzekerIndex % resterend.length];
        app.meld('kies-noot', { id: gekozen });
      }
      teken();
    }));
  }

  app.op('partituur', teken);
  app.op('kies-noot', ({ id }) => {
    gekozen = id;
    teken();
  });
  teken();
}
