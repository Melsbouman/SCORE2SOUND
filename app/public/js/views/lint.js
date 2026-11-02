const tabbladen = [
  { naam: 'Bestand', vlakken: ['projecten', 'titel', 'export'] },
  { naam: 'Start', vlakken: ['speler', 'tempo'] },
  { naam: 'Noten', vlakken: ['editor', 'corrigeren', 'onzeker'] },
  { naam: 'Partij', vlakken: ['mixer', 'bewerken'] },
  { naam: 'Weergave', vlakken: ['versies', 'meldingen'] },
];

export function start(app) {
  const weergave = document.getElementById('weergave');
  const lint = document.createElement('section');
  lint.id = 'lint';
  lint.className = 'lint';
  lint.setAttribute('aria-label', 'Lint');
  weergave.before(lint);

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
    knop.setAttribute('aria-selected', String(index === 1));
    knop.setAttribute('aria-controls', `${id}-paneel`);
    knop.tabIndex = index === 1 ? 0 : -1;
    knop.textContent = tabblad.naam;

    const paneel = document.createElement('div');
    paneel.className = 'lint__paneel';
    paneel.id = `${id}-paneel`;
    paneel.setAttribute('role', 'tabpanel');
    paneel.setAttribute('aria-labelledby', knop.id);
    paneel.hidden = index !== 1;

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
    if (focus) knoppen[index].focus();
  }

  lijst.append(...knoppen);
  lint.append(lijst, ...panelen);
  lint.hidden = app.stand.partituur == null;
  app.op('partituur', (partituur) => {
    lint.hidden = partituur == null;
  });
}
