// SCORE2SOUND-server: levert de app aan de browser en beantwoordt de API.
// Starten met `npm start` in app/; daarna draait de app op http://localhost:5175.
import { createServer as maakNodeServer } from 'node:http';

function createServer(...args) {
  const afhandelaar = args[0];
  if (typeof afhandelaar === 'function') {
    args[0] = (verzoek, antwoord) => {
      const jsonVerzoek = verzoek.headers['content-type']?.split(';')[0].trim() === 'application/json';
      const jsonPad = verzoek.url === '/api/projecten' || verzoek.url === '/api/account';
      const jsonMethode = verzoek.method === 'POST' || verzoek.method === 'PUT' || verzoek.method === 'DELETE';
      const grootte = Number(verzoek.headers['content-length']);
      if (jsonVerzoek && jsonPad && jsonMethode && grootte > 10_000_000) {
        antwoord.writeHead(413, { 'content-type': 'application/json; charset=utf-8' });
        antwoord.end(JSON.stringify({ fout: 'Dit verzoek is te groot.' }));
        return;
      }
      afhandelaar(verzoek, antwoord);
    };
  }
  const server = maakNodeServer(...args);
  server.headersTimeout = 15000;
  server.requestTimeout = 600000;
  server.keepAliveTimeout = 5000;
  return server;
}
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';

const HIER = dirname(fileURLToPath(import.meta.url));
const MAX_UPLOAD = 100 * 1024 * 1024; // een gescande partituur is al snel 50 MB

// Wat de browser mag ophalen, met het begin van de URL. De eerste die past wint.
// Uit src/ alleen de modules die ook in de browser draaien; src/server/ blijft op de server.
const MAPPEN = [
  ['/src/model/', join(HIER, 'src', 'model')],
  ['/src/musicxml/', join(HIER, 'src', 'musicxml')],
  ['/src/controle/', join(HIER, 'src', 'controle')],
  ['/src/midi/', join(HIER, 'src', 'midi')],
  ['/src/export/', join(HIER, 'src', 'export')],
  ['/src/import/', join(HIER, 'src', 'import')],
  ['/src/project/', join(HIER, 'src', 'project')],
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
  ['/api/pdf', './src/server/pdf.mjs'],
  ['/api/account', './src/server/inloggen.mjs'],
  ['/api/importeer', './src/server/importeer.mjs'],
  ['/api/herken', './src/server/herken.mjs'],
  ['/api/proef', './src/server/proef.mjs'],
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
const KOPPEN = new Proxy({
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'",
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
}, {
  ownKeys(koppen) {
    return Reflect.ownKeys(koppen).filter((naam) =>
      naam !== "Strict-Transport-Security" || process.env.SCORE2SOUND_HTTPS === "aan"
    );
  },
});

async function stuur(antwoord, status, body, soort = 'application/json; charset=utf-8', extra = {}, acceptEncoding = '') {
  const isBytes = Buffer.isBuffer(body);
  let inhoud = typeof body === 'string' || isBytes ? body : JSON.stringify(body);
  const pakker = !isBytes && soort?.toLowerCase().startsWith('application/json')
    && Buffer.byteLength(inhoud) > 1024 ? kiesPakker(acceptEncoding) : undefined;
  const koppen = { ...KOPPEN, 'Content-Type': soort, ...extra };
  if (pakker) {
    inhoud = await PAKKERS[pakker](Buffer.from(inhoud));
    koppen['Content-Encoding'] = pakker;
    koppen.Vary = koppen.Vary ? `${koppen.Vary}, Accept-Encoding` : 'Accept-Encoding';
  }
  antwoord.writeHead(status, koppen);
  antwoord.end(inhoud);
}

// Tekst en WebAssembly pakken goed in: Verovio gaat van 7 MB naar ongeveer 2 MB. De klankbank is al ingepakt.
const INPAKKEN = new Set(['.html', '.css', '.js', '.mjs', '.json', '.svg', '.wasm']);
const PAKKERS = {
  br: (inhoud) => promisify(brotliCompress)(inhoud, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }),
  gzip: (inhoud) => promisify(gzip)(inhoud),
};
const ingepakt = new Map(); // etag -> ingepakte inhoud, zodat elk bestand maar één keer wordt ingepakt

