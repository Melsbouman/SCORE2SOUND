const tabbladen = [
  { naam: 'Bestand', vlakken: ['projecten', 'titel', 'export'] },
  { naam: 'Start', vlakken: ['speler', 'tempo'] },
  { naam: 'Noten', vlakken: ['editor', 'corrigeren', 'onzeker'] },
  { naam: 'Partij', vlakken: ['mixer', 'bewerken'] },
  { naam: 'Weergave', vlakken: ['zoom', 'versies', 'meldingen'] },
];

export function start(app) {
  let geselecteerd = 1;
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

  function selecteer(index, focus = false) {
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
    if (!/^[1-5]$/.test(gebeurtenis.key)) return;
    gebeurtenis.preventDefault();
    selecteer(Number(gebeurtenis.key) - 1, true);
  });

  lijst.append(...knoppen);
  lint.append(lijst, ...panelen);
  lint.hidden = app.stand.partituur == null;
  app.op('partituur', (partituur) => {
    lint.hidden = partituur == null;
  });
}
