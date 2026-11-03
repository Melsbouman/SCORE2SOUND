export function start(app) {
  const vlak = document.getElementById('voorbeeld');
  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'knop knop--hoofd';
  knop.textContent = 'Probeer met een voorbeeld';
  knop.hidden = Boolean(app.stand.partituur);

  const status = document.createElement('p');
  status.className = 'zacht';
  status.setAttribute('role', 'status');

  vlak.replaceChildren(knop, status);
  app.op('partituur', (partituur) => {
    knop.hidden = Boolean(partituur);
  });

  knop.addEventListener('click', async () => {
    knop.disabled = true;
    status.textContent = 'Voorbeeld openen…';

    try {
      const voorbeeld = await fetch('/voorbeeld.musicxml');
      if (!voorbeeld.ok) {
        throw new Error('Het voorbeeld kon niet worden opgehaald.');
      }

      const antwoord = await fetch('/api/importeer?naam=Vader%20Jacob.musicxml', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.recordare.musicxml+xml' },
        body: await voorbeeld.text(),
      });
      const resultaat = await antwoord.json();

      if (!antwoord.ok) {
        throw new Error(resultaat.fout ?? 'Het voorbeeld kon niet worden geopend.');
      }

      app.zet({
        partituur: resultaat.partituur,
        meldingen: resultaat.meldingen,
        project: null,
      });
      status.textContent = 'Voorbeeld geopend.';
    } catch (fout) {
      status.textContent = `Het voorbeeld kon niet worden geopend: ${fout.message}`;
    } finally {
      knop.disabled = false;
    }
  });
}
