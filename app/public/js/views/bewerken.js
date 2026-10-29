// Partijen bewerken: een partij transponeren naar een ander instrument, of een losse partij maken.
// Wordt gebouwd in fase 3 van werkpakketten/plannen/2026-10-29-score2sound-app.md.
import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { transponeerPartij } from '/src/model/transponeren.mjs';
import { partijUitnemen } from '/src/model/partijen.mjs';

export function start(app) {
  const vlak = document.getElementById('bewerken');
  let statusTekst = '';
  let statusVeld;

  function toonStatus(tekst) {
    statusTekst = tekst;
    if (statusVeld) statusVeld.textContent = tekst;
  }

  function maakSelect(naam, opties) {
    const label = document.createElement('label');
    const tekst = document.createElement('span');
    const select = document.createElement('select');
    tekst.textContent = naam;
    label.append(tekst, select);

    for (const optie of opties) {
      const element = document.createElement('option');
      element.value = String(optie.id);
      element.textContent = optie.naam;
      select.append(element);
    }

    return { label, select };
  }

  function teken() {
    vlak.textContent = '';
    statusVeld = null;
    const partituur = app.stand.partituur;
    if (!partituur) return;

    const kop = document.createElement('h2');
    kop.textContent = 'Partijen bewerken';
    vlak.append(kop);

    const partijSelect = maakSelect('Partij', partituur.partijen);
    const instrumentSelect = maakSelect('Naar instrument', INSTRUMENTEN);
    vlak.append(partijSelect.label, instrumentSelect.label);

    const knoppen = document.createElement('div');
    const omzetten = document.createElement('button');
    omzetten.type = 'button';
    omzetten.className = 'knop';
    omzetten.textContent = 'Omzetten';
    omzetten.addEventListener('click', () => {
      try {
        const partij = partituur.partijen.find(
          (item) => String(item.id) === partijSelect.select.value,
        );
        const instrument = INSTRUMENTEN.find(
          (item) => String(item.id) === instrumentSelect.select.value,
        );
        const { partij: nieuwePartij, meldingen } = transponeerPartij(partij, instrument);
        if (partituur.partijen.some((item) => item.id === nieuwePartij.id)) {
          toonStatus(`Deze partij is al omgezet naar ${instrument.naam}.`);
          return;
        }

        const nieuw = structuredClone(partituur);
        const index = nieuw.partijen.findIndex((item) => item.id === partij.id);
        nieuw.partijen.splice(index + 1, 0, nieuwePartij);
        const status = `${partij.naam} staat nu ook als ${instrument.naam} in de partituur.${
          meldingen.length
            ? ` Let op: ${meldingen.length} noten liggen buiten het bereik, zie Meldingen.`
            : ''
        }`;
        toonStatus(status);
        app.zet({
          partituur: nieuw,
          meldingen: [...app.stand.meldingen, ...meldingen],
        });
      } catch (fout) {
        toonStatus(`Dat lukte niet: ${fout.message}`);
      }
    });

    const uitnemen = document.createElement('button');
    uitnemen.type = 'button';
    uitnemen.className = 'knop';
    uitnemen.textContent = 'Alleen deze partij';
    uitnemen.addEventListener('click', () => {
      try {
        const partij = partituur.partijen.find(
          (item) => String(item.id) === partijSelect.select.value,
        );
        const status =
          `Alleen ${partij.naam} staat nu open. Bewaar hem als project als je hem wilt houden.`;
        toonStatus(status);
        app.zet({
          partituur: partijUitnemen(partituur, partij.id),
          meldingen: [],
          project: null,
        });
      } catch (fout) {
        toonStatus(`Dat lukte niet: ${fout.message}`);
      }
    });
    knoppen.append(omzetten, uitnemen);
    vlak.append(knoppen);

    statusVeld = document.createElement('p');
    statusVeld.className = 'zacht';
    statusVeld.setAttribute('role', 'status');
    statusVeld.textContent = statusTekst;
    vlak.append(statusVeld);
  }

  app.op('partituur', teken);
  teken();
}
