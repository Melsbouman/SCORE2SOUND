import {
  leesId,
  splitsNoot,
  splitsRust,
  verplaatsNoot,
  zoekElement,
  verschuif,
  verschuifHalvetoon,
  zetAlter,
  zetDuur,
  maakRust,
  nootBijLetter,
  keurGoed,
  keurMaatGoed,
  kopieerMaten,
  leegMaten,
} from '/src/model/corrigeren.mjs';
import { herstelMaatduur } from '/src/model/maatduur.mjs';
import {
  zetFermate,
  zetArticulatie,
  zetOverbinding,
} from '/src/model/noten-bewerken.mjs';
import { maakTriool, maakTriooLos } from '/src/model/triolen.mjs';
import {
  voegMaatToe,
  verwijderMaat,
  zetMaatsoort,
  zetSleutel,
  zetToonsoort,
} from '/src/model/maten-bewerken.mjs';
import { opAlle, verwijderAlle } from '/src/model/meerdere.mjs';
import { controleerMaatduur } from '/src/controle/maatduur.mjs';
import { schrijfNoot } from '/src/model/invoeren.mjs';

const DUUR = { heel: 1920, half: 960, kwart: 480, achtste: 240, zestiende: 120 };
const DUUR_TOETSEN = { 1: 'heel', 2: 'half', 3: 'kwart', 4: 'achtste', 5: 'zestiende' };
const INVOER_DUUR = { 1: 120, 2: 240, 3: 480, 4: 960, 5: 1920 };
const TOONAFSTANDEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const GESTIPTE_DUUR = new Map([[180, 120], [360, 240], [720, 480], [1440, 960], [2880, 1920]]);
const PICTOGRAMMEN = {
  hoger: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  lager: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  kruis: '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  mol: '<path d="M7 4v15c0-7 11-7 11 0s-11 7-11-3"/>',
  herstelling: '<path d="M7 4v14l6-3V9l6-3v14"/>',
  dubbelkruis: '<path d="M8 5 6 19m10-14-2 14M4 9h16M3 15h16"/>',
  dubbelmol: '<path d="M5 4v15c0-7 8-7 8 0s-8 7-8-3m8-12v15c0-7 8-7 8 0s-8 7-8-3"/>',
  heel: '<path d="M7 14c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Z"/>',
  half: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4"/>',
  kwart: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4"/>',
  achtste: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4c4 1 5 3 2 5"/>',
  zestiende: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4c4 1 5 3 2 5m-2-2c4 1 5 3 2 5"/>',
  punt: '<path d="M5 12h8"/><circle cx="18" cy="12" r="2" fill="currentColor" stroke="none"/>',
  rust: '<path d="m8 4 8 4-6 4 6 4-6 4"/>',
  goedkeuren: '<path d="m4 12 5 5L20 6"/>',
  ongedaan: '<path d="M9 8 4 12l5 4M4 12h10a6 6 0 0 1 6 6"/>',
  opnieuw: '<path d="m15 8 5 4-5 4m5-4H10a6 6 0 0 0-6 6"/>',
  fermate: '<path d="M5 15a7 7 0 0 1 14 0M3 16h18"/><circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/>',
  staccato: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
  accent: '<path d="m5 7 14 5-14 5"/>',
  tenuto: '<path d="M5 12h14"/>',
  overbinding: '<path d="M5 10c3 7 11 7 14 0"/>',
  verwijderen: '<path d="M5 7h14m-12 0 1 13h8l1-13M9 7V4h6v3m-4 4v5m2-5v5"/>',
};

