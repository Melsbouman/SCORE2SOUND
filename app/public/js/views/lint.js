import { controleerBereik } from '/src/controle/bereik.mjs';

const tabbladen = [
  { naam: 'Bestand', vlakken: ['titel', 'export'] },
  { naam: 'Start', vlakken: ['passage', 'tempo'] },
  { naam: 'Noten', vlakken: ['editor', 'corrigeren', 'onzeker'] },
  { naam: 'Aanduidingen', vlakken: ['aanduidingen'] },
  { naam: 'Partij', vlakken: ['mixer', 'bewerken'] },
  { naam: 'Weergave', vlakken: ['zoom', 'versies', 'meldingen'] },
];

export function start(app) {
  let geselecteerd = 2;
  try {
    const opgeslagen = localStorage.getItem('score2sound-lint-tab');
    const index = tabbladen.findIndex((tabblad) => tabblad.naam === opgeslagen);
    if (index !== -1) geselecteerd = index;
  } catch {}

  const weergave = document.getElementById('weergave');
  const lint = document.createElement('section');
  lint.id = 'lint';
  lint.className = 'lint';
  lint.setAttribute('aria-label', 'Lint');
  weergave.before(lint);

  const zoom = document.createElement('section');
  zoom.id = 'zoom';
  zoom.setAttribute('aria-label', 'Zoom');
  document.getElementById('weergave').before(zoom);

  const lijst = document.createElement('div');
  lijst.className = 'lint__tabs';
  lijst.setAttribute('role', 'tablist');
  lijst.setAttribute('aria-label', 'Linttabbladen');

  const knoppen = [];
  const panelen = [];

  for (const [index, tabblad] of tabbladen.entries()) {
    const id = `lint-${index}`;
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'lint__tab';
    knop.id = `${id}-tab`;
    knop.setAttribute('role', 'tab');
    knop.setAttribute('aria-selected', String(index === geselecteerd));
    knop.setAttribute('aria-controls', `${id}-paneel`);
    knop.tabIndex = index === geselecteerd ? 0 : -1;
    knop.textContent = tabblad.naam;

    const paneel = document.createElement('div');
    paneel.className = 'lint__paneel';
    paneel.id = `${id}-paneel`;
    paneel.setAttribute('role', 'tabpanel');
    paneel.setAttribute('aria-labelledby', knop.id);
    paneel.hidden = index !== geselecteerd;

    for (const vlakId of tabblad.vlakken) {
      const element = document.getElementById(vlakId);
      if (element) paneel.append(element);
    }

    if (tabblad.naam === 'Bestand') {
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'knop';
      open.textContent = 'Ander bestand openen';
      open.addEventListener('click', () => {
        window.location.hash = '#begin';
      });
      paneel.prepend(open);
    }

    knop.addEventListener('click', () => selecteer(index));
    knop.addEventListener('keydown', (gebeurtenis) => {
      if (gebeurtenis.key !== 'ArrowLeft' && gebeurtenis.key !== 'ArrowRight') return;
      gebeurtenis.preventDefault();
      const richting = gebeurtenis.key === 'ArrowRight' ? 1 : -1;
      selecteer((index + richting + tabbladen.length) % tabbladen.length, true);
    });

    knoppen.push(knop);
    panelen.push(paneel);
  }

  lint.dataset.tab = tabbladen[geselecteerd].naam;

  function selecteer(index, focus = false) {
    lint.dataset.tab = tabbladen[index].naam;
    knoppen.forEach((knop, knopIndex) => {
      const gekozen = knopIndex === index;
      knop.setAttribute('aria-selected', String(gekozen));
      knop.tabIndex = gekozen ? 0 : -1;
      panelen[knopIndex].hidden = !gekozen;
    });
    try {
      localStorage.setItem('score2sound-lint-tab', tabbladen[index].naam);
    } catch {}
    if (focus) knoppen[index].focus();
  }

  document.addEventListener('keydown', (gebeurtenis) => {
    if (!gebeurtenis.altKey || gebeurtenis.ctrlKey || gebeurtenis.metaKey) return;
    if (gebeurtenis.target instanceof Element && gebeurtenis.target.matches('input, select, textarea')) return;
    if (!/^[1-6]$/.test(gebeurtenis.key)) return;
    gebeurtenis.preventDefault();
    selecteer(Number(gebeurtenis.key) - 1, true);
  });

  lijst.append(...knoppen);
  lint.append(lijst, ...panelen);
  lint.hidden = app.stand.partituur == null;

  const zoomSleutel = 'score2sound-zoom';
  const zoomenPerPartituurSleutel = `${zoomSleutel}-partituren`;
  let huidigePartituurSleutel = null;
  let laatstWaargenomenZoom = null;
  let teHerstellenZoom = null;

  function geldigeZoom(waarde) {
    return Number.isFinite(waarde) && waarde >= 0.3 && waarde <= 2;
  }

  function leesZoom() {
    try {
      const zoom = Number(localStorage.getItem(zoomSleutel));
      return geldigeZoom(zoom) ? zoom : null;
    } catch {
      return null;
    }
  }

  function sleutelVoorPartituur(partituur) {
    const projectId = app.stand.project?.id;
    const identiteit = projectId
      ? `project:${projectId}`
      : JSON.stringify(partituur);
    let hash = 2166136261;
    for (let index = 0; index < identiteit.length; index++) {
      hash = Math.imul(hash ^ identiteit.charCodeAt(index), 16777619);
    }
    return (projectId ? 'project:' : 'partituur:') + (hash >>> 0).toString(16);
  }

  function leesZoomenPerPartituur() {
    try {
      const opgeslagen = JSON.parse(localStorage.getItem(zoomenPerPartituurSleutel) || '{}');
      return opgeslagen && typeof opgeslagen === 'object' && !Array.isArray(opgeslagen)
        ? opgeslagen
        : {};
    } catch {
      return {};
    }
  }

  function bewaarZoomPerPartituur(zoom) {
    if (!huidigePartituurSleutel || !geldigeZoom(zoom)) return;
    try {
      const opgeslagen = leesZoomenPerPartituur();
      opgeslagen[huidigePartituurSleutel] = zoom;
      localStorage.setItem(zoomenPerPartituurSleutel, JSON.stringify(opgeslagen));
    } catch {}
  }

  function zoomSneltoets(toets) {
    document.dispatchEvent(new KeyboardEvent('keydown', {
      key: toets,
      ctrlKey: true,
      bubbles: true,
    }));
  }

  function stelZoomIn(zoom) {
    if (!geldigeZoom(zoom)) return;
    zoomSneltoets('0');
    let huidigeZoom = leesZoom();
    if (huidigeZoom === null) return;
    while (huidigeZoom < zoom && zoom - huidigeZoom >= 0.05) {
      zoomSneltoets('+');
      huidigeZoom = leesZoom();
      if (huidigeZoom === null) return;
    }
    while (huidigeZoom > zoom && huidigeZoom - zoom >= 0.05) {
      zoomSneltoets('-');
      huidigeZoom = leesZoom();
      if (huidigeZoom === null) return;
    }
  }

  function verwerkZoom() {
    const zoom = leesZoom();
    if (zoom === null) return;
    if (teHerstellenZoom !== null) {
      if (zoom !== teHerstellenZoom) return;
      teHerstellenZoom = null;
    }
    if (zoom === laatstWaargenomenZoom) return;
    laatstWaargenomenZoom = zoom;
    bewaarZoomPerPartituur(zoom);
  }

  const zoomObserver = new MutationObserver(verwerkZoom);
  zoomObserver.observe(document.getElementById('weergave'), {
    childList: true,
    characterData: true,
    subtree: true,
  });

  function veranderPartituur(partituur) {
    lint.hidden = partituur == null;
    if (partituur == null) {
      huidigePartituurSleutel = null;
      teHerstellenZoom = null;
      return;
    }

    app.zet({
      meldingen: [
        ...app.stand.meldingen.filter((melding) => melding.soort !== 'bereik'),
        ...controleerBereik(partituur),
      ],
    });

    huidigePartituurSleutel = sleutelVoorPartituur(partituur);
    const opgeslagenZoom = leesZoomenPerPartituur()[huidigePartituurSleutel];
    const zoom = leesZoom();
    if (geldigeZoom(opgeslagenZoom)) {
      teHerstellenZoom = opgeslagenZoom;
      laatstWaargenomenZoom = zoom;
      stelZoomIn(opgeslagenZoom);
    } else {
      teHerstellenZoom = null;
      laatstWaargenomenZoom = zoom;
      bewaarZoomPerPartituur(zoom);
    }
  }

  app.op('partituur', veranderPartituur);
  veranderPartituur(app.stand.partituur);
}
