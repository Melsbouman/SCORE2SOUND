#!/bin/bash
# SCORE2SOUND-runner. Het script doet alle vaste stappen (issue claimen, branch, controles,
# commit, push, PR, labels); het model bewerkt alleen de bestanden uit het issue.
# Gebruik: met de hand of via werkpakketten.sh; later eventueel elke 15 minuten met de Windows Taakplanner.
# Exitcode 0 = taak afgerond, 1 = vastgelopen, 10 = niets te doen.
# Instellingen via omgevingsvariabelen: AIFLOW_ALLEEN (alleen de wachtrij van één uitvoerder), AIFLOW_UITVOERDER,
# AIFLOW_CODEX_MODEL, AIFLOW_COPILOT_MODEL, AIFLOW_HERMES_MODEL, AIFLOW_FALLBACK_MODEL, AIFLOW_KLOON en AIFLOW_STATUS.
set -u
export PYTHONUTF8=1

GH="${GH:-/c/Program Files/GitHub CLI/gh.exe}"
HERMES="${HERMES:-$LOCALAPPDATA/hermes/bin/hermes.exe}"
HERMES_LOG="${HERMES_LOG:-$LOCALAPPDATA/hermes/logs/agent.log}"
R="${AIFLOW_REPO:-Melsbouman/SCORE2SOUND}"
KLOON="${AIFLOW_KLOON:-/c/Users/mels1/SCORE2SOUND-agent}"

# Drie uitvoerders. Claude kiest per taak wie hem krijgt, met een label op het issue:
#   agent-codex    het Codex-programma met het ChatGPT-account (bouwer)
#   agent-copilot  het Copilot-programma met het studentenabonnement (bouwer)
#   agent-hermes   Hermes via OpenRouter, voor kleine achtergrondtaken (eerst een gratis model)
# Zonder label krijgt AIFLOW_STANDAARD (codex) de taak. AIFLOW_UITVOERDER dwingt een uitvoerder af, ook boven het label.
standaard_model() {
  case "$1" in
    codex) echo "${AIFLOW_CODEX_MODEL:-standaard}" ;; # "standaard": het model uit ~/.codex/config.toml
    copilot) echo "${AIFLOW_COPILOT_MODEL:-auto}" ;;
    hermes) echo "${AIFLOW_HERMES_MODEL:-cohere/north-mini-code:free}" ;;
  esac
}
standaard_provider() {
  case "$1" in
    codex) echo "codex-programma" ;;
    copilot) echo "copilot-programma" ;;
    hermes) echo "${AIFLOW_HERMES_PROVIDER:-openrouter}" ;;
  esac
}
# Wie het overneemt als een uitvoerder niets heeft gewijzigd (limiet op, abonnement nog niet actief, model faalt).
# "hermes-reserve" is Hermes met het reserve-model; leeg AIFLOW_FALLBACK_MODEL= slaat die stap over.
reserves() {
  case "$1" in
    codex) echo "copilot hermes-reserve" ;;
    copilot) echo "codex hermes-reserve" ;;
    hermes) echo "hermes-reserve" ;;
  esac
}
UITVOERDER="${AIFLOW_UITVOERDER:-${AIFLOW_ALLEEN:-${AIFLOW_STANDAARD:-codex}}}"
case "$UITVOERDER" in
  codex|copilot|hermes) ;;
  *) echo "onbekende uitvoerder: $UITVOERDER (kies codex, copilot of hermes)" >&2; exit 1 ;;
esac
MODEL="$(standaard_model "$UITVOERDER")"
PROVIDER="$(standaard_provider "$UITVOERDER")"
FALLBACK_MODEL="${AIFLOW_FALLBACK_MODEL-anthropic/claude-haiku-5.5}"
FALLBACK_PROVIDER="${AIFLOW_FALLBACK_PROVIDER:-openrouter}"
# Statusbestand voor het paneel (de mod Agents leest deze map).
STATUS="${AIFLOW_STATUS:-$HOME/.aiflow-status}"
mkdir -p "$STATUS"
DIR="$(cd "$(dirname "$0")" && pwd)"
WERK="$(mktemp -d)"
START=$(date +%s)