export function start(app) {
  const vlak = document.getElementById('editor');
  let gekozen = null;
  let gekozenIds = [];
  let gekozenMaat = null;
  let gekozenTot = null;
  let gekopieerdeReeks = null;
  let statusBalk = null;
  let vorigePartituur = app.stand.partituur;
  let bezigMetGeschiedenis = false;
  let projectWerdNetNull = false;
  let invoermodus = false;
  let invoerPartijId = null;
  let invoerMaat = null;
  let invoerStart = 0;
  let invoerDuur = 480;
  let invoerAlter = 0;
  let vorigeInvoerToon = null;
  const ingevoerdeNoten = [];
  const ongedaan = [];
  const opnieuw = [];

  function wisGeschiedenis() {
    ongedaan.length = 0;
    opnieuw.length = 0;
  }

  function idsVoorBewerking() {
    return gekozenIds.length ? gekozenIds : gekozen ? [gekozen] : [];
  }

  function sluitInvoermodus() {
    invoermodus = false;
    invoerPartijId = null;
    invoerMaat = null;
    invoerStart = 0;
    invoerAlter = 0;
    vorigeInvoerToon = null;
    ingevoerdeNoten.length = 0;
    teken();
  }

  function openInvoermodus() {
    const partituur = app.stand.partituur;
    if (invoermodus) {
      sluitInvoermodus();
      return;
    }
    if (!partituur || gekozenMaat === null) {
      if (statusBalk) statusBalk.textContent = 'Kies eerst een maat.';
      return;
    }
    const partij = partituur.partijen.find((item) => item.maten[gekozenMaat]);
    if (!partij) return;
    invoermodus = true;
    invoerPartijId = partij.id;
    invoerMaat = gekozenMaat;
    invoerStart = 0;
    invoerDuur = 480;
    invoerAlter = 0;
    vorigeInvoerToon = null;
    ingevoerdeNoten.length = 0;
    teken();
  }

  function geldendeSleutel(partij, maatIndex) {
    for (let index = maatIndex; index >= 0; index -= 1) {
      const sleutel = partij.maten[index]?.sleutels?.find((item) => (item.notenbalk ?? 1) === 1);
      if (sleutel) return sleutel;
    }
    return null;
  }

  function toonhoogteVoor(stap) {
    if (!vorigeInvoerToon) {
      const partij = app.stand.partituur.partijen.find((item) => item.id === invoerPartijId);
      const sleutel = geldendeSleutel(partij, invoerMaat);
      return { stap, alter: invoerAlter, octaaf: sleutel?.teken === 'F' ? 4 : 5 };
    }
    const vorigeMidi = (vorigeInvoerToon.octaaf + 1) * 12
      + TOONAFSTANDEN[vorigeInvoerToon.stap] + vorigeInvoerToon.alter;
    const kandidaten = [vorigeInvoerToon.octaaf - 1, vorigeInvoerToon.octaaf, vorigeInvoerToon.octaaf + 1];
    const octaaf = kandidaten.reduce((beste, kandidaat) => {
      const afstand = Math.abs((kandidaat + 1) * 12 + TOONAFSTANDEN[stap] + invoerAlter - vorigeMidi);
      const besteAfstand = Math.abs((beste + 1) * 12 + TOONAFSTANDEN[stap] + invoerAlter - vorigeMidi);
      return afstand < besteAfstand ? kandidaat : beste;
    });
    return { stap, alter: invoerAlter, octaaf };
  }

  function maatduur(partij, maatIndex) {
    const maat = partij.maten[maatIndex];
    return maat.maatsoort.teller * 1920 / maat.maatsoort.noemer;
  }

  function schuifInvoercursorVooruit() {
    const partij = app.stand.partituur.partijen.find((item) => item.id === invoerPartijId);
    const einde = invoerStart + invoerDuur;
    const duur = maatduur(partij, invoerMaat);
    if (einde < duur) {
      invoerStart = einde;
    } else if (invoerMaat < partij.maten.length - 1) {
      invoerMaat += 1;
      invoerStart = 0;
      app.meld('kies-maat', { maat: invoerMaat });
    } else {
      invoerStart = Math.min(invoerStart, Math.max(0, duur - invoerDuur));
    }
  }

  function voerNootIn(stap, rust = false) {
    const toonhoogte = toonhoogteVoor(stap);
    try {
      let nieuw = schrijfNoot(
        app.stand.partituur, invoerPartijId, invoerMaat, invoerStart, invoerDuur, toonhoogte,
      );
      if (rust) {
        const partij = nieuw.partijen.find((item) => item.id === invoerPartijId);
        const elementIndex = partij.maten[invoerMaat].elementen.findIndex((item) => (
          item.soort === 'noot' && item.start === invoerStart && item.duur === invoerDuur
        ));
        nieuw = maakRust(nieuw, `n-${invoerPartijId}-${invoerMaat}-${elementIndex}`);
      } else {
        vorigeInvoerToon = toonhoogte;
      }
      ingevoerdeNoten.push({ maat: invoerMaat, start: invoerStart, toonhoogte: rust ? null : toonhoogte });
      pas(nieuw);
      schuifInvoercursorVooruit();
      invoerAlter = 0;
      teken();
    } catch (fout) {
      if (!(fout instanceof Error)) throw fout;
      statusBalk.textContent = fout.message;
    }
  }

  function verwijderLaatsteInvoer() {
    const laatste = ingevoerdeNoten.pop();
    if (!laatste) return;
    ongedaanMaken();
    invoerMaat = laatste.maat;
    invoerStart = laatste.start;
    vorigeInvoerToon = [...ingevoerdeNoten].reverse()
      .find((item) => item.toonhoogte)?.toonhoogte ?? null;
    gekozenMaat = invoerMaat;
    teken();
  }

  function pasAlle(bewerking) {
    pas(opAlle(app.stand.partituur, idsVoorBewerking(), bewerking));
  }

  function onthoudGekozenMaten() {
    gekopieerdeReeks = { van: gekozenMaat, tot: gekozenTot ?? gekozenMaat };
    teken();
  }

  function plakGekopieerdeReeks() {
    pas(kopieerMaten(
      app.stand.partituur,
      gekopieerdeReeks.van,
      gekopieerdeReeks.tot,
      gekozenMaat,
    ));
  }

  function maakRustAlle(partituur, ids) {
    const aflopend = [...ids].sort((eersteId, tweedeId) => {
      const eerste = leesId(eersteId);
      const tweede = leesId(tweedeId);
      if (!eerste || !tweede) return 0;
      return eerste.partijId.localeCompare(tweede.partijId)
        || eerste.maatIndex - tweede.maatIndex
        || tweede.elementIndex - eerste.elementIndex;
    });
    const verwijderd = new Set();
    const resultaat = opAlle(partituur, aflopend, (huidigePartituur, id) => {
      const plaats = leesId(id);
      const element = zoekElement(huidigePartituur, id);
      const partij = huidigePartituur.partijen.find((item) => item.id === plaats.partijId);
      const maat = partij.maten[plaats.maatIndex];
      if (maat.elementen.some((item, index) => (
        index !== plaats.elementIndex && item.soort === 'noot'
        && item.start === element.start && item.stem === element.stem
      ))) verwijderd.add(id);
      return maakRust(huidigePartituur, id);
    });

    const idsNaBewerking = ids.filter((id) => !verwijderd.has(id)).map((id) => {
      const plaats = leesId(id);
      const verschoven = [...verwijderd].filter((verwijderdId) => {
        const verwijderdePlaats = leesId(verwijderdId);
        return verwijderdePlaats.partijId === plaats.partijId
          && verwijderdePlaats.maatIndex === plaats.maatIndex
          && verwijderdePlaats.elementIndex < plaats.elementIndex;
      }).length;
      return `n-${plaats.partijId}-${plaats.maatIndex}-${plaats.elementIndex - verschoven}`;
    });
    return { partituur: resultaat, ids: idsNaBewerking };
  }

  function pasMaakRustAlle() {
    const { partituur, ids } = maakRustAlle(app.stand.partituur, idsVoorBewerking());
    gekozenIds = ids;
    if (!gekozenIds.includes(gekozen)) gekozen = gekozenIds.at(-1) ?? null;
    pas(partituur);
  }

  function pasTriool() {
    if (!gekozen) return;
    const element = zoekElement(app.stand.partituur, gekozen);
    if (element?.soort !== 'noot' && element?.soort !== 'rust') return;
    gekozenIds = [gekozen];
    pas(element.tuplet
      ? maakTriooLos(app.stand.partituur, gekozen)
      : maakTriool(app.stand.partituur, gekozen));
  }

  function markeerSelectie() {
    for (const element of document.querySelectorAll('g.note.gekozen, g.rest.gekozen, g.mRest.gekozen')) {
      element.classList.remove('gekozen');
    }
    for (const id of gekozenIds) {
      document.getElementById(id)?.classList.add('gekozen');
    }
  }

  function teken() {
    const partituur = app.stand.partituur;
    if (!partituur) {
      vlak.replaceChildren();
      return;
    }

    const element = gekozen ? zoekElement(partituur, gekozen) : null;
    const elementen = idsVoorBewerking().map((id) => zoekElement(partituur, id)).filter(Boolean);
    const heeftNoot = elementen.some((item) => item.soort === 'noot');
    const balk = document.createElement('div');
    balk.className = 'editor__balk';
    balk.setAttribute('role', 'toolbar');
    balk.setAttribute('aria-label', 'Noot aanpassen');

    function maakKnop(naam, pictogram, actie, uitgeschakeld = false, ingedrukt = null) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop editor__knop';
      knop.title = naam;
      knop.setAttribute('aria-label', naam);
      if (ingedrukt !== null) knop.setAttribute('aria-pressed', String(ingedrukt));
      knop.disabled = uitgeschakeld;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = pictogram;
      if (['heel', 'half', 'kwart', 'achtste', 'zestiende'].includes(naam.toLowerCase())) {
        const nootkop = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        nootkop.setAttribute('cx', '8.5');
        nootkop.setAttribute('cy', '17');
        nootkop.setAttribute('rx', '3.2');
        nootkop.setAttribute('ry', '2');
        if (naam !== 'Heel' && naam !== 'Half') nootkop.setAttribute('fill', 'currentColor');
        svg.append(nootkop);
      }
      knop.append(svg);
      knop.addEventListener('click', actie);
      return knop;
    }

    function maakTekstKnop(naam, actie, uitgeschakeld = false) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop editor__knop';
      knop.textContent = naam;
      knop.setAttribute('aria-label', naam);
      knop.disabled = uitgeschakeld;
      knop.addEventListener('click', actie);
      return knop;
    }

    function groep(knoppen) {
      const rij = document.createElement('div');
      rij.className = 'editor__groep';
      for (const knop of knoppen) rij.append(knop);
      balk.append(rij);
    }

    const isNoot = heeftNoot;
    const heeftKeuze = elementen.length > 0;
    groep([
      maakKnop('Halve toon hoger', PICTOGRAMMEN.hoger, () => pasAlle((partituur, id) => verschuifHalvetoon(partituur, id, 1)), !isNoot),
      maakKnop('Halve toon lager', PICTOGRAMMEN.lager, () => pasAlle((partituur, id) => verschuifHalvetoon(partituur, id, -1)), !isNoot),
    ]);
    groep([
      maakKnop('Kruis', PICTOGRAMMEN.kruis, () => pasAlle((partituur, id) => zetAlter(partituur, id, 1)), !isNoot),
      maakKnop('Mol', PICTOGRAMMEN.mol, () => pasAlle((partituur, id) => zetAlter(partituur, id, -1)), !isNoot),
      maakKnop('Herstellingsteken', PICTOGRAMMEN.herstelling, () => pasAlle((partituur, id) => zetAlter(partituur, id, 0)), !isNoot),
      maakKnop('Dubbelkruis', PICTOGRAMMEN.dubbelkruis, () => pasAlle((partituur, id) => zetAlter(partituur, id, 2)), !isNoot),
      maakKnop('Dubbelmol', PICTOGRAMMEN.dubbelmol, () => pasAlle((partituur, id) => zetAlter(partituur, id, -2)), !isNoot),
    ]);
    groep(Object.entries(DUUR).map(([naam, duur]) => {
      const labels = { heel: 'Heel', half: 'Half', kwart: 'Kwart', achtste: 'Achtste', zestiende: 'Zestiende' };
      return maakKnop(labels[naam], PICTOGRAMMEN[naam], () => pasAlle((partituur, id) => zetDuur(partituur, id, duur)), !heeftKeuze);
    }).concat(
      maakKnop(
        'Punt',
        PICTOGRAMMEN.punt,
        () => {
          pasAlle((huidigePartituur, id) => {
            const gekozenElement = zoekElement(huidigePartituur, id);
            const nieuweDuur = GESTIPTE_DUUR.get(gekozenElement.duur) ?? Math.round(gekozenElement.duur * 1.5);
            return zetDuur(huidigePartituur, id, nieuweDuur);
          });
        },
        !heeftKeuze,
        elementen.length > 0 && elementen.every((item) => GESTIPTE_DUUR.has(item.duur)),
      ),
    ));
    groep([maakTekstKnop(
      'Triool',
      pasTriool,
      elementen.length !== 1 || !['noot', 'rust'].includes(element?.soort),
    )]);
    groep([
      maakKnop('Wordt rust', PICTOGRAMMEN.rust, pasMaakRustAlle, !isNoot),
      maakKnop('Goedkeuren', PICTOGRAMMEN.goedkeuren, () => pasAlle((partituur, id) => keurGoed(partituur, id)), !heeftKeuze),
    ]);
    if (gekozenMaat !== null) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop editor__knop';
      knop.textContent = 'Maat klopt';
      knop.setAttribute('aria-label', 'Keur alle noten in de gekozen maat goed');
      knop.addEventListener('click', () => {
        let nieuw = app.stand.partituur;
        for (const partij of app.stand.partituur.partijen) {
          nieuw = keurMaatGoed(nieuw, partij.id, gekozenMaat);
        }
        pas(nieuw);
      });
      const kopieerKnop = maakTekstKnop('Kopiëren', onthoudGekozenMaten);
      kopieerKnop.setAttribute('aria-label', 'Onthoud de gekozen maten om te plakken');
      const leegmaakKnop = maakTekstKnop('Maten leegmaken', () => {
        pas(leegMaten(app.stand.partituur, gekozenMaat, gekozenTot ?? gekozenMaat));
      });
      const herstelKnop = document.createElement('button');
      herstelKnop.type = 'button';
      herstelKnop.className = 'knop editor__knop';
      herstelKnop.textContent = 'Maatduur herstellen';
      herstelKnop.setAttribute('aria-label', 'Herstel de duur van de gekozen maat in alle partijen');
      herstelKnop.addEventListener('click', () => {
        let nieuw = app.stand.partituur;
        for (const partij of app.stand.partituur.partijen) {
          nieuw = herstelMaatduur(nieuw, partij.id, gekozenMaat);
        }
        pas(nieuw);
      });
      const maatGroep = [knop, kopieerKnop, leegmaakKnop, herstelKnop];
      const invoerKnop = maakTekstKnop('Noten invoeren', openInvoermodus);
      invoerKnop.setAttribute('aria-pressed', String(invoermodus));
      maatGroep.unshift(invoerKnop);
      if (gekopieerdeReeks !== null) {
        const plakKnop = maakTekstKnop('Plakken', plakGekopieerdeReeks);
        plakKnop.setAttribute('aria-label', 'Plak de gekopieerde maten vanaf de gekozen maat');
        maatGroep.push(plakKnop);
      }
      const bronMaat = app.stand.partituur.partijen
        .map((partij) => partij.maten.find((maat) => maat.index === gekozenMaat))
        .find(Boolean);
      const maatsoortMenu = document.createElement('select');
      maatsoortMenu.className = 'knop editor__knop';
      maatsoortMenu.setAttribute('aria-label', 'Maatsoort vanaf de gekozen maat');
      const maatsoorten = [
        ['2/4', '2/4'],
        ['3/4', '3/4'],
        ['4/4', '4/4'],
        ['6/8', '6/8'],
      ];
      for (const [waarde, label] of maatsoorten) {
        const optie = document.createElement('option');
        optie.value = waarde;
        optie.textContent = label;
        maatsoortMenu.append(optie);
      }
      const eigenOptie = document.createElement('option');
      eigenOptie.value = 'eigen';
      eigenOptie.textContent = 'Eigen waarde…';
      maatsoortMenu.append(eigenOptie);
      const huidigeMaatsoort = bronMaat?.maatsoort;
      const huidigeWaarde = huidigeMaatsoort
        ? `${huidigeMaatsoort.teller}/${huidigeMaatsoort.noemer}`
        : '4/4';
      if (!maatsoorten.some(([waarde]) => waarde === huidigeWaarde)) {
        const optie = document.createElement('option');
        optie.value = huidigeWaarde;
        optie.textContent = huidigeWaarde;
        maatsoortMenu.insertBefore(optie, eigenOptie);
      }
      maatsoortMenu.value = huidigeWaarde;
      maatsoortMenu.addEventListener('change', () => {
        let waarde = maatsoortMenu.value;
        if (waarde === 'eigen') {
          const tellerTekst = window.prompt('Teller van de maatsoort', String(huidigeMaatsoort?.teller ?? 4));
          if (tellerTekst === null) {
            maatsoortMenu.value = huidigeWaarde;
            return;
          }
          const teller = Number(tellerTekst);
          if (!Number.isInteger(teller) || teller <= 0) {
            maatsoortMenu.value = huidigeWaarde;
            statusBalk.textContent = 'Vul een positieve teller in.';
            return;
          }
          const noemerTekst = window.prompt('Noemer van de maatsoort', String(huidigeMaatsoort?.noemer ?? 4));
          if (noemerTekst === null) {
            maatsoortMenu.value = huidigeWaarde;
            return;
          }
          const noemer = Number(noemerTekst);
          if (!Number.isInteger(noemer) || noemer <= 0) {
            maatsoortMenu.value = huidigeWaarde;
            statusBalk.textContent = 'Vul een positieve noemer in.';
            return;
          }
          if (!Number.isInteger(teller * 1920 / noemer)) {
            maatsoortMenu.value = huidigeWaarde;
            statusBalk.textContent = 'Deze maatsoort past niet in een geheel aantal tikken.';
            return;
          }
          waarde = `${teller}/${noemer}`;
        }
        const [teller, noemer] = waarde.split('/').map(Number);
        pas(zetMaatsoort(app.stand.partituur, gekozenMaat, teller, noemer));
      });
      maatGroep.push(maatsoortMenu);
      const sleutelMenu = document.createElement('select');
      sleutelMenu.className = 'knop editor__knop';
      sleutelMenu.setAttribute('aria-label', 'Sleutel vanaf de gekozen maat');
      const sleutels = [
        ['G/2', 'Viool G2'],
        ['F/4', 'Bas F4'],
        ['C/3', 'Alt C3'],
        ['C/4', 'Tenor C4'],
      ];
      for (const [waarde, label] of sleutels) {
        const optie = document.createElement('option');
        optie.value = waarde;
        optie.textContent = label;
        sleutelMenu.append(optie);
      }
      const bronPartij = app.stand.partituur.partijen
        .find((partij) => partij.maten.some((maat) => maat.index === gekozenMaat));
      const huidigeSleutel = bronPartij ? geldendeSleutel(bronPartij, gekozenMaat) : null;
      sleutelMenu.value = `${huidigeSleutel?.teken ?? 'G'}/${huidigeSleutel?.lijn ?? 2}`;
      sleutelMenu.disabled = !bronPartij;
      sleutelMenu.addEventListener('change', () => {
        const [teken, lijn] = sleutelMenu.value.split('/');
        pas(zetSleutel(app.stand.partituur, bronPartij.id, gekozenMaat, teken, Number(lijn)));
      });
      maatGroep.push(sleutelMenu);
      const toonsoortMenu = document.createElement('select');
      toonsoortMenu.className = 'knop editor__knop';
      toonsoortMenu.setAttribute('aria-label', 'Toonsoort vanaf de gekozen maat');
      const toonsoorten = [
        [0, 'C'],
        [1, 'G'],
        [2, 'D'],
        [3, 'A'],
        [4, 'E'],
        [5, 'B'],
        [6, 'F#'],
        [7, 'C#'],
        [-1, 'F'],
        [-2, 'Bb'],
        [-3, 'Eb'],
        [-4, 'Ab'],
        [-5, 'Db'],
        [-6, 'Gb'],
        [-7, 'Cb'],
      ];
      for (const [kwinten, naam] of toonsoorten) {
        const optie = document.createElement('option');
        optie.value = String(kwinten);
        optie.textContent = naam;
        toonsoortMenu.append(optie);
      }
      toonsoortMenu.value = String(bronMaat?.toonsoort?.kwinten ?? 0);
      toonsoortMenu.addEventListener('change', () => {
        pas(zetToonsoort(app.stand.partituur, gekozenMaat, Number(toonsoortMenu.value)));
      });
      maatGroep.push(toonsoortMenu);
      maatGroep.push(maakTekstKnop('Maat invoegen', () => {
        pas(voegMaatToe(app.stand.partituur, gekozenMaat));
        app.meld('kies-maat', { maat: gekozenMaat + 1 });
      }));
      maatGroep.push(maakTekstKnop('Maat verwijderen', () => {
        const nieuw = verwijderMaat(app.stand.partituur, gekozenMaat);
        const aantalMaten = Math.max(0, ...nieuw.partijen.map((partij) => partij.maten.length));
        const volgendeMaat = aantalMaten === 0 ? null : Math.min(gekozenMaat, aantalMaten - 1);
        gekozen = null;
        gekozenIds = [];
        pas(nieuw);
        app.meld('kies-maat', { maat: volgendeMaat });
      }, !app.stand.partituur.partijen.some((partij) => partij.maten.some((maat) => maat.index === gekozenMaat))));
      groep(maatGroep);
    }
    groep([
      maakKnop(
        'Fermate',
        PICTOGRAMMEN.fermate,
        () => pasAlle((partituur, id) => zetFermate(partituur, id, !zoekElement(partituur, id).fermate)),
        !isNoot,
        elementen.length > 0 && elementen.every((item) => Boolean(item.fermate)),
      ),
      maakKnop(
        'Staccato',
        PICTOGRAMMEN.staccato,
        () => pasAlle((partituur, id) => zetArticulatie(partituur, id, 'staccato')),
        !isNoot,
        elementen.length > 0 && elementen.every((item) => item.articulaties?.includes('staccato')),
      ),
      maakKnop(
        'Accent',
        PICTOGRAMMEN.accent,
        () => pasAlle((partituur, id) => zetArticulatie(partituur, id, 'accent')),
        !isNoot,
        elementen.length > 0 && elementen.every((item) => item.articulaties?.includes('accent')),
      ),
      maakKnop(
        'Tenuto',
        PICTOGRAMMEN.tenuto,
        () => pasAlle((partituur, id) => zetArticulatie(partituur, id, 'tenuto')),
        !isNoot,
        elementen.length > 0 && elementen.every((item) => item.articulaties?.includes('tenuto')),
      ),
      maakKnop(
        'Overbinding',
        PICTOGRAMMEN.overbinding,
        () => {
          let nieuwePartituur;
          try {
            nieuwePartituur = opAlle(app.stand.partituur, idsVoorBewerking(), (partituur, id) => (
              zetOverbinding(partituur, id, !zoekElement(partituur, id).overbinding.begin)
            ));
          } catch (fout) {
            if (!(fout instanceof Error)) throw fout;
            statusBalk.textContent = fout.message;
            return;
          }
          pas(nieuwePartituur);
        },
        !isNoot,
        Boolean(element?.overbinding?.begin),
      ),
      maakKnop(
        'Verwijderen',
        PICTOGRAMMEN.verwijderen,
        () => pas(verwijderAlle(app.stand.partituur, idsVoorBewerking())),
        !isNoot,
      ),
    ]);
    groep([
      maakKnop('Ongedaan maken', PICTOGRAMMEN.ongedaan, ongedaanMaken, ongedaan.length === 0),
      maakKnop('Opnieuw', PICTOGRAMMEN.opnieuw, opnieuwMaken, opnieuw.length === 0),
    ]);

    const status = document.createElement('span');
    const aantalGekozen = gekozenIds.length;
    status.className = `editor__status${aantalGekozen ? ' editor__status--gekozen' : ''}`;
    status.textContent = invoermodus
      ? `Noten invoeren: maat ${invoerMaat + 1}, tik ${invoerStart}; duur ${invoerDuur}${invoerAlter === 1 ? ', kruis' : invoerAlter === -1 ? ', mol' : ''}`
      : aantalGekozen > 1
      ? `${aantalGekozen} noten gekozen`
      : aantalGekozen === 1 ? 'Noot gekozen' : 'Geen noot gekozen';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('role', 'status');
    statusBalk = status;
    balk.append(status);
    const selectieStatus = document.createElement('span');
    selectieStatus.className = 'editor__selectie';
    selectieStatus.setAttribute('role', 'status');
    selectieStatus.textContent = gekozenMaat === null ? '' : gekozenTot === null
      ? `Maat ${gekozenMaat + 1} gekozen`
      : `Maat ${gekozenMaat + 1} tot ${gekozenTot + 1} gekozen`;
    selectieStatus.hidden = gekozenMaat === null;
    balk.append(selectieStatus);
    vlak.replaceChildren(balk);
    markeerSelectie();
  }

  function pas(nieuwePartituur) {
    app.zet({
      partituur: nieuwePartituur,
      meldingen: controleerMaatduur(nieuwePartituur),
    });
    app.meld('kies-noot', { id: gekozen, ids: gekozenIds });
  }

  function ongedaanMaken() {
    if (ongedaan.length === 0) return;
    const huidige = app.stand.partituur;
    const vorige = ongedaan.pop();
    opnieuw.push(huidige);
    bezigMetGeschiedenis = true;
    app.zet({ partituur: vorige, meldingen: controleerMaatduur(vorige) });
    bezigMetGeschiedenis = false;
    app.meld('kies-noot', { id: gekozen, ids: gekozenIds });
    teken();
  }

  function opnieuwMaken() {
    if (opnieuw.length === 0) return;
    const huidige = app.stand.partituur;
    const volgende = opnieuw.pop();
    ongedaan.push(huidige);
    bezigMetGeschiedenis = true;
    app.zet({ partituur: volgende, meldingen: controleerMaatduur(volgende) });
    bezigMetGeschiedenis = false;
    app.meld('kies-noot', { id: gekozen, ids: gekozenIds });
    teken();
  }

  app.op('partituur', (partituur) => {
    const vorige = vorigePartituur;
    const bronGewijzigd = vorige
      && partituur
      && JSON.stringify(vorige.bron ?? null) !== JSON.stringify(partituur.bron ?? null);
    const projectReset = projectWerdNetNull;
    projectWerdNetNull = false;
    if (bronGewijzigd || projectReset || !partituur) {
      wisGeschiedenis();
      if (bronGewijzigd) {
        gekozen = null;
        gekozenIds = [];
        app.meld('kies-noot', { id: null });
      }
    } else if (!bezigMetGeschiedenis && vorige) {
      ongedaan.push(vorige);
      if (ongedaan.length > 100) ongedaan.shift();
      opnieuw.length = 0;
    }
    vorigePartituur = partituur;
    teken();
  });
  app.op('project', (project) => {
    if (project === null) {
      wisGeschiedenis();
      projectWerdNetNull = true;
      queueMicrotask(() => {
        projectWerdNetNull = false;
      });
      teken();
    }
  });
  app.op('kies-noot', ({ id, ids, shiftKey }) => {
    if (shiftKey && id) {
      if (gekozenIds.includes(id)) {
        gekozenIds = gekozenIds.filter((gekozenId) => gekozenId !== id);
        gekozen = gekozenIds.at(-1) ?? null;
      } else {
        gekozenIds = [...gekozenIds, id];
        gekozen = id;
      }
    } else {
      gekozen = id;
      gekozenIds = Array.isArray(ids) ? ids : id ? [id] : [];
    }
    if (id) gekozenMaat = null;
    teken();
  });
  app.op('kies-maat', ({ maat, tot }) => {
    if (invoermodus && maat !== invoerMaat) sluitInvoermodus();
    gekozenMaat = maat;
    gekozenTot = tot ?? null;
    teken();
  });
  document.addEventListener('keydown', (gebeurtenis) => {
    if (gebeurtenis.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (gebeurtenis.key === 'Enter' && gebeurtenis.target?.closest?.('button')) return;
    const partituur = app.stand.partituur;
    const element = gekozen && partituur ? zoekElement(partituur, gekozen) : null;
    const toets = gebeurtenis.key;
    if (invoermodus) {
      let afgehandeld = true;
      if (toets === 'Escape') sluitInvoermodus();
      else if (INVOER_DUUR[toets]) {
        invoerDuur = INVOER_DUUR[toets];
        teken();
      } else if (toets === '#') {
        invoerAlter = 1;
        teken();
      } else if (toets === 'b') {
        invoerAlter = -1;
        teken();
      } else if (toets === ' ') voerNootIn(vorigeInvoerToon?.stap ?? 'C', true);
      else if (toets === 'Backspace') verwijderLaatsteInvoer();
      else if (['a', 'b', 'c', 'd', 'e', 'f', 'g'].includes(toets.toLowerCase())) {
        voerNootIn(toets.toUpperCase());
      } else afgehandeld = false;
      if (afgehandeld) {
        gebeurtenis.preventDefault();
        gebeurtenis.stopImmediatePropagation();
        return;
      }
    }
    if (toets.toLowerCase() === 'n' && !gebeurtenis.ctrlKey && !gebeurtenis.metaKey && !gebeurtenis.altKey) {
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();
      openInvoermodus();
      return;
    }
    if (toets === 'Escape') {
      if (gebeurtenis.ctrlKey || gebeurtenis.metaKey) return;
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();
      app.meld('kies-noot', { id: null });
      app.meld('kies-maat', { maat: null });
      return;
    }
    if ((toets === 's' || toets === 'S') && !gebeurtenis.ctrlKey && !gebeurtenis.metaKey && !gebeurtenis.altKey && gekozen !== null && gekozenIds.length === 1 && element) {
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();
      pas(element.soort === 'noot' ? splitsNoot(app.stand.partituur, gekozen) : splitsRust(app.stand.partituur, gekozen));
      return;
    }
    if (toets === 'Delete' || toets === 'Backspace') {
      if (gekozenIds.length === 0) {
        if (gekozenMaat === null) return;
        gebeurtenis.preventDefault();
        gebeurtenis.stopImmediatePropagation();
        pas(leegMaten(app.stand.partituur, gekozenMaat, gekozenTot ?? gekozenMaat));
        return;
      }
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();
      pas(verwijderAlle(app.stand.partituur, idsVoorBewerking()));
      return;
    }
    if ((toets === 'ArrowRight' || toets === 'ArrowLeft') && gebeurtenis.altKey && !gebeurtenis.ctrlKey && !gebeurtenis.metaKey && !gebeurtenis.shiftKey && gekozen !== null && gekozenIds.length === 1) {
      const { partijId, maatIndex, elementIndex } = leesId(gekozen);
      const noot = zoekElement(app.stand.partituur, gekozen);
      const richting = toets === 'ArrowRight' ? 1 : -1;
      const maten = app.stand.partituur.partijen.find((p) => p.id === partijId).maten;
      let doelMaatIndex = maatIndex;
      let doelElementIndex = elementIndex + richting;
      let doel = null;
      while (doelMaatIndex >= 0 && doelMaatIndex < maten.length && doel === null) {
        const elementen = maten[doelMaatIndex].elementen;
        while (doelElementIndex >= 0 && doelElementIndex < elementen.length) {
          const element = elementen[doelElementIndex];
          if (element.soort === 'rust' && element.duur === noot.duur) {
            doel = { maatIndex: doelMaatIndex, elementIndex: doelElementIndex };
            break;
          }
          doelElementIndex += richting;
        }
        if (doel === null) {
          doelMaatIndex += richting;
          doelElementIndex = richting === 1 ? 0 : maten[doelMaatIndex]?.elementen.length - 1;
        }
      }
      if (doel !== null) {
        const doelId = 'n-' + partijId + '-' + doel.maatIndex + '-' + doel.elementIndex;
        pas(verplaatsNoot(app.stand.partituur, gekozen, doelId));
        gekozen = doelId;
        gekozenIds = [doelId];
        app.meld('kies-noot', { id: doelId });
      }
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();
      return;
    }

    if ((toets === 'ArrowLeft' || toets === 'ArrowRight') && !gebeurtenis.altKey) {
      if (gebeurtenis.ctrlKey || gebeurtenis.metaKey || (element?.soort !== 'noot' && element?.soort !== 'rust')) return;
      const gelezen = leesId(gekozen);
      const partij = gelezen && partituur?.partijen.find((kandidaat) => kandidaat.id === gelezen.partijId);
      if (!partij) return;
      const elementen = partij.maten.flatMap((maat, maatIndex) => (
        maat.elementen.map((item, elementIndex) => ({ item, maatIndex, elementIndex }))
      ));
      const huidigeIndex = elementen.findIndex(({ maatIndex, elementIndex }) => (
        maatIndex === gelezen.maatIndex && elementIndex === gelezen.elementIndex
      ));
      const richting = toets === 'ArrowLeft' ? -1 : 1;
      for (let index = huidigeIndex + richting; index >= 0 && index < elementen.length; index += richting) {
        const volgende = elementen[index];
        if (volgende.item.soort !== 'noot' && volgende.item.soort !== 'rust') continue;
        gebeurtenis.preventDefault();
        gebeurtenis.stopImmediatePropagation();
        app.meld('kies-noot', { id: `n-${partij.id}-${volgende.maatIndex}-${volgende.elementIndex}` });
        return;
      }
      if (toets.toLowerCase() === 'c' && gekozenMaat !== null) {
        gebeurtenis.preventDefault();
        gebeurtenis.stopImmediatePropagation();
        onthoudGekozenMaten();
        return;
      }
      if (toets.toLowerCase() === 'v' && gekozenMaat !== null && gekopieerdeReeks !== null) {
        gebeurtenis.preventDefault();
        gebeurtenis.stopImmediatePropagation();
        plakGekopieerdeReeks();
        return;
      }
      return;
    }
    if ((gebeurtenis.ctrlKey || gebeurtenis.metaKey) && toets.toLowerCase() === 'a' && partituur) {
      gebeurtenis.preventDefault();
      gebeurtenis.stopImmediatePropagation();
      const aantalMaten = Math.max(...partituur.partijen.map((partij) => partij.maten.length));
      app.meld('kies-noot', { id: null });
      app.meld('kies-maat', aantalMaten > 1 ? { maat: 0, tot: aantalMaten - 1 } : { maat: 0 });
      return;
    }
    if (gekozenIds.length === 0) return;

    let actie = null;
    if (gebeurtenis.ctrlKey || gebeurtenis.metaKey) {
      if (toets.toLowerCase() === 'z') actie = gebeurtenis.shiftKey ? opnieuwMaken : ongedaanMaken;
      else if (toets.toLowerCase() === 'y') actie = opnieuwMaken;
    } else if (toets === 'ArrowUp') {
      actie = () => pasAlle((partituur, id) => gebeurtenis.shiftKey ? verschuif(partituur, id, 7) : verschuifHalvetoon(partituur, id, 1));
    } else if (toets === 'ArrowDown') {
      actie = () => pasAlle((partituur, id) => gebeurtenis.shiftKey ? verschuif(partituur, id, -7) : verschuifHalvetoon(partituur, id, -1));
    } else if (toets === '+') {
      actie = () => pasAlle((partituur, id) => zetAlter(partituur, id, 1));
    } else if (toets === '-') {
      actie = () => pasAlle((partituur, id) => zetAlter(partituur, id, -1));
    } else if (toets === '=') {
      actie = () => pasAlle((partituur, id) => zetAlter(partituur, id, 0));
    } else if (DUUR_TOETSEN[toets]) {
      const duur = DUUR[DUUR_TOETSEN[toets]];
      actie = () => pasAlle((partituur, id) => zetDuur(partituur, id, duur));
    } else if (toets === '.') {
      actie = () => pasAlle((huidigePartituur, id) => {
        const gekozenElement = zoekElement(huidigePartituur, id);
        const nieuweDuur = GESTIPTE_DUUR.get(gekozenElement.duur) ?? Math.round(gekozenElement.duur * 1.5);
        return zetDuur(huidigePartituur, id, nieuweDuur);
      });
    } else if (['a', 'b', 'c', 'd', 'e', 'f', 'g'].includes(toets)
      && !gebeurtenis.ctrlKey && !gebeurtenis.metaKey && !gebeurtenis.altKey
      && !gebeurtenis.shiftKey) {
      actie = () => pasAlle((partituur, id) => nootBijLetter(partituur, id, toets.toUpperCase()));
    } else if (toets.toLowerCase() === 'r') {
      actie = pasMaakRustAlle;
    } else if (toets.toLowerCase() === 's') {
      actie = () => pasAlle((partituur, id) => zetArticulatie(partituur, id, 'staccato'));
    } else if (toets.toLowerCase() === 'a' && gebeurtenis.shiftKey) {
      actie = () => pasAlle((partituur, id) => zetArticulatie(partituur, id, 'accent'));
    } else if (toets.toLowerCase() === 't') {
      actie = pasTriool;
    } else if (toets.toLowerCase() === 'n') {
      actie = () => pasAlle((partituur, id) => zetArticulatie(partituur, id, 'tenuto'));
    } else if (toets.toLowerCase() === 'f' && gebeurtenis.shiftKey) {
      actie = () => pasAlle((partituur, id) => zetFermate(partituur, id, !zoekElement(partituur, id).fermate));
    } else if (toets === '~') {
      actie = () => {
        let nieuwePartituur;
        try {
          nieuwePartituur = zetOverbinding(app.stand.partituur, gekozen, !element.overbinding.begin);
        } catch (fout) {
          if (!(fout instanceof Error)) throw fout;
          statusBalk.textContent = fout.message;
          return;
        }
        pas(nieuwePartituur);
      };
    } else if (toets === 'Enter') {
      actie = () => pasAlle((partituur, id) => keurGoed(partituur, id));
    }
    if (!actie) return;
    gebeurtenis.preventDefault();
    gebeurtenis.stopImmediatePropagation();
    actie();
  });
  document.addEventListener('click', (gebeurtenis) => {
    if (!gebeurtenis.shiftKey || gebeurtenis.button !== 0) return;
    const noot = gebeurtenis.target.closest?.('g.note[id^="n-"]');
    if (!noot) return;
    gebeurtenis.preventDefault();
    gebeurtenis.stopImmediatePropagation();
    app.meld('kies-noot', { id: noot.id, shiftKey: true });
  }, true);
  const selectieObserver = new MutationObserver(markeerSelectie);
  selectieObserver.observe(document.body, { childList: true, subtree: true });
  teken();
}
import { SYMBOOL } from "./muzieksymbolen.js";


