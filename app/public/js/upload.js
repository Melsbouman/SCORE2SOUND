// Uploaden: een MusicXML-bestand kiezen of slepen, naar de API sturen en het resultaat in app zetten.
// Wordt gebouwd in pakket 8 van werkpakketten/plannen/2026-10-29-score2sound-app.md.
export function start(app) {
  const vlak = document.getElementById('upload');
  const kop = document.createElement('h2');
  kop.textContent = 'Open bladmuziek';

  const uitleg = document.createElement('p');
  uitleg.textContent = 'Sleep een MusicXML-bestand hierheen of kies een bestand. PDF en foto’s volgen later.';

  const label = document.createElement('label');
  label.className = 'knop knop--hoofd';
  label.append(document.createTextNode('Kies een bestand'));

  const invoer = document.createElement('input');
  invoer.type = 'file';
  invoer.accept = '.musicxml,.xml';
  invoer.hidden = true;
  label.append(invoer);

  const status = document.createElement('p');
  status.className = 'zacht';
  status.setAttribute('role', 'status');

  vlak.replaceChildren(kop, uitleg, label, status);

  async function openBestand(bestand) {
    if (!bestand) return;

    if (!/\.(musicxml|xml)$/i.test(bestand.name)) {
      status.textContent = 'Dit bestand kan de app nog niet openen. Kies een MusicXML-bestand (.musicxml of .xml).';
      return;
    }

    status.textContent = `Bezig met lezen van ${bestand.name}…`;

    let antwoord;
    try {
      antwoord = await fetch('/api/importeer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.recordare.musicxml+xml' },
        body: bestand,
      });
    } catch {
      status.textContent = 'De server is niet bereikbaar. Probeer het opnieuw.';
      return;
    }

    let resultaat;
    try {
      resultaat = await antwoord.json();
    } catch (fout) {
      status.textContent = `Het bestand kon niet worden geopend: ${fout.message}`;
      return;
    }

    if (!antwoord.ok) {
      status.textContent = `Het bestand kon niet worden geopend: ${resultaat.fout ?? 'onbekende fout'}`;
      return;
    }

    app.zet({ partituur: resultaat.partituur, meldingen: resultaat.meldingen, project: null });
    status.textContent = `Geopend: ${bestand.name}`;
  }

  invoer.addEventListener('change', () => openBestand(invoer.files[0]));

  vlak.addEventListener('dragover', (gebeurtenis) => {
    gebeurtenis.preventDefault();
    vlak.classList.add('sleept');
  });
  vlak.addEventListener('dragleave', (gebeurtenis) => {
    if (!gebeurtenis.relatedTarget || !vlak.contains(gebeurtenis.relatedTarget)) {
      vlak.classList.remove('sleept');
    }
  });
  vlak.addEventListener('drop', (gebeurtenis) => {
    gebeurtenis.preventDefault();
    vlak.classList.remove('sleept');
    openBestand(gebeurtenis.dataTransfer.files[0]);
  });
}
