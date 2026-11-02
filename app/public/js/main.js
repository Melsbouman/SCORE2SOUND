// Start de app: maakt de gedeelde stand en start elk scherm. Een scherm dat faalt, houdt de rest niet tegen.
import { maakApp } from './app.js';
import * as upload from './upload.js';
import * as weergave from './weergave.js';
import * as speler from './speler.js';
import * as meldingen from './views/meldingen.js';
import * as mixer from './views/mixer.js';
import * as bewerken from './views/bewerken.js';
import * as exporteren from './views/export.js';
import * as projecten from './views/projecten.js';
import * as origineel from './views/origineel.js';
import * as corrigeren from './views/corrigeren.js';
import * as versies from './views/versies.js';
import * as inloggen from './views/inloggen.js';
import * as sneltoetsen from './views/sneltoetsen.js';

let algemeneFoutmelding;

function toonAlgemeneFoutmelding() {
  if (algemeneFoutmelding) return;

  const melding = document.createElement('div');
  melding.className = 'algemene-foutmelding';
  melding.setAttribute('role', 'alert');

  const tekst = document.createElement('p');
  tekst.textContent = 'Er ging iets mis. Probeer het opnieuw of herlaad de pagina.';

  const knoppen = document.createElement('div');
  knoppen.className = 'algemene-foutmelding__knoppen';

  const herladen = document.createElement('button');
  herladen.type = 'button';
  herladen.className = 'knop knop--hoofd';
  herladen.textContent = 'Herladen';
  herladen.addEventListener('click', () => window.location.reload());

  const sluiten = document.createElement('button');
  sluiten.type = 'button';
  sluiten.className = 'knop';
  sluiten.textContent = 'Sluiten';
  sluiten.addEventListener('click', () => {
    melding.remove();
    algemeneFoutmelding = null;
  });

  knoppen.append(herladen, sluiten);
  melding.append(tekst, knoppen);
  document.body.prepend(melding);
  algemeneFoutmelding = melding;
}

window.addEventListener('error', toonAlgemeneFoutmelding);
window.addEventListener('unhandledrejection', toonAlgemeneFoutmelding);

const app = maakApp();
const schermen = { inloggen, upload, weergave, speler, meldingen, mixer, bewerken, exporteren, projecten, origineel, corrigeren, versies, sneltoetsen };

for (const [naam, scherm] of Object.entries(schermen)) {
  try {
    scherm.start(app);
  } catch (fout) {
    console.error(`Het scherm '${naam}' kon niet starten:`, fout);
  }
}

// Handig bij het testen in de browser: de stand bekijken in de console.
window.score2sound = app;