const KNOPPENBALK_GROEPEN = [
  ["Noten", ["noten invoeren", "heel", "half", "kwart", "achtste", "zestiende", "rust", "punt", "triool"]],
  ["Voortekens", ["kruis", "mol", "herstelling", "dubbelkruis", "dubbelmol"]],
  ["Toonhoogte", ["hoger", "lager"]],
  ["Tekens", ["fermate", "staccato", "accent", "tenuto", "overbinding"]],
  ["Bewerken", ["ongedaan", "opnieuw", "verwijderen", "goedkeuren", "maat klopt", "maatduur herstellen"]],
];

const KNOP_INFO = {
  heel: ["Hele noot", "1", "heel"],
  half: ["Halve noot", "2", "half"],
  kwart: ["Kwartnoot", "3", "kwart"],
  achtste: ["Achtste noot", "4", "achtste"],
  zestiende: ["Zestiende noot", "5", "zestiende"],
  rust: ["Kwartrust", "R", "rustkwart"],
  punt: ["Punt", ".", "punt"],
  kruis: ["Kruis", "K", "kruis"],
  mol: ["Mol", "M", "mol"],
  herstelling: ["Herstellingsteken", "H", "herstellingsteken"],
  dubbelkruis: ["Dubbelkruis", null, "dubbelkruis"],
  dubbelmol: ["Dubbelmol", null, "dubbelmol"],
  fermate: ["Fermate", null, "fermate"],
  staccato: ["Staccato", null, "staccato"],
  accent: ["Accent", null, "accent"],
  tenuto: ["Tenuto", null, "tenuto"],
  overbinding: ["Overbinding", null, "overbinding"],
  triool: ["Triool", "T", "triool"],
};

