// Partijen bewerken: een partij transponeren naar een ander instrument, of een losse partij maken.
// Wordt gebouwd in fase 3 van taken-en-plannen/plannen/2026-10-29-score2sound-app.md.
import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { sorteerPartijen } from '/src/model/partituurvolgorde.mjs';
import { transponeerPartij } from '/src/model/transponeren.mjs';
import { hernoemPartij, partijUitnemen, voegSamen } from '/src/model/partijen.mjs';
import { controleerMaatduur } from '/src/controle/maatduur.mjs';

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

    const naamLabel = document.createElement('label');
    const naamTekst = document.createElement('span');
    const naamInvoer = document.createElement('input');
    naamTekst.textContent = 'Nieuwe naam ';
    naamInvoer.type = 'text';
    naamLabel.append(naamTekst, naamInvoer);
    const hernoem = document.createElement('button');
    hernoem.type = 'button';
    hernoem.className = 'knop';
    hernoem.textContent = 'Naam wijzigen';
    hernoem.addEventListener('click', () => {
      try {
        const nieuw = hernoemPartij(partituur, partijSelect.select.value, naamInvoer.value);
        const naam = nieuw.partijen.find((item) => item.id === partijSelect.select.value).naam;
        app.zet({ partituur: nieuw });
        toonStatus(`De partij heet nu ${naam}.`);
      } catch (fout) {
        toonStatus(`Dat lukte niet: ${fout.message}`);
      }
    });
    vlak.append(naamLabel, hernoem);

    const knoppen = document.createElement('div');
    const sorteer = document.createElement('button');
    sorteer.type = 'button';
    sorteer.className = 'knop';
    sorteer.textContent = 'Sorteer in partituurvolgorde';
    sorteer.addEventListener('click', () => {
      try {
        const huidige = app.stand.partituur;
        const idsVoor = huidige.partijen.map((partij) => partij.id);
        const nieuw = sorteerPartijen(huidige);
        const idsNa = nieuw.partijen.map((partij) => partij.id);
        const gewijzigd =
          idsVoor.length !== idsNa.length || idsVoor.some((id, index) => id !== idsNa[index]);
        toonStatus(
          gewijzigd
            ? 'De partijen staan nu in partituurvolgorde.'
            : 'De partijen stonden al in de goede volgorde.',
        );
        app.zet({ partituur: nieuw, meldingen: controleerMaatduur(nieuw) });
      } catch (fout) {
        toonStatus(`Dat lukte niet: ${fout.message}`);
      }
    });
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
    knoppen.append(sorteer, omzetten, uitnemen);
    vlak.append(knoppen);

    const bestandLabel = document.createElement('label');
    const bestandTekst = document.createElement('span');
    const bestandInvoer = document.createElement('input');
    bestandTekst.textContent = 'Partijen toevoegen uit een ander bestand ';
    bestandInvoer.type = 'file';
    bestandInvoer.accept = '.musicxml,.xml,.mxl';
    bestandLabel.append(bestandTekst, bestandInvoer);
    bestandInvoer.addEventListener('change', async () => {
      const bestand = bestandInvoer.files[0];
      if (!bestand) return;

      let antwoord;
      try {
        antwoord = await fetch('/api/importeer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.recordare.musicxml+xml' },
          body: bestand,
        });
      } catch {
        toonStatus('De server is niet bereikbaar. Probeer het opnieuw.');
        bestandInvoer.value = '';
        return;
      }

      const resultaat = await antwoord.json();
      if (!antwoord.ok) {
        toonStatus(`Dat lukte niet: ${resultaat.fout}`);
      } else {
        const samengevoegd = voegSamen([app.stand.partituur, resultaat.partituur]);
        const aantal = resultaat.partituur.partijen.length;
        const status = `${aantal} ${aantal === 1 ? 'partij' : 'partijen'} toegevoegd uit ${bestand.name}.${
          samengevoegd.meldingen.length
            ? ` Let op: ${samengevoegd.meldingen.length} ${
              samengevoegd.meldingen.length === 1 ? 'melding' : 'meldingen'
            }, zie Meldingen.`
            : ''
        }`;
        toonStatus(status);
        app.zet({
          partituur: samengevoegd.partituur,
          meldingen: [...app.stand.meldingen, ...samengevoegd.meldingen],
          project: null,
        });
      }
      bestandInvoer.value = '';
    });
    vlak.append(bestandLabel);

    statusVeld = document.createElement('p');
    statusVeld.className = 'zacht';
    statusVeld.setAttribute('role', 'status');
    statusVeld.textContent = statusTekst;
    vlak.append(statusVeld);
  }

  app.op('partituur', teken);
  teken();
}
