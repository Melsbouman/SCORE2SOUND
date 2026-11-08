#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Gebruik: bash automatisering/echte-controle.sh <pdf> [paginas]" >&2
  exit 2
fi

if [[ ! -f $1 ]]; then
  echo "PDF niet gevonden: $1" >&2
  exit 2
fi

root=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)
pdf=$(cd -- "$(dirname -- "$1")" && pwd)/$(basename -- "$1")
paginas=${2:-}
tijdelijk=$(mktemp -d "${TMPDIR:-/tmp}/score2sound-herkenning.XXXXXX")
herkenning_map="$tijdelijk/herkenning"
mkdir -p "$herkenning_map"
server_pid=

opruimen() {
  if [[ -n $server_pid ]]; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  rm -rf -- "$tijdelijk"
}
trap opruimen EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

poort=$(node -e 'const net = require("node:net"); const server = net.createServer(); server.listen(0, "127.0.0.1", () => { const poort = server.address().port; server.close(() => process.stdout.write(String(poort))); });')
PORT="$poort" SCORE2SOUND_HERKENNING="$herkenning_map" node "$root/app/server.mjs" >"$tijdelijk/server.log" 2>&1 &
server_pid=$!

HERKENNING_LOG="$tijdelijk/server.log" node - "$pdf" "$paginas" "$poort" <<'NODE'
const fs = require('node:fs/promises');
const path = require('node:path');

const [pdf, paginas, poort] = process.argv.slice(2);
const basis = `http://127.0.0.1:${poort}`;
const wacht = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function leesJson(antwoord, omschrijving) {
  const tekst = await antwoord.text();
  let inhoud;
  try {
    inhoud = JSON.parse(tekst);
  } catch {
    throw new Error(`${omschrijving}: de server gaf geen geldige JSON terug (HTTP ${antwoord.status}).`);
  }
  if (!antwoord.ok) throw new Error(`${omschrijving}: ${inhoud.fout || `HTTP ${antwoord.status}`}`);
  return inhoud;
}

async function main() {
  const gereedVoor = Date.now() + 30000;
  let laatsteFout = 'onbekende fout';
  while (Date.now() < gereedVoor) {
    try {
      const antwoord = await fetch(`${basis}/`);
      if (antwoord.ok) break;
      laatsteFout = `HTTP ${antwoord.status}`;
    } catch (fout) {
      laatsteFout = fout.message;
    }
    if (Date.now() >= gereedVoor) throw new Error(`De server startte niet op: ${laatsteFout}`);
    await wacht(250);
  }

  const query = new URLSearchParams({ naam: path.basename(pdf), paginas });
  const bestand = await fs.readFile(pdf);
  const gestart = await leesJson(await fetch(`${basis}/api/herken?${query}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/pdf' },
    body: bestand,
  }), 'Herkenning starten mislukt');

  const klaarVoor = Date.now() + 15 * 60 * 1000;
  let resultaat;
  do {
    resultaat = await leesJson(await fetch(`${basis}/api/herken/${encodeURIComponent(gestart.id)}`), 'Stand ophalen mislukt');
    if (resultaat.stand === 'klaar' || resultaat.stand === 'fout') break;
    const resterend = klaarVoor - Date.now();
    if (resterend <= 0) throw new Error(`Herkenning duurde langer dan 15 minuten (laatste stand: ${resultaat.stand}).`);
    await wacht(Math.min(5000, resterend));
  } while (true);

  const partituur = resultaat.partituur || {};
  if (process.env.VERGELIJK_UIT && resultaat.partituur) await fs.writeFile(process.env.VERGELIJK_UIT, JSON.stringify(resultaat.partituur));
  const partijen = partituur.partijen || [];
  const letters = [];
  let onzekereNoten = 0;
  let matenMetMaatrust = 0;
  for (const partij of partijen) {
    for (const maat of partij.maten || []) {
      if (maat.maatrust != null) matenMetMaatrust++;
      for (const element of maat.elementen || []) {
        if (element.soort === 'noot' && Number.isFinite(element.zekerheid) && element.zekerheid < 0.8) onzekereNoten++;
        if (element.soort === 'aanwijzing' && element.type === 'letter') {
          letters.push(`${element.waarde} (maat ${maat.nummer ?? maat.index + 1}, ${partij.naam})`);
        }
      }
    }
  }

  console.log(`Stand: ${resultaat.stand}`);
  if (resultaat.fout) console.log(`Fout: ${resultaat.fout}`);
  if (resultaat.stand === 'fout') {
    const log = await fs.readFile(process.env.HERKENNING_LOG, 'utf8').catch(() => '');
    const foutregels = log.split(/\r?\n/).filter((regel) => regel.includes('ERROR') || regel.includes('Exception')).slice(-5);
    for (const regel of foutregels) console.log(regel);
  }
  console.log('Partijen:');
  if (partijen.length === 0) console.log('- (geen)');
  for (const partij of partijen) {
    console.log(`- ${partij.naam}: midiProgramma ${partij.instrument?.midiProgramma ?? 'onbekend'}`);
  }
  console.log(`Letters: ${letters.length ? letters.join('; ') : '(geen)'}`);
  console.log(`Noten met zekerheid onder 0,8: ${onzekereNoten}`);
  console.log(`Maten met maatrust: ${matenMetMaatrust}`);
  console.log('Eerste vijf meldingen:');
  const meldingen = (resultaat.meldingen || []).slice(0, 5);
  if (meldingen.length === 0) console.log('- (geen)');
  for (const melding of meldingen) console.log(`- ${melding.tekst || JSON.stringify(melding)}`);
}

main().catch((fout) => {
  console.error(fout.message);
  process.exitCode = 1;
});
NODE