function knopNaam(knop) {
  return `${knop.dataset.actie || ""} ${knop.getAttribute("aria-label") || ""} ${knop.title || ""} ${knop.textContent || ""}`.toLocaleLowerCase("nl");
}

function zoekActie(knop, acties) {
  const naam = knopNaam(knop);
  return acties.find((actie) => naam.includes(actie)) || null;
}

function groepeerEditorKnoppenbalk() {
  const editor = document.querySelector("#editor");
  if (!editor) return;
  let balk = editor.querySelector('[role="toolbar"], .editor-toolbar, .editor-knoppenbalk');
  if (!balk) {
    balk = [...editor.querySelectorAll("div, nav")].find((element) => element.querySelectorAll(":scope > button").length >= 6);
  }
  if (!balk || balk.dataset.gegroepeerd === "true") return;

  const knoppen = [...balk.querySelectorAll("button")];
  const gebruikt = new Set();
  const fragment = document.createDocumentFragment();
  for (const [kop, acties] of KNOPPENBALK_GROEPEN) {
    const groepKnoppen = knoppen.filter((knop) => {
      if (gebruikt.has(knop)) return false;
      const actie = zoekActie(knop, acties);
      if (!actie) return false;
      gebruikt.add(knop);
      const info = KNOP_INFO[actie];
      if (info) {
        const [naam, sneltoets, symbool] = info;
        knop.title = sneltoets ? `${naam} (${sneltoets})` : naam;
        knop.setAttribute("aria-label", knop.title);
        const waarde = SYMBOOL[symbool];
        knop.replaceChildren();
        const span = document.createElement("span");
        span.className = "muzieksymbool";
        if (symbool === "overbinding" || symbool === "triool") span.innerHTML = waarde;
        else span.textContent = waarde;
        knop.append(span);
      } else if (!knop.getAttribute("aria-label")) {
        knop.setAttribute("aria-label", knop.title || knop.textContent.trim());
      }
      return true;
    });
    if (!groepKnoppen.length) continue;
    const groep = document.createElement("div");
    groep.className = "editor-knoppengroep";
    const rij = document.createElement("div");
    rij.className = "editor-knoppengroep__knoppen";
    rij.append(...groepKnoppen);
    const label = document.createElement("div");
    label.className = "editor-knoppengroep__kop";
    label.textContent = kop;
    groep.append(rij, label);
    fragment.append(groep);
  }
  if (!gebruikt.size) return;
  const overig = knoppen.filter((knop) => !gebruikt.has(knop));
  balk.replaceChildren(fragment, ...overig);
  balk.classList.add("editor-knoppenbalk");
  balk.dataset.gegroepeerd = "true";
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", groepeerEditorKnoppenbalk);
  new MutationObserver(groepeerEditorKnoppenbalk).observe(document.documentElement, { childList: true, subtree: true });
}
