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

const app = maakApp();
const schermen = { upload, weergave, speler, meldingen, mixer, bewerken, exporteren, projecten, origineel, corrigeren, versies };

for (const [naam, scherm] of Object.entries(schermen)) {
  try {
    scherm.start(app);
  } catch (fout) {
    console.error(`Het scherm '${naam}' kon niet starten:`, fout);
  }
}

// Handig bij het testen in de browser: de stand bekijken in de console.
window.score2sound = app;