function kiesPakker(accept = '') {
  return Object.keys(PAKKERS).find((naam) => new RegExp(`\\b${naam}\\b`).test(accept));
}

function leesBody(verzoek) {
  return new Promise((ok, mis) => {
    const delen = [];
    let lengte = 0;
    let teGroot = false;
    verzoek.on('data', (deel) => {
      if (teGroot) return;
      lengte += deel.length;
      if (lengte > MAX_UPLOAD) {
        teGroot = true;
        mis(Object.assign(new Error('Het bestand is te groot (maximaal 100 MB).'), { status: 413 }));
        return;
      }
      delen.push(deel);
    });
    verzoek.on('end', () => {
      if (!teGroot) ok(Buffer.concat(delen));
    });
    verzoek.on('error', mis);
  });
}

async function api(verzoek, antwoord, url, module, gebruiker) {
  const pad = API.find(([p]) => url.pathname === p || url.pathname.startsWith(`${p}/`))[0];
  const afhandelaar = (await import(pathToFileURL(join(HIER, module)).href)).default;
  const body = ['POST', 'PUT', 'DELETE'].includes(verzoek.method) ? await leesBody(verzoek) : Buffer.alloc(0);
  const uit = await afhandelaar({
    methode: verzoek.method,
    pad,
    rest: decodeURIComponent(url.pathname.slice(pad.length).replace(/^\//, '')),
    query: Object.fromEntries(url.searchParams),
    body,
    koppen: verzoek.headers,
    gebruiker,
  });
  await stuur(antwoord, uit.status ?? 200, uit.body ?? {}, uit.soort, uit.koppen, verzoek.headers['accept-encoding']);
}

function geldigeOrigin(verzoek) {
  const origin = verzoek.headers.origin;
  const host = verzoek.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}

function cookieToken(verzoek) {
  const cookie = (verzoek.headers.cookie || '').split(';').map((deel) => deel.trim())
    .find((deel) => deel.startsWith('score2sound='));
  return cookie?.slice('score2sound='.length);
}

async function bestand(verzoek, antwoord, url) {
  const [voorvoegsel, map] = MAPPEN.find(([p]) => url.pathname.startsWith(p));
  let relatief = decodeURIComponent(url.pathname.slice(voorvoegsel.length));
  if (url.pathname === '/app' || url.pathname === '/app/') relatief = 'index.html';
  else if (url.pathname === '/') relatief = (verzoek.headers.cookie || '').includes('score2sound=') ? 'index.html' : 'welkom.html';
  else if (relatief === '' || relatief.endsWith('/')) relatief += 'index.html';
  const volledig = normalize(join(map, relatief));
  // Nooit buiten de map: ../ in de URL levert een 404 op, geen bestand van elders.
  if (volledig !== map && !volledig.startsWith(map + sep)) return stuur(antwoord, 404, { fout: 'Niet gevonden.' }, undefined, {}, verzoek.headers['accept-encoding']);
  try {
    const info = await stat(volledig);
    const pakker = INPAKKEN.has(extname(volledig)) ? kiesPakker(verzoek.headers['accept-encoding']) : undefined;
    const etag = `"${[info.size, Math.round(info.mtimeMs), pakker].filter(Boolean).join('-')}"`;
    const extra = { ETag: etag, 'Cache-Control': 'no-cache', ...(pakker ? { 'Content-Encoding': pakker, Vary: 'Accept-Encoding' } : {}) };
    const soort = SOORTEN[extname(volledig)] ?? 'application/octet-stream';
    if (verzoek.headers['if-none-match'] === etag) return stuur(antwoord, 304, '', soort, extra);

    let inhoud = ingepakt.get(`${volledig}|${etag}`);
    if (!inhoud) {
      inhoud = await readFile(volledig);
      if (voorvoegsel.startsWith('/vendor/') && ['.js', '.mjs'].includes(extname(volledig))) inhoud = zetNamenOm(inhoud.toString('utf8'));
      if (pakker) {
        inhoud = await PAKKERS[pakker](inhoud);
        ingepakt.set(`${volledig}|${etag}`, inhoud);
      }
    }
    await stuur(antwoord, 200, inhoud, soort, extra);
  } catch {
    await stuur(antwoord, 404, { fout: 'Niet gevonden.' });
  }
}

export function maakServer() {
  return createServer(async (verzoek, antwoord) => {
    try {
      const url = new URL(verzoek.url, 'http://localhost');
      if (verzoek.method === 'GET' && url.pathname === '/api/gezond') {
        return await stuur(antwoord, 200, { ok: true }, undefined, {}, verzoek.headers['accept-encoding']);
      }
      const route = API.find(([p]) => url.pathname === p || url.pathname.startsWith(`${p}/`));
      if (route) {
        let gebruiker;
        if (process.env.SCORE2SOUND_ACCOUNTS === 'aan') {
          if (['POST', 'PUT', 'DELETE'].includes(verzoek.method) && !geldigeOrigin(verzoek)) {
            return await stuur(antwoord, 403, { fout: 'Deze aanvraag is niet toegestaan.' }, undefined, {}, verzoek.headers['accept-encoding']);
          }
if (route[0] !== '/api/account' && route[0] !== '/api/proef') {
            const { gebruikerVan } = await import(pathToFileURL(join(HIER, './src/server/inloggen.mjs')).href);
            gebruiker = await gebruikerVan(cookieToken(verzoek));
            if (!gebruiker) return await stuur(antwoord, 401, { fout: 'Log eerst in.' }, undefined, {}, verzoek.headers['accept-encoding']);
            gebruiker = gebruiker.id;
          }
        }
        return await api(verzoek, antwoord, url, route[1], gebruiker);
      }
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
        return await stuur(antwoord, 404, { fout: 'Niet gevonden.' }, undefined, {}, verzoek.headers['accept-encoding']);
      }
      if (verzoek.method !== 'GET' && verzoek.method !== 'HEAD') return await stuur(antwoord, 405, { fout: 'Dat kan hier niet.' }, undefined, {}, verzoek.headers['accept-encoding']);
      return await bestand(verzoek, antwoord, url);
    } catch (fout) {
      const status = fout.status === 413 ? 413 : 500;
      await stuur(antwoord, status, { fout: status === 413 ? fout.message : 'Er ging iets mis op de server.' }, undefined, {}, verzoek.headers['accept-encoding']);
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === normalize(process.argv[1])) {
  const poort = Number(process.env.PORT || 5175);
  maakServer().listen(poort, () => console.log(`SCORE2SOUND draait op http://localhost:${poort}`));
}
import { ruimOudeHerkenningenOp } from './src/server/opruimen.mjs';

setTimeout(() => {
  ruimOudeHerkenningenOp({
    map: process.env.SCORE2SOUND_HERKENNING || join(HIER, 'herkenning'),
    projectenMap: process.env.SCORE2SOUND_PROJECTEN || join(HIER, 'projecten'),
  }).catch((fout) => console.error('Opruimen lukte niet:', fout));
}, 0);
import { Server as HttpServer } from "node:http";

export function logRegel(methode, url, statuscode, duurMs, tijd = new Date()) {
  const pad = new URL(url, "http://localhost").pathname;
  return `${tijd.toISOString()} ${methode} ${pad} ${statuscode} ${duurMs}`;
}

const oorspronkelijkEmit = HttpServer.prototype.emit;
HttpServer.prototype.emit = function (naam, ...argumenten) {
  if (naam === "request") {
    const [verzoek, antwoord] = argumenten;
    const begonnen = performance.now();
    antwoord.once("finish", () => {
      if (process.env.SCORE2SOUND_LOG === "aan") {
        const duurMs = Math.round(performance.now() - begonnen);
        console.log(logRegel(verzoek.method, verzoek.url, antwoord.statusCode, duurMs));
      }
    });
  }
  return oorspronkelijkEmit.call(this, naam, ...argumenten);
};