log() { echo "$(date +%H:%M:%S) $*"; }

LAATSTE="geen taken"
# Schrijft wat dit script nu doet naar een JSON-bestand voor het paneel.
# $1 = bezig of standby, $2 = taak of laatste resultaat, $3 = voortgang van 0 tot 1, $4 = fase.
status_zet() {
  ST="$1" TK="$2" VG="${3:-0}" FS="${4:-}" AG="$UITVOERDER" MD="$MODEL" BEGIN="${START:-0}" PYTHONUTF8=1 python -I -X utf8 -c "
import json,os,time
print(json.dumps({'agent':os.environ['AG'],'status':os.environ['ST'],'taak':os.environ['TK'],'model':os.environ['MD'],'start':int(os.environ['BEGIN']),'bijgewerkt':int(time.time()),'voortgang':float(os.environ['VG']),'fase':os.environ['FS']}))" > "$STATUS/$UITVOERDER${AIFLOW_ISSUE:+-$AIFLOW_ISSUE}.json" 2>/dev/null
}
# Voegt een regel toe aan de geschiedenis (voor het paneel): wie deed welke taak, hoe lang en met welk resultaat.
UITV_GEBRUIKT=""
historie() { # $1 = resultaat
  [ -n "${ISSUE:-}" ] || return 0
  HIS="$1" IS="$ISSUE" TT="${TITEL:-}" UV="${UITV_GEBRUIKT:-$UITVOERDER}" MD="$MODEL" SC="$(( $(date +%s) - START ))" MO="${MODUS:-}" TI="${TOK_IN:-0}" TU="${TOK_UIT:-0}" PYTHONUTF8=1 python -I -X utf8 -c "
import json,os,time
print(json.dumps({'tijd':int(time.time()),'issue':int(os.environ['IS']),'titel':os.environ['TT'],'uitvoerder':os.environ['UV'],'model':os.environ['MD'],'seconden':int(os.environ['SC']),'resultaat':os.environ['HIS'],'modus':os.environ['MO'],'tokens_in':int(os.environ['TI']),'tokens_uit':int(os.environ['TU'])},ensure_ascii=False))" >> "$STATUS/geschiedenis.jsonl" 2>/dev/null
}

# Een parallelle werker ruimt zijn eigen statusbestand op; de gewone runner laat "standby" met het laatste resultaat staan.
status_einde() {
  if [ -n "${AIFLOW_ISSUE:-}" ]; then rm -f "$STATUS/$UITVOERDER-$AIFLOW_ISSUE.json"; else status_zet standby "$LAATSTE"; fi
  rm -rf "$WERK"
}
trap status_einde EXIT

# Haalt een veld uit JSON op stdin met een klein pythonprogramma (geen jq nodig).
py() { python -I -X utf8 -c "$1"; }

zet_labels() { # $1 issue, $2 label dat erbij komt; alle andere agent-labels gaan eraf
  local weg=""
  for l in agent-ready agent-bezig agent-terug agent-review agent-vast; do
    [ "$l" = "$2" ] || weg="$weg --remove-label $l"
  done
  "$GH" issue edit "$1" -R "$R" --add-label "$2" $weg >/dev/null 2>&1
}

vast() { # $1 issue, $2 tekst
  "$GH" issue comment "$1" -R "$R" --body "De runner liep vast: $2" >/dev/null 2>&1
  zet_labels "$1" agent-vast
  LAATSTE="vast op #$1: $2"
  historie "vast"
  log "vast op #$1: $2"
  exit 1
}

