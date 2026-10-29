// Controleert de harde regels uit werkpakketten/00-werkwijze.md op een diff.
// Gebruik: node hermes/regels-controle.mjs [--basis main] [--toegestaan "pad1,pad2"] [--maxregels 150] [--stdin]
// Zonder --stdin leest het script `git diff <basis>...HEAD`. Exitcode 1 bij een overtreding.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// Projectregels van SCORE2SOUND.
// Mappen met code die in de browser draait. Daarin zijn inline scripts en externe bronnen (CDN) een fout.
// Leeg = deze controle staat uit.
const FRONTEND_MAPPEN = ['app/public/'];
// Bestanden waarin een nieuwe regel een nieuwe dependency kan zijn.
const DEPENDENCY_BESTANDEN = /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml)$/;
// Bibliotheken waar Mels akkoord op gaf (plan van 29 oktober 2026). Een nieuwe komt hier pas na zijn akkoord bij.
const TOEGESTANE_DEPENDENCIES = new Set(['fast-xml-parser', 'spessasynth_lib', 'verovio']);

const args = process.argv.slice(2);
const optie = (naam, standaard) => {
  const i = args.indexOf(naam);
  return i >= 0 && args[i + 1] ? args[i + 1] : standaard;
};
const basis = optie('--basis', 'main');
const maxRegels = Number(optie('--maxregels', '150'));
const toegestaan = optie('--toegestaan', '').split(',').map((s) => s.trim()).filter(Boolean);

