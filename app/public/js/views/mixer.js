import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { voegPartijToe, verwijderPartij } from '/src/model/nieuw.mjs';

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

      const tonenLabel = document.createElement('label');
      const tonen = Object.assign(document.createElement('input'), {
        type: 'checkbox',
        checked: !(app.stand.verborgen ?? []).includes(partij.id),
      });
      tonen.setAttribute('aria-label', `Tonen in de notatie: ${partij.naam}`);
      tonen.addEventListener('change', () => {
        const verborgen = new Set(app.stand.verborgen ?? []);
        if (tonen.checked) verborgen.delete(partij.id);
        else {
          const zichtbarePartijen = partituur.partijen.filter(({ id }) => !verborgen.has(id));
          if (zichtbarePartijen.length === 1) {
            tonen.checked = true;
            return;
          }
          verborgen.add(partij.id);
        }
        app.zet({ verborgen: [...verborgen] });
      });
      tonenLabel.append(tonen, document.createTextNode('Tonen in de notatie'));

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

      const verwijderen = Object.assign(document.createElement('button'), {
        type: 'button',
        className: 'knop',
        textContent: 'Verwijderen',
      });
      verwijderen.addEventListener('click', () => {
        if (!window.confirm(`Wil je ${partij.naam} verwijderen?`)) return;
        try {
          app.zet({ partituur: verwijderPartij(app.stand.partituur, partij.id) });
        } catch (fout) {
          window.alert(fout.message);
        }
      });

      rij.append(naam, tonenLabel, volume, dempen, solo, verwijderen);
      return rij;
    });

    const toevoegen = document.createElement('div');
    const instrument = document.createElement('select');
    instrument.setAttribute('aria-label', 'Instrument voor nieuwe partij');
    for (const keuze of INSTRUMENTEN) {
      const optie = document.createElement('option');
      optie.value = keuze.id;
      optie.textContent = keuze.naam;
      instrument.append(optie);
    }
    const toevoegenKnop = Object.assign(document.createElement('button'), {
      type: 'button',
      className: 'knop',
      textContent: 'Partij toevoegen',
    });
    toevoegenKnop.addEventListener('click', () => {
      app.zet({ partituur: voegPartijToe(app.stand.partituur, instrument.value) });
    });
    toevoegen.append(instrument, toevoegenKnop);

    vlak.replaceChildren(kop, ...rijen, toevoegen);
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
