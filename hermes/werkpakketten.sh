#!/bin/bash
# Pakt achter elkaar alle taken op (agent-terug eerst, dan agent-ready) tot er niets meer is of een taak vastloopt.
# Handig om direct na het klaarzetten van issues te starten, zonder te wachten op de volgende ronde.
#
# Gebruik:
#   bash werkpakketten.sh --alle           elke uitvoerder (Codex, Copilot, Hermes) zijn eigen wachtrij, tegelijk
#   bash werkpakketten.sh                  een taak tegelijk, één wachtrij voor alles
#   bash werkpakketten.sh --parallel 3     tot drie taken tegelijk, alleen als ze geen bestanden delen
#
# Met --alle werkt elke uitvoerder in een eigen kloon (<kloon>-codex, -copilot, -hermes) en pakt hij alleen de
# taken met zijn label (agent-codex, agent-copilot, agent-hermes; zonder label: codex). Taken die een bestand delen
# met een lopende taak of een open PR wachten tot die klaar is. Een vastgelopen taak stopt alleen die wachtrij.
# In parallelle modus krijgt elke werker zijn eigen kloon naast de gewone kloon (<kloon>-werker-1, -2, ...).
export PYTHONUTF8=1
DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${AIFLOW_RUNNER:-$DIR/werkpakket.sh}"
GH="${GH:-/c/Program Files/GitHub CLI/gh.exe}"
R="${AIFLOW_REPO:-Melsbouman/SCORE2SOUND}"
KLOON="${AIFLOW_KLOON:-/c/Users/mels1/SCORE2SOUND-agent}"

kloon_klaar() { # $1 pad: maakt een kloon naast de gewone kloon als die er nog niet is
  [ -d "$1/.git" ] || git clone -q "$(git -C "$KLOON" remote get-url origin)" "$1" || { echo "kloon maken mislukt: $1"; return 1; }
}

if [ "${1:-}" = "--alle" ]; then
  WERK="$(mktemp -d)"
  pids=""
  for u in codex copilot hermes; do
    kloon_klaar "$KLOON-$u" || exit 1
    AIFLOW_ALLEEN="$u" AIFLOW_KLOON="$KLOON-$u" bash "$0" > "$WERK/$u.log" 2>&1 &
    pids="$pids $!:$u"
  done
  fout=0
  for pu in $pids; do
    wait "${pu%%:*}" || fout=1
    sed "s/^/[${pu#*:}] /" "$WERK/${pu#*:}.log"
  done
  exit "$fout"
fi

N=1
if [ "${1:-}" = "--parallel" ]; then N="${2:-2}"; fi

aantal=0
if [ "$N" -le 1 ]; then
  pogingen=0
  while true; do
    bash "$SCRIPT"
    code=$?
    if [ "$code" -eq 10 ]; then
      # De labelzoekfunctie van GitHub loopt een paar seconden achter: een taak die net klaar is, kan nog als
      # bezig gelden. Staan er nog taken klaar (voor deze wachtrij), wacht dan even en probeer het opnieuw (hooguit drie keer).
      over=$("$GH" issue list -R "$R" --state open --limit 100 --json labels 2>/dev/null | ALLEEN="${AIFLOW_ALLEEN:-}" STANDAARD="${AIFLOW_STANDAARD:-codex}" python -I -X utf8 -c "
import json,os,sys
alleen=os.environ['ALLEEN']; standaard=os.environ['STANDAARD']
def wie(n): return next((u for u in ('codex','copilot','hermes') if 'agent-'+u in n), standaard)
issues=[{l['name'] for l in i['labels']} for i in json.load(sys.stdin)]
print(sum(1 for n in issues if n & {'agent-ready','agent-terug'} and (not alleen or wie(n)==alleen)))" 2>/dev/null)
      if [ "${over:-0}" != "0" ] && [ "$pogingen" -lt 3 ]; then pogingen=$((pogingen + 1)); sleep 20; continue; fi
      echo "klaar: $aantal taak/taken afgerond"; exit 0
    fi
    pogingen=0
    if [ "$code" -ne 0 ]; then echo "gestopt: een taak liep vast (exitcode $code) na $aantal afgeronde taak/taken"; exit "$code"; fi
    aantal=$((aantal + 1))
  done
fi

# Parallel: kies per ronde tot N taken die elkaar niet raken.
kies() {
  "$GH" issue list -R "$R" --state open --limit 50 --json number,body,labels > "$WERK/issues.json"
  "$GH" pr list -R "$R" --state open --json body,files > "$WERK/prs.json"
  python -I -X utf8 -c "
import json,re,sys
n=int(sys.argv[1])
issues=json.load(open(sys.argv[2],encoding='utf-8'))
prs=json.load(open(sys.argv[3],encoding='utf-8'))
def bestanden(body):
    inn=False; out=[]
    for r in (body or '').splitlines():
        if r.startswith('## '): inn = r.strip()=='## Bestanden'; continue
        if inn and r.startswith('- '+chr(96)) and r.count(chr(96))>=2: out.append(r.split(chr(96))[1].split(' ')[0])
    return set(out)
def labels(i): return {l['name'] for l in i['labels']}
if any('agent-bezig' in labels(i) for i in issues): sys.exit(0)
kandidaten=[i for i in issues if labels(i) & {'agent-terug','agent-ready'}]
kandidaten.sort(key=lambda i:(0 if 'agent-terug' in labels(i) else 1, i['number']))
gekozen=[]; bezet=set()
for i in kandidaten:
    f=bestanden(i['body'])
    if not f: continue
    # Bestanden van open PR's tellen mee, behalve de PR van deze taak zelf.
    van_prs=set()
    for p in prs:
        if re.search(r'#%d([^0-9]|\$)'%i['number'], p.get('body') or ''): continue
        van_prs |= {x['path'] for x in p.get('files',[])}
    if f & bezet or f & van_prs: continue
    gekozen.append(i['number']); bezet |= f
    if len(gekozen)>=n: break
print(' '.join(str(x) for x in gekozen))
" "$N" "$WERK/issues.json" "$WERK/prs.json"
}

WERK="$(mktemp -d)"
ronde=0
while true; do
  ronde=$((ronde + 1))
  KEUZE=$(kies)
  if [ -z "$KEUZE" ]; then echo "klaar: $aantal taak/taken afgerond in $((ronde - 1)) ronde(s)"; exit 0; fi
  echo "ronde $ronde: taken $KEUZE tegelijk"
  k=0; pids=""
  for nr in $KEUZE; do
    k=$((k + 1))
    KL="${KLOON}-werker-$k"
    kloon_klaar "$KL" || exit 1
    AIFLOW_ISSUE="$nr" AIFLOW_KLOON="$KL" bash "$SCRIPT" > "$WERK/werker-$nr.log" 2>&1 &
    pids="$pids $!:$nr"
  done
  fout=0
  for pn in $pids; do
    pid="${pn%%:*}"; nr="${pn#*:}"
    wait "$pid"; code=$?
    sed "s/^/#$nr: /" "$WERK/werker-$nr.log"
    if [ "$code" -eq 0 ]; then aantal=$((aantal + 1)); else fout=1; fi
  done
  if [ "$fout" -ne 0 ]; then echo "gestopt: minstens een taak liep vast na $aantal afgeronde taak/taken"; exit 1; fi
done
