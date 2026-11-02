export function start(app) {
  const vlak = document.getElementById('mixer');

  function verander(partijId, wijziging) {
    const mixer = { ...(app.stand.mixer ?? {}) };
    mixer[partijId] = {
      volume: 100,
      gedempt: false,
      solo: false,
      ...mixer[partijId],
      ...wijziging,
    };
    app.zet({ mixer });
  }

  function teken(partituur) {
    if (!partituur) return vlak.replaceChildren();

    const kop = document.createElement('h2');
    kop.textContent = 'Partijen';
    const rijen = partituur.partijen.map((partij) => {
      const instelling = app.stand.mixer?.[partij.id] ?? {};
      const rij = document.createElement('div');
      rij.className = 'mixer__rij';
      rij.setAttribute('role', 'group');
      rij.setAttribute('aria-label', partij.naam);

      const naam = document.createElement('span');
      naam.textContent = partij.naam;

      const volume = Object.assign(document.createElement('input'), {
        type: 'range',
        min: 0,
        max: 127,
        value: instelling.volume ?? 100,
      });
      volume.setAttribute('aria-label', `Volume van ${partij.naam}`);
      volume.setAttribute('aria-valuetext', `${volume.value} van 127, ${partij.naam}`);
      volume.addEventListener('input', () => {
        verander(partij.id, { volume: Number(volume.value) });
        volume.setAttribute('aria-valuetext', `${volume.value} van 127, ${partij.naam}`);
      });
      volume.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        const stap = event.key === 'ArrowRight' ? 5 : -5;
        volume.value = String(Math.max(0, Math.min(127, Number(volume.value) + stap)));
        volume.dispatchEvent(new Event('input', { bubbles: true }));
      });

      const dempen = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'knop',
        textContent: 'Dempen',
      });
      dempen.setAttribute('aria-pressed', String(Boolean(instelling.gedempt)));
      dempen.addEventListener('click', () => {
        const gedempt = !app.stand.mixer?.[partij.id]?.gedempt;
        verander(partij.id, { gedempt });
        dempen.setAttribute('aria-pressed', String(gedempt));
      });

      const solo = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'knop',
        textContent: 'Solo',
      });
      solo.setAttribute('aria-pressed', String(Boolean(instelling.solo)));
      solo.addEventListener('click', () => {
        const soloActief = !app.stand.mixer?.[partij.id]?.solo;
        verander(partij.id, { solo: soloActief });
        solo.setAttribute('aria-pressed', String(soloActief));
      });

      rij.append(naam, volume, dempen, solo);
      return rij;
    });

    vlak.replaceChildren(kop, ...rijen);
  }

  app.op('partituur', (partituur) => {
    if (!partituur) return teken(null);
    const mixer = Object.fromEntries(
      partituur.partijen.map((partij) => [partij.id, { volume: 100, gedempt: false, solo: false }]),
    );
    app.zet({ mixer });
    teken(partituur);
  });

  teken(app.stand.partituur);
}