# 1. Wat is er te doen? Een afgekeurde PR gaat voor, dan het oudste agent-ready issue.
MODUS="nieuw"
if [ -n "${AIFLOW_ISSUE:-}" ]; then
  # Parallelle werker: werkpakketten.sh heeft deze taak gekozen en weet dat de taken elkaar niet raken.
  ISSUE="$AIFLOW_ISSUE"
  "$GH" issue view "$ISSUE" -R "$R" --json labels --jq '[.labels[].name] | index("agent-terug") != null' 2>/dev/null | grep -q true && MODUS="terug"
else
  # Elke uitvoerder heeft een eigen wachtrij (AIFLOW_ALLEEN=codex, copilot of hermes); zonder AIFLOW_ALLEEN is er
  # één wachtrij voor alles. Per wachtrij werkt er hooguit één taak tegelijk. Een taak die een bestand deelt met een
  # lopende taak of met een open PR van een andere taak wacht, zodat twee agents nooit in hetzelfde bestand werken.
  "$GH" issue list -R "$R" --state open --limit 100 --json number,body,labels > "$WERK/open.json" 2>/dev/null || { log "issues lezen mislukt"; exit 10; }
  "$GH" pr list -R "$R" --state open --json body,files > "$WERK/prs.json" 2>/dev/null || echo '[]' > "$WERK/prs.json"
  KEUZE=$(ALLEEN="${AIFLOW_ALLEEN:-}" STANDAARD="${AIFLOW_STANDAARD:-codex}" python -I -X utf8 -c "
import json,os,re,sys
issues=json.load(open(sys.argv[1],encoding='utf-8')); prs=json.load(open(sys.argv[2],encoding='utf-8'))
alleen=os.environ['ALLEEN']; standaard=os.environ['STANDAARD']
def labels(i): return {l['name'] for l in i['labels']}
def wie(i): return next((u for u in ('codex','copilot','hermes') if 'agent-'+u in labels(i)), standaard)
def bestanden(body):
    inn=False; out=set()
    for r in (body or '').splitlines():
        if r.startswith('## '): inn = r.strip()=='## Bestanden'; continue
        if inn and r.startswith('- '+chr(96)) and r.count(chr(96))>=2: out.add(r.split(chr(96))[1].split(' ')[0])
    return out
bezig=[i for i in issues if 'agent-bezig' in labels(i)]
if any(not alleen or wie(i)==alleen for i in bezig): print('bezig'); sys.exit()
bezet=set().union(*[bestanden(i['body']) for i in bezig])
kand=[i for i in issues if labels(i) & {'agent-terug','agent-ready'} and (not alleen or wie(i)==alleen)]
kand.sort(key=lambda i:(0 if 'agent-terug' in labels(i) else 1, i['number']))
for i in kand:
    f=bestanden(i['body'])
    van_prs=set()
    for p in prs:
        if re.search(r'#%d([^0-9]|\$)'%i['number'], p.get('body') or ''): continue
        van_prs |= {x['path'] for x in p.get('files',[])}
    if f & bezet or f & van_prs: continue
    print(i['number'], 'terug' if 'agent-terug' in labels(i) else 'nieuw'); break
" "$WERK/open.json" "$WERK/prs.json")
  if [ "$KEUZE" = "bezig" ]; then log "er werkt al een agent${AIFLOW_ALLEEN:+ ($AIFLOW_ALLEEN)}, niets te doen"; exit 10; fi
  if [ -z "$KEUZE" ]; then log "geen taken${AIFLOW_ALLEEN:+ voor $AIFLOW_ALLEEN}"; exit 10; fi
  ISSUE="${KEUZE%% *}"; MODUS="${KEUZE#* }"
fi

"$GH" issue view "$ISSUE" -R "$R" --json title,body,labels > "$WERK/issue.json" || vast "$ISSUE" "issue lezen mislukt"
TITEL=$(py "import json,sys;print(json.loads(sys.stdin.buffer.read().decode('utf-8'))['title'])" < "$WERK/issue.json")
py "import json,sys;print(json.loads(sys.stdin.buffer.read().decode('utf-8'))['body'])" < "$WERK/issue.json" > "$WERK/body.md"
# Toegestane bestanden: de regels onder "## Bestanden" die met - en een pad tussen backticks beginnen.
TOEGESTAAN=$(py "
import sys
inn=False; out=[]
for r in sys.stdin.buffer.read().decode('utf-8').splitlines():
    if r.startswith('## '): inn = r.strip()=='## Bestanden'; continue
    if inn and r.startswith('- \`') and r.count('\`')>=2: out.append(r.split('\`')[1].split(' ')[0])
print(','.join(out))" < "$WERK/body.md")
# Optioneel: onder "## Verwacht" staan in een codeblok de regels die de wijziging precies moet toevoegen.
py "
import sys
inn=False; blok=False; out=[]
for r in sys.stdin.buffer.read().decode('utf-8').splitlines():
    if r.startswith('## '): inn = r.strip()=='## Verwacht'; blok=False; continue
    if inn and r.strip().startswith('\`\`\`'): blok = not blok; continue
    if inn and blok: out.append(r)
print(chr(10).join(out))" < "$WERK/body.md" | sed '/^$/d' > "$WERK/verwacht.txt"
[ -n "$TOEGESTAAN" ] || vast "$ISSUE" "geen bestanden gevonden onder '## Bestanden' in het issue"
# De uitvoerder van deze taak: het label agent-codex, agent-copilot of agent-hermes.
GEKOZEN=$(py "
import json,sys
d=json.loads(sys.stdin.buffer.read().decode('utf-8'))
namen=[l['name'] for l in d.get('labels',[])]
print(next((u for u in ('codex','copilot','hermes') if 'agent-'+u in namen), ''))" < "$WERK/issue.json")
if [ -n "$GEKOZEN" ] && [ -z "${AIFLOW_UITVOERDER:-}" ]; then
  UITVOERDER="$GEKOZEN"; MODEL="$(standaard_model "$UITVOERDER")"; PROVIDER="$(standaard_provider "$UITVOERDER")"
fi
log "taak #$ISSUE ($MODUS): $TITEL | bestanden: $TOEGESTAAN | $UITVOERDER, model $MODEL"

# 2. Repo klaarzetten.
cd "$KLOON" || vast "$ISSUE" "kloon niet gevonden: $KLOON"
git fetch -q origin || vast "$ISSUE" "git fetch mislukt"
# Eerst alles schoonmaken, anders blijft een eerdere mislukte run zijn wijzigingen houden.
git reset -q --hard && git clean -fdq && git checkout -q main && git reset -q --hard origin/main || vast "$ISSUE" "repo schoonmaken mislukt"
PUSHVLAG=""
if [ "$MODUS" = "terug" ]; then
  PR=$("$GH" pr list -R "$R" --state open --json number,headRefName,body | py "
import json,sys,re
for p in json.loads(sys.stdin.buffer.read().decode('utf-8')):
    if re.search(r'#$ISSUE([^0-9]|\$)', p['body'] or ''): print(p['number'], p['headRefName']); break")
  [ -n "$PR" ] || vast "$ISSUE" "geen open PR gevonden die bij dit issue hoort"
  PRNR="${PR%% *}"; BRANCH="${PR#* }"
  git checkout -q -B "$BRANCH" "origin/$BRANCH" || vast "$ISSUE" "branch $BRANCH uitchecken mislukt"
else
  SLUG=$(echo "$TITEL" | tr 'A-Z' 'a-z' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-40)
  # Het issuenummer voorop: twee taken met een gelijk begin van de titel krijgen zo nooit dezelfde branch.
  BRANCH="agent/$ISSUE-$SLUG"
  # -B: een branch die na een vastgelopen poging nog lokaal bestaat, begint gewoon opnieuw vanaf main.
  # Op GitHub kan die oude poging ook nog staan; de branch hoort alleen bij dit issue, dus overschrijven mag.
  PUSHVLAG="--force"
  git checkout -q -B "$BRANCH" || vast "$ISSUE" "branch $BRANCH maken mislukt"
fi
# Het punt waar het model begint. Maakt een model toch zelf een commit, dan wordt die weer een losse wijziging.
BASIS_HEAD=$(git rev-parse HEAD)
zet_labels "$ISSUE" agent-bezig
status_zet bezig "#$ISSUE $TITEL" 0.15 "voorbereiden"

# 3. Opdracht voor het model: alleen bewerken.
{
  echo "Je bewerkt bestanden in deze map (een kloon van het SCORE2SOUND-project). Je hoeft AGENTS.md en andere projectbestanden niet te lezen: het script controleert de regels."
  echo "Draai zelf geen tests, syntaxcontroles of andere commando's: dat doet het script na jou. Alleen bestanden bewerken."
  echo "Wijzig alleen deze bestanden: $TOEGESTAAN. Behoud het regeleinde aan het einde van elk bestand en verander verder niets."
  echo "Draai GEEN git-commando's, maak geen commit en open geen PR: dat doet het script na jou."
  echo "Je rapport mag kort zijn. Zeg alleen wat je daadwerkelijk hebt gewijzigd."
  echo
  echo "TAAK (issue #$ISSUE):"
  cat "$WERK/body.md"
  if [ "$MODUS" = "terug" ]; then
    echo
    echo "DEZE PR WERD AFGEKEURD. Los alleen de punten uit de opmerkingen op:"
    "$GH" pr view "$PRNR" -R "$R" --comments
    echo
    echo "HUIDIGE WIJZIGING (git diff main...HEAD):"
    git diff main...HEAD
  fi
} > "$WERK/prompt.txt"

# Roept het model aan: $1 = codex, copilot of hermes, $2 = model, $3 = provider (alleen voor hermes).
# Telt daarna de tokens van deze aanroep op bij TOK_IN en TOK_UIT.
TOK_IN=0; TOK_UIT=0
voer_uit() {
  rm -f "$WERK/laatste.txt"
  local begin tokens
  begin=$(date +%s)
  case "$1" in
    hermes)
      timeout 900 "$HERMES" -t terminal,file --provider "$3" -m "$2" -z "$(cat "$WERK/prompt.txt")" > "$WERK/agent.out" 2>&1
      ;;
    copilot)
      # Het Copilot-programma via node, zodat een opdracht van meerdere regels heel blijft aankomen.
      export GH_TOKEN="${GH_TOKEN:-$("$GH" auth token)}"
      local copilot_js modelarg=""
      copilot_js="${AIFLOW_COPILOT_JS:-$(npm root -g)/@github/copilot/npm-loader.js}"
      [ "$2" = "auto" ] || modelarg="--model $2"
      timeout 900 node "$copilot_js" -p "$(cat "$WERK/prompt.txt")" --no-ask-user --allow-tool=write --deny-tool=shell $modelarg > "$WERK/agent.out" 2>&1
      ;;
    codex)
      # Het Codex-programma via node, met de inlog van het ChatGPT-account. De shell staat uit (shell_tool en
      # unified_exec), dus het kan alleen bestanden bewerken, en de sandbox houdt dat binnen de kloon.
      # De opdracht gaat via stdin, zodat een opdracht van meerdere regels heel aankomt.
      local codex_js modelarg=()
      codex_js="${AIFLOW_CODEX_JS:-$(npm root -g)/@openai/codex/bin/codex.js}"
      [ "$2" = "standaard" ] || modelarg=(-m "$2")
      timeout 900 node "$codex_js" exec --ephemeral --json --color never -s workspace-write --disable shell_tool --disable unified_exec "${modelarg[@]}" -o "$WERK/laatste.txt" - < "$WERK/prompt.txt" > "$WERK/agent.out" 2>&1
      ;;
  esac
  if [ "$(git rev-parse HEAD)" != "$BASIS_HEAD" ]; then
    log "het model maakte zelf een commit; die wordt weer een losse wijziging"
    git reset -q --soft "$BASIS_HEAD"
  fi
  if [ "$1" = "hermes" ]; then
    tokens=$(python -I -X utf8 "$DIR/tokens.py" hermes "$HERMES_LOG" "$begin" "$2" 2>/dev/null)
  else
    tokens=$(python -I -X utf8 "$DIR/tokens.py" "$1" "$WERK/agent.out" 2>/dev/null)
  fi
  case "$tokens" in
    *[0-9]\ [0-9]*) TOK_IN=$(( TOK_IN + ${tokens%% *} )); TOK_UIT=$(( TOK_UIT + ${tokens#* } )) ;;
  esac
}

status_zet bezig "#$ISSUE $TITEL" 0.3 "model werkt"
# Wie het werk doet; de herstelrondes gaan naar dezelfde uitvoerder.
AAN=("$UITVOERDER" "$MODEL" "$PROVIDER")
voer_uit "${AAN[@]}"
# Reserve: heeft het model niets gewijzigd (limiet op, abonnement nog niet actief), dan neemt de volgende het over.
for res in $(reserves "$UITVOERDER"); do
  [ -z "$(git status --porcelain)" ] || break
  if [ "$res" = "hermes-reserve" ]; then
    [ -n "$FALLBACK_MODEL" ] || continue
    log "niets gewijzigd, nieuwe poging met Hermes ($FALLBACK_PROVIDER, $FALLBACK_MODEL)"
    status_zet bezig "#$ISSUE $TITEL" 0.4 "reserve-model werkt"
    MODEL="$FALLBACK_MODEL"; PROVIDER="$FALLBACK_PROVIDER (via hermes)"; UITV_GEBRUIKT="hermes"
    AAN=(hermes "$FALLBACK_MODEL" "$FALLBACK_PROVIDER")
  else
    log "niets gewijzigd, nieuwe poging met $res"
    status_zet bezig "#$ISSUE $TITEL" 0.35 "reserve werkt"
    MODEL="$(standaard_model "$res")"; PROVIDER="$(standaard_provider "$res")"; UITV_GEBRUIKT="$res"
    AAN=("$res" "$MODEL" "$PROVIDER")
  fi
  voer_uit "${AAN[@]}"
done
log "model klaar na $(( $(date +%s) - START )) s"

# 4. Controleren wat er echt is veranderd (niet wat het model zegt), met herstelrondes door het script.
# Faalt een controle, dan krijgt dezelfde uitvoerder de fout terug en mag hij het herstellen, hooguit
# AIFLOW_HERSTEL keer (standaard 2). Claude ziet alleen wat daarna door alle controles komt.
HERSTEL_MAX="${AIFLOW_HERSTEL:-2}"
HERSTELD=0
EXTRA=""
TESTS=""
cp "$WERK/prompt.txt" "$WERK/prompt-basis.txt"
while :; do
  status_zet bezig "#$ISSUE $TITEL" 0.65 "controleren"
  git add -A
  GEWIJZIGD=$(git diff --cached --name-only)
  if [ -z "$GEWIJZIGD" ]; then
    if [ -s "$WERK/laatste.txt" ]; then WOORDEN=$(tail -c 300 "$WERK/laatste.txt"); else WOORDEN=$(tail -c 300 "$WERK/agent.out"); fi
    vast "$ISSUE" "het model heeft niets gewijzigd. Laatste woorden: $(echo "$WOORDEN" | tr '\n' ' ')"
  fi
  for f in $GEWIJZIGD; do
    ok=0
    for t in $(echo "$TOEGESTAAN" | tr ',' ' '); do [ "$f" = "$t" ] && ok=1; done
    if [ "$ok" = "0" ]; then EXTRA="$EXTRA $f"; git reset -q HEAD -- "$f"; git checkout -q -- "$f" 2>/dev/null || rm -f "$f"; fi
  done
  git add -A
  GEWIJZIGD=$(git diff --cached --name-only)
  [ -n "$GEWIJZIGD" ] || vast "$ISSUE" "alleen niet-toegestane bestanden gewijzigd:$EXTRA"
  STAT=$(git diff --cached --numstat)
  git commit -q -m "$TITEL" || vast "$ISSUE" "commit mislukt"

  FOUT=""
  EXACT="niet gevraagd"
  if [ -s "$WERK/verwacht.txt" ]; then
    git diff main...HEAD --unified=0 | grep '^+' | grep -v '^+++ ' | sed 's/^+//' | tr -d '\r' | sed '/^$/d' > "$WERK/echt.txt"
    VERWIJDERD=$(git diff main...HEAD --numstat | awk '{v+=$2} END{print v+0}')
    if [ "$VERWIJDERD" = "0" ] && diff -q "$WERK/echt.txt" "$WERK/verwacht.txt" >/dev/null 2>&1; then EXACT="ja, precies zoals verwacht"; else EXACT="nee, wijkt af van het verwachte resultaat"; fi
  fi
  REGELS=$(node hermes/regels-controle.mjs --basis main --toegestaan "$TOEGESTAAN" 2>&1) || FOUT="De regelcontrole keurde de wijziging af:
$REGELS"
  if [ -z "$FOUT" ]; then
    # Tests van de projectmappen waarin de bestanden uit het issue staan (zie hermes/tests.sh).
    TESTS=$(bash hermes/tests.sh $(echo "$TOEGESTAAN" | tr ',' ' ') 2>&1) || FOUT="De tests falen:
$(echo "$TESTS" | tail -c 3000)"
  fi
  # Wijkt de wijziging af van ## Verwacht, dan is dat een herstelpunt zolang er rondes over zijn; daarna mag hij door
  # (zonder agent-exact), zodat Claude kan kijken of de afwijking klopt.
  VERWACHT_FOUT=""
  if [ -z "$FOUT" ] && [ "${EXACT%%,*}" = "nee" ]; then
    VERWACHT_FOUT="De wijziging komt niet precies overeen met ## Verwacht. Voeg precies deze regels toe en verwijder of verander niets anders:
$(cat "$WERK/verwacht.txt")
Wat je nu hebt toegevoegd:
$(cat "$WERK/echt.txt")
Aantal verwijderde regels: $VERWIJDERD (dat moet 0 zijn)."
  fi
  [ -z "$FOUT$VERWACHT_FOUT" ] && break
  if [ "$HERSTELD" -ge "$HERSTEL_MAX" ]; then
    [ -z "$FOUT" ] && break
    vast "$ISSUE" "na $HERSTELD herstelronde(s) faalt de controle nog: $(echo "$FOUT" | head -c 600 | tr '\n' ' ')"
  fi
  HERSTELD=$((HERSTELD + 1))
  log "controle faalt, herstelronde $HERSTELD van $HERSTEL_MAX door ${AAN[0]}"
  # De commit weer los maken; het model werkt verder op zijn eigen wijziging.
  git reset -q --soft "$BASIS_HEAD"
  {
    cat "$WERK/prompt-basis.txt"
    echo
    echo "HERSTELRONDE $HERSTELD VAN $HERSTEL_MAX: de controle van het script keurde je wijziging af."
    echo "Los alleen dit op, in dezelfde toegestane bestanden, en laat de rest van je wijziging staan:"
    echo "${FOUT:-$VERWACHT_FOUT}"
    echo
    echo "JE HUIDIGE WIJZIGING:"
    git diff --cached
  } > "$WERK/prompt.txt"
  status_zet bezig "#$ISSUE $TITEL" 0.5 "herstelronde $HERSTELD"
  voer_uit "${AAN[@]}"
done
TESTSTAND=$(echo "$TESTS" | grep '^\[' | tr '\n' ' ')

# 5. Pushen, PR en labels, allemaal door het script.
status_zet bezig "#$ISSUE $TITEL" 0.85 "pr openen"
git push -q -u $PUSHVLAG origin "$BRANCH" || vast "$ISSUE" "push mislukt"
DUUR=$(( $(date +%s) - START ))
{
  echo "Hoort bij #$ISSUE"
  echo
  echo "Gewijzigde bestanden (toegevoegd, verwijderd, bestand):"
  echo '```'
  echo "$STAT"
  echo '```'
  [ -n "$EXTRA" ] && echo "Teruggedraaid, want niet toegestaan:$EXTRA"
  echo
  echo "Verwacht resultaat: $EXACT"
  echo "$REGELS"
  echo "Tests: $TESTSTAND"
  echo "Herstelrondes door het script: $HERSTELD"
  echo "Tokens van het model: $TOK_IN erin, $TOK_UIT eruit"
  echo
  echo "Uitgevoerd door $MODEL via $PROVIDER in $DUUR seconden. Controles en PR zijn door het script gedaan."
} > "$WERK/pr.md"

if [ "$MODUS" = "terug" ]; then
  "$GH" pr comment "$PRNR" -R "$R" --body-file "$WERK/pr.md" >/dev/null
  "$GH" pr edit "$PRNR" -R "$R" --remove-label agent-terug >/dev/null 2>&1
  PRURL="$PRNR"
else
  PRURL=$("$GH" pr create -R "$R" --base main --head "$BRANCH" --title "$TITEL" --body-file "$WERK/pr.md") || vast "$ISSUE" "PR openen mislukt"
  case "$EXACT" in ja*) "$GH" pr edit "$PRURL" -R "$R" --add-label agent-exact >/dev/null 2>&1 ;; esac
fi
zet_labels "$ISSUE" agent-review

# 6. Automatisch mergen als er niets meer te beoordelen is: de wijziging is precies wat Claude in de taak schreef,
# geen bestand is teruggedraaid, de regelcontrole geeft geen waarschuwing en de GitHub Action is groen.
# Uitzetten met AIFLOW_AUTOMERGE=uit; dan beslist Claude over elke PR.
SAMEN="klaar #$ISSUE in $DUUR s"
if [ "${AIFLOW_AUTOMERGE:-exact}" = "exact" ] && [ "${EXACT%%,*}" = "ja" ] && [ -z "$EXTRA" ] && ! echo "$REGELS" | grep -q '^Let op:'; then
  status_zet bezig "#$ISSUE $TITEL" 0.95 "pr wacht op de Action"
  # Even wachten tot GitHub de Action heeft aangemeld, dan wachten tot hij klaar is.
  sleep "${AIFLOW_ACTION_WACHT:-20}"
  if timeout 900 "$GH" pr checks "$PRURL" -R "$R" --watch --fail-fast -i 15 >/dev/null 2>&1; then
    if "$GH" pr merge "$PRURL" -R "$R" --merge --delete-branch >/dev/null 2>&1; then
      "$GH" issue close "$ISSUE" -R "$R" --comment "Automatisch gemerged door het script: precies zoals verwacht, regelcontrole, tests en Action groen." >/dev/null 2>&1
      SAMEN="klaar en automatisch gemerged #$ISSUE in $DUUR s"
    else
      log "automatisch mergen lukte niet; de PR wacht op Claude"
    fi
  else
    log "de Action is niet groen (of meldde zich niet); de PR wacht op Claude"
  fi
fi
LAATSTE="$SAMEN"
historie "klaar"
log "$SAMEN ($MODUS)"
