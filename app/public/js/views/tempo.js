import { tempoLijst, verwijderTempo, zetTempo } from '../../../src/model/tempo.mjs';
import { controleerMaatduur } from '../../../src/controle/maatduur.mjs';

function fouttekst(fout) {
  return fout instanceof Error ? fout.message : String(fout);
}

export function start(app) {
  const scherm = document.querySelector('#tempo');
  const weergave = document.querySelector('#weergave');
  if (!scherm) return;

  function pasAan(bewerking, status) {
    try {
      const nieuwe = bewerking();
      app.zet({ partituur: nieuwe, meldingen: controleerMaatduur(nieuwe) });
      status.textContent = '';
    } catch (fout) {
      status.textContent = fouttekst(fout);
    }
  }

  function teken() {
    const partituur = app.stand.partituur;
    if (!partituur) {
      scherm.innerHTML = '<h2>Tempo</h2><p>Open eerst een partituur.</p>';
      return;
    }

    const regels = tempoLijst(partituur)
      .map(
        ({ maat, nummer, bpm }) => `
          <div class="tempo-regel" data-maat-index="${maat}">
            <label for="tempo-${maat}">Maat ${nummer}</label>
            <input id="tempo-${maat}" type="number" min="20" max="300" step="1"
              value="${bpm}" aria-label="Tempo vanaf maat ${nummer}">
            ${maat === 0 ? '' : '<button type="button" data-actie="weghalen">Weghalen</button>'}
          </div>`
      )
      .join('');

    scherm.innerHTML = `
      <h2>Tempo</h2>
      <div class="tempo-lijst">${regels}</div>
      <form class="tempo-toevoegen">
        <h3>Tempo toevoegen</h3>
        <label>Bij maat <input name="maat" type="number" step="1" required></label>
        <label>bpm <input name="bpm" type="number" min="20" max="300" step="1" required></label>
        <button type="submit">Toevoegen</button>
        <p class="tempo-status" role="status"></p>
      </form>`;

    scherm.querySelectorAll('.tempo-regel').forEach((regel) => {
      const maatIndex = Number(regel.dataset.maatIndex);
      const invoer = regel.querySelector('input');
      const status = scherm.querySelector('.tempo-status');
      invoer.addEventListener('change', () => {
        pasAan(() => zetTempo(app.stand.partituur, maatIndex, Number(invoer.value)), status);
      });
      regel.querySelector('[data-actie="weghalen"]')?.addEventListener('click', () => {
        pasAan(() => verwijderTempo(app.stand.partituur, maatIndex), status);
      });
    });

    scherm.querySelector('.tempo-toevoegen').addEventListener('submit', (gebeurtenis) => {
      gebeurtenis.preventDefault();
      const formulier = gebeurtenis.currentTarget;
      const status = formulier.querySelector('[role="status"]');
      const nummer = formulier.elements.maat.value;
      const maten = app.stand.partituur.partijen?.[0]?.maten ?? [];
      const maatIndex = maten.findIndex((maat) => String(maat.nummer) === nummer);
      if (maatIndex < 0) {
        status.textContent = 'Kies een maat die in de partituur staat.';
        return;
      }
      pasAan(
        () => zetTempo(app.stand.partituur, maatIndex, Number(formulier.elements.bpm.value)),
        status
      );
    });
  }

  weergave?.addEventListener('click', (gebeurtenis) => {
    const tempo = gebeurtenis.target.closest('g.tempo');
    if (!tempo) return;
    const maten = [...weergave.querySelectorAll('g.measure')];
    const maatIndex = maten.findIndex((maat) => maat.contains(tempo));
    if (maatIndex < 0) return;
    const invoer = scherm.querySelector(`[data-maat-index="${maatIndex}"] input`);
    if (invoer) {
      invoer.focus();
      return;
    }
    const maat = app.stand.partituur.partijen?.[0]?.maten?.[maatIndex];
    const formulier = scherm.querySelector('.tempo-toevoegen');
    if (formulier && maat) {
      formulier.elements.maat.value = maat.nummer;
      formulier.elements.bpm.focus();
    }
  });

  app.bijWijziging?.(teken);
  teken();
}