const diff = args.includes('--stdin')
  ? readFileSync(0, 'utf8')
  : execFileSync('git', ['diff', '--unified=0', `${basis}...HEAD`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

// Het teken voor een nieuwe regel, als code zodat het niet door een editor wordt aangepast.
const NIEUWE_REGEL = String.fromCharCode(10);

// Splits de diff in toegevoegde regels per bestand, en onthoud welke bestanden verwijderd zijn.
const bestanden = new Map();
const verwijderdeBestanden = [];
let huidig = null;
let vorigeOud = null;
for (const regel of diff.split(NIEUWE_REGEL)) {
  const oud = regel.match(/^--- a\/(.+)$/);
  if (oud) { vorigeOud = oud[1]; continue; }
  if (regel.startsWith('+++ /dev/null')) { if (vorigeOud) verwijderdeBestanden.push(vorigeOud); huidig = null; continue; }
  const kop = regel.match(/^\+\+\+ b\/(.+)$/);
  if (kop) { huidig = kop[1]; bestanden.set(huidig, []); continue; }
  if (huidig && regel.startsWith('+') && !regel.startsWith('+++')) bestanden.get(huidig).push(regel.slice(1));
}

// Sleutels en tokens die nooit in de repo mogen. In stukken geschreven, zodat dit bestand zichzelf niet afkeurt
// en een zoekactie naar sleutels in de repo dit bestand niet vindt.
const SLEUTELS = [
  ['GitHub-token', new RegExp('\\b(gh' + '[pousr]_[A-Za-z0-9]{30,}|github' + '_pat_[A-Za-z0-9_]{30,})')],
  ['OpenRouter-sleutel', new RegExp('\\bsk' + '-or-v1-[0-9a-f]{30,}')],
  ['OpenAI- of Anthropic-sleutel', new RegExp('\\bsk' + '-(?!or-)(proj-|ant-)?[A-Za-z0-9_-]{30,}')],
  ['privésleutel', new RegExp('-----BEGIN [A-Z ]*PRIV' + 'ATE KEY-----')],
];

const fouten = [];
const waarschuwingen = [];
const fout = (bestand, tekst) => fouten.push(`${bestand}: ${tekst}`);
const waarschuw = (bestand, tekst) => waarschuwingen.push(`${bestand}: ${tekst}`);

// Een diff die veel groter is dan een kleine taak hoort niet door te glippen.
let toegevoegd = 0;
let verwijderd = 0;
for (const regel of diff.split(NIEUWE_REGEL)) {
  if (regel.startsWith('+') && !regel.startsWith('+++')) toegevoegd += 1;
  if (regel.startsWith('-') && !regel.startsWith('---')) verwijderd += 1;
}
if (toegevoegd + verwijderd > maxRegels) fout('diff', `te groot: ${toegevoegd} regels erbij en ${verwijderd} eraf (maximaal ${maxRegels})`);

// Nieuwe pakketten in een package.json: vergelijk de dependency-lijsten van de oude en de nieuwe versie.
// Zonder bestanden (--stdin) valt hij terug op de toegevoegde regels die op een versie lijken.
function nieuwePakketten(bestand, regels) {
  const SOORTEN = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
  const namen = (tekst) => new Set(SOORTEN.flatMap((s) => Object.keys(JSON.parse(tekst)[s] ?? {})));
  if (args.includes('--stdin')) return regels.filter((r) => /^\s*"[^"]+":\s*"[\^~]?\d/.test(r) && !/^\s*"version"/.test(r));
  let oud = new Set();
  try {
    oud = namen(execFileSync('git', ['show', `${basis}:${bestand}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch {
    // Nieuw bestand: alles is nieuw.
  }
  let nu;
  try {
    nu = namen(readFileSync(bestand, 'utf8'));
  } catch {
    return ['package.json is geen geldige JSON'];
  }
  return [...nu].filter((n) => !oud.has(n) && !TOEGESTANE_DEPENDENCIES.has(n));
}

const magVeranderen = (bestand) => !toegestaan.length || toegestaan.some((t) => bestand === t || bestand.startsWith(t.endsWith('/') ? t : `${t}/`));

for (const bestand of verwijderdeBestanden) {
  if (!magVeranderen(bestand)) fout(bestand, 'verwijderd, en staat niet in de lijst met toegestane bestanden');
  else waarschuw(bestand, 'bestand verwijderd: controleer of de taak dat vraagt');
}

for (const [bestand, regels] of bestanden) {
  if (!magVeranderen(bestand)) fout(bestand, 'staat niet in de lijst met toegestane bestanden');
  if (/(^|\/)\.env(\.|$)/.test(bestand) && !bestand.endsWith('.env.example')) fout(bestand, 'een .env-bestand hoort niet in de repo');
  // Het regeleinde aan het einde van een bestand mag niet verdwijnen.
  if (!args.includes('--stdin')) {
    try {
      const oud = execFileSync('git', ['show', `${basis}:${bestand}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      const nieuw = readFileSync(bestand, 'utf8');
      if (oud.endsWith(NIEUWE_REGEL) && !nieuw.endsWith(NIEUWE_REGEL)) fout(bestand, 'het regeleinde aan het einde van het bestand is verwijderd');
    } catch {
      // Nieuw bestand of niet te lezen: niets te vergelijken.
    }
  }
  // Syntax: een kapot bestand gaat terug naar de agent voordat iemand er tijd aan besteedt.
  if (!args.includes('--stdin') && existsSync(bestand)) {
    // Alleen de regels die zeggen waar en wat (bestand:regel, de coderegel, het soort fout), niet de stacktrace.
    const meld = (e) => {
      const regels = String(e.stderr || e.message).split(NIEUWE_REGEL).map((r) => r.trimEnd()).filter(Boolean);
      const kern = regels.filter((r) => !/^\s+at |^Node\.js v/.test(r)).slice(0, 4).join(' | ').split(process.cwd() + '\\').join('').split(process.cwd() + '/').join('');
      fout(bestand, `syntaxfout: ${kern.slice(0, 300)}`);
    };
    if (/\.(js|mjs|cjs)$/.test(bestand)) {
      try { execFileSync(process.execPath, ['--check', bestand], { stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { meld(e); }
    } else if (/\.json$/.test(bestand)) {
      try { JSON.parse(readFileSync(bestand, 'utf8')); } catch (e) { meld(e); }
    } else if (/\.py$/.test(bestand)) {
      try {
        execFileSync(process.env.PYTHON || 'python', ['-I', '-c', 'import ast,sys; ast.parse(open(sys.argv[1], encoding="utf-8").read(), sys.argv[1])', bestand], { stdio: ['ignore', 'pipe', 'pipe'] });
      } catch (e) { if (e.code !== 'ENOENT') meld(e); }
    }
  }
  // Een agent die tests aanpast, kan ze ook makkelijker laten slagen. Dat mag alleen als de taak erom vraagt.
  if (/(^|\/)(tests?|__tests__)\/|\.(test|spec)\.[a-z]+$|(^|\/)test_[^/]+\.py$|_test\.py$/.test(bestand)) waarschuw(bestand, 'testbestand gewijzigd: controleer of de taak dat vraagt');
  const frontend = FRONTEND_MAPPEN.some((m) => bestand.startsWith(m));
  regels.forEach((r) => {
    for (const [soort, patroon] of SLEUTELS) if (patroon.test(r)) fout(bestand, `lijkt een ${soort} te bevatten`);
    if (frontend && /<script(?![^>]*\ssrc=)[^>]*>/i.test(r)) fout(bestand, 'inline script (alleen <script src> is toegestaan)');
    if (frontend && /(src|href)=["']https?:\/\//i.test(r)) fout(bestand, 'externe bron of CDN');
    if (frontend && /@import\s+url\(["']?https?:/i.test(r)) fout(bestand, 'externe CSS-import');
  });
  if (DEPENDENCY_BESTANDEN.test(bestand)) {
    const nieuw = bestand.endsWith('package.json') ? nieuwePakketten(bestand, regels) : regels.filter((r) => /^\s*"?[A-Za-z0-9_.-]+\s*([=<>~!]=|>|<|"|$)/.test(r) && !/^\s*(#|\[)/.test(r));
    if (nieuw.length) fout(bestand, `mogelijk nieuwe dependency: ${nieuw.map((r) => r.trim()).join(' ')}`);
  }
}

if (fouten.length) {
  console.error('Regelcontrole: niet geslaagd');
  fouten.forEach((f) => console.error(`- ${f}`));
  process.exit(1);
}
console.log(`Regelcontrole: geslaagd (${bestanden.size} bestand(en) gecontroleerd, ${toegevoegd} regels erbij, ${verwijderd} eraf)`);
waarschuwingen.forEach((w) => console.log(`Let op: ${w}`));
