// SCORE2SOUND-server: levert de app aan de browser en beantwoordt de API.
// Starten met `npm start` in app/; daarna draait de app op http://localhost:5175.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HIER = dirname(fileURLToPath(import.meta.url));
const MAX_UPLOAD = 25 * 1024 * 1024;

// Wat de browser mag ophalen, met het begin van de URL. De eerste die past wint.
// Uit src/ alleen de modules die ook in de browser draaien; src/server/ blijft op de server.
const MAPPEN = [
  ['/src/model/', join(HIER, 'src', 'model')],
  ['/src/musicxml/', join(HIER, 'src', 'musicxml')],
  ['/src/controle/', join(HIER, 'src', 'controle')],
  ['/src/midi/', join(HIER, 'src', 'midi')],
  ['/vendor/verovio/', join(HIER, 'node_modules', 'verovio', 'dist')],
  ['/vendor/spessasynth/', join(HIER, 'node_modules', 'spessasynth_lib', 'dist')],
  ['/vendor/spessasynth-core/', join(HIER, 'node_modules', 'spessasynth_core', 'dist')],
  ['/vendor/fflate/', join(HIER, 'node_modules', 'fflate', 'esm')],
  ['/vendor/stb-vorbis/', join(HIER, 'node_modules', 'stb-vorbis', 'dist')],
  ['/', join(HIER, 'public')],
];

// API-paden en de module die ze afhandelt. Elke module exporteert standaard een functie
// (verzoek) => { status, body }, met verzoek = { methode, pad, rest, query, body }.
// `rest` is wat er na het pad komt, bijvoorbeeld het id in /api/projecten/<id>.
const API = [
  ['/api/importeer', './src/server/importeer.mjs'],
  ['/api/projecten', './src/server/projecten.mjs'],
];

// Bibliotheken importeren elkaar met een kale naam ("spessasynth_core"); een browser zonder bouwstap begrijpt dat niet.
// Bij het leveren van /vendor/-scripts zet de server die namen om naar de paden hierboven.
const KALE_NAMEN = {
  spessasynth_core: '/vendor/spessasynth-core/index.js',
  fflate: '/vendor/fflate/browser.js',
  'stb-vorbis': '/vendor/stb-vorbis/index.js',
};

function zetNamenOm(tekst) {
  return tekst.replace(/(\bfrom\s*|\bimport\s*\(\s*)(["'])([^"'./][^"']*)\2/g, (geheel, voor, quote, naam) =>
    KALE_NAMEN[naam] ? `${voor}${quote}${KALE_NAMEN[naam]}${quote}` : geheel);
}

const SOORTEN = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
  '.sf2': 'application/octet-stream',
  '.sf3': 'application/octet-stream',
};

// Alleen eigen bestanden, geen inline scripts. Verovio heeft WebAssembly nodig, de speler een audio-worklet.
const KOPPEN = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function stuur(antwoord, status, body, soort = 'application/json; charset=utf-8') {
  antwoord.writeHead(status, { ...KOPPEN, 'Content-Type': soort });
  antwoord.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

async function leesBody(verzoek) {
  const delen = [];
  let lengte = 0;
  for await (const deel of verzoek) {
    lengte += deel.length;
    if (lengte > MAX_UPLOAD) throw Object.assign(new Error('Het bestand is te groot (maximaal 25 MB).'), { status: 413 });
    delen.push(deel);
  }
  return Buffer.concat(delen);
}

async function api(verzoek, antwoord, url, module) {
  const pad = API.find(([p]) => url.pathname === p || url.pathname.startsWith(`${p}/`))[0];
  const afhandelaar = (await import(pathToFileURL(join(HIER, module)).href)).default;
  const body = ['POST', 'PUT'].includes(verzoek.method) ? await leesBody(verzoek) : Buffer.alloc(0);
  const uit = await afhandelaar({
    methode: verzoek.method,
    pad,
    rest: decodeURIComponent(url.pathname.slice(pad.length).replace(/^\//, '')),
    query: Object.fromEntries(url.searchParams),
    body,
    koppen: verzoek.headers,
  });
  stuur(antwoord, uit.status ?? 200, uit.body ?? {}, uit.soort);
}

async function bestand(antwoord, url) {
  const [voorvoegsel, map] = MAPPEN.find(([p]) => url.pathname.startsWith(p));
  let relatief = decodeURIComponent(url.pathname.slice(voorvoegsel.length));
  if (relatief === '' || relatief.endsWith('/')) relatief += 'index.html';
  const volledig = normalize(join(map, relatief));
  // Nooit buiten de map: ../ in de URL levert een 404 op, geen bestand van elders.
  if (volledig !== map && !volledig.startsWith(map + sep)) return stuur(antwoord, 404, { fout: 'Niet gevonden.' });
  try {
    let inhoud = await readFile(volledig);
    if (voorvoegsel.startsWith('/vendor/') && ['.js', '.mjs'].includes(extname(volledig))) inhoud = zetNamenOm(inhoud.toString('utf8'));
    stuur(antwoord, 200, inhoud, SOORTEN[extname(volledig)] ?? 'application/octet-stream');
  } catch {
    stuur(antwoord, 404, { fout: 'Niet gevonden.' });
  }
}

export function maakServer() {
  return createServer(async (verzoek, antwoord) => {
    try {
      const url = new URL(verzoek.url, 'http://localhost');
      const route = API.find(([p]) => url.pathname === p || url.pathname.startsWith(`${p}/`));
      if (route) return await api(verzoek, antwoord, url, route[1]);
      if (verzoek.method !== 'GET' && verzoek.method !== 'HEAD') return stuur(antwoord, 405, { fout: 'Dat kan hier niet.' });
      return await bestand(antwoord, url);
    } catch (fout) {
      stuur(antwoord, fout.status ?? 500, { fout: fout.status ? fout.message : 'Er ging iets mis op de server.' });
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const poort = Number(process.env.PORT || 5175);
  maakServer().listen(poort, () => console.log(`SCORE2SOUND draait op http://localhost:${poort}`));
}
