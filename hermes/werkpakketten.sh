#!/bin/bash
# Pakt achter elkaar alle taken op (agent-terug eerst, dan agent-ready) tot er niets meer is. Een vastgelopen taak
# krijgt agent-vast en de wachtrij gaat door; na drie mislukte taken achter elkaar stopt hij.
# Handig om direct na het klaarzetten van issues te starten, zonder te wachten op de volgende ronde.
#
# Gebruik:
#   bash werkpakketten.sh --alle           elke uitvoerder (Codex, Copilot, Hermes) zijn eigen wachtrij, tegelijk
#   bash werkpakketten.sh                  een taak tegelijk, één wachtrij voor alles
#   bash werkpakketten.sh --parallel 3     tot drie taken tegelijk, alleen als ze geen bestanden delen
#
# Met --alle werkt elke uitvoerder in een eigen kloon (<kloon>-codex, -copilot, -hermes) en pakt hij alleen de
# taken met zijn label (agent-codex, agent-copilot, agent-hermes; zonder label: codex). Taken die een bestand delen
# met een lopende taak of een open PR wachten tot die klaar is. Een vastgelopen taak houdt de andere wachtrijen niet op.
# In parallelle modus krijgt elke werker zijn eigen kloon naast de gewone kloon (<kloon>-werker-1, -2, ...).
export PYTHONUTF8=1
DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT="${AIFLOW_RUNNER:-$DIR/werkpakket.sh}"
GH="${GH:-/c/Program Files/GitHub CLI/gh.exe}"
R="${AIFLOW_REPO:-Melsbouman/SCORE2SOUND}"
KLOON="${AIFLOW_KLOON:-/c/Users/mels1/SCORE2SOUND-agent}"
STATUS="${AIFLOW_STATUS:-$HOME/.aiflow-status}"
mkdir -p "$STATUS"

action_opnieuw() { # $1 issue: telt mislukte Actions en zet de taak na drie pogingen vast
  local issue="$1" bestand="$STATUS/$1.pogingen" pogingen=0
  [ -f "$bestand" ] && read -r pogingen < "$bestand"
  pogingen=$((pogingen + 1))
  printf '%s\n' "$pogingen" > "$bestand"
  if [ "$pogingen" -lt 3 ]; then
    echo "Action voor #$issue faalde (poging $pogingen van 3), dezelfde taak gaat opnieuw"
    return 0
  fi
  "$GH" issue comment "$issue" -R "$R" --body "De Action bleef falen na 3 pogingen" >/dev/null 2>&1
  "$GH" issue edit "$issue" -R "$R" --add-label agent-vast --remove-label agent-terug --remove-label agent-ready --remove-label agent-bezig --remove-label agent-review >/dev/null 2>&1
  echo "#${issue} vast: De Action bleef falen na 3 pogingen"
  return 1
}

zet_vast_over() { # Zet vastgelopen taken hooguit één keer over naar een andere uitvoerder.
  local issues issue bron doel naam marker
  issues=$("$GH" issue list -R "$R" --state open --label agent-vast --limit 100 --json number,labels 2>/dev/null) || {
    echo "vastgelopen taken ophalen mislukt" >&2
    return 1
  }
  while read -r issue doel; do
    [ -n "$issue" ] || continue
    marker="$STATUS/$issue.overgezet"
    [ -e "$marker" ] && continue
    bron="$doel"
    case "$bron" in
      codex) doel=copilot; naam=Copilot ;;
      copilot) doel=codex; naam=Codex ;;
      hermes) doel=copilot; naam=Copilot ;;
      *) continue ;;
    esac
    if ! (set -o noclobber; : > "$marker") 2>/dev/null; then continue; fi
    if ! "$GH" issue edit "$issue" -R "$R" --remove-label agent-vast --remove-label "agent-$bron" --add-label "agent-$doel" --add-label agent-ready >/dev/null 2>&1; then
      rm -f "$marker"
      echo "taak #$issue overzetten naar $naam mislukt" >&2
      continue
    fi
    printf '%s\n' "$doel" > "$marker"
    if ! "$GH" issue comment "$issue" -R "$R" --body "Overgezet naar $naam na een mislukte poging." >/dev/null 2>&1; then
      echo "commentaar plaatsen bij overgezette taak #$issue mislukt" >&2
    fi
    echo "$doel"
  done <<EOF
$(printf '%s' "$issues" | python -I -X utf8 -c '
import json,sys
for issue in json.load(sys.stdin):
    labels={label["name"] for label in issue["labels"]}
    uitvoerder=next((naam for naam in ("codex","copilot","hermes") if "agent-"+naam in labels), "")
    if uitvoerder:
        print(issue["number"], uitvoerder)
')
EOF
}

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
  while true; do
    overgezet="$(zet_vast_over)" || { fout=1; break; }
    [ -n "$overgezet" ] || break
    for u in $overgezet; do
      echo "wachtrij $u opnieuw gestart voor een overgezette taak"
      AIFLOW_ALLEEN="$u" AIFLOW_KLOON="$KLOON-$u" bash "$0" || fout=1
    done
  done
  exit "$fout"
fi

N=1
if [ "${1:-}" = "--parallel" ]; then N="${2:-2}"; fi

aantal=0
if [ "$N" -le 1 ]; then
  pogingen=0
  vastgelopen=0
  achterElkaar=0
  while true; do
    ACTION_MELDING="$(mktemp)"
    AIFLOW_ACTION_MELDING="$ACTION_MELDING" bash "$SCRIPT"
    code=$?
    if [ -z "${AIFLOW_ALLEEN:-}" ]; then zet_vast_over >/dev/null || true; fi
    if [ "$code" -eq 11 ]; then
      issue=$(cat "$ACTION_MELDING")
      rm -f "$ACTION_MELDING"
      if ! action_opnieuw "$issue"; then vastgelopen=$((vastgelopen + 1)); fi
      continue
    fi
    rm -f "$ACTION_MELDING"
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
      echo "klaar: $aantal taak/taken afgerond, $vastgelopen vastgelopen"; [ "$vastgelopen" -eq 0 ]; exit $?
    fi
    pogingen=0
    if [ "$code" -ne 0 ]; then
      vastgelopen=$((vastgelopen + 1)); achterElkaar=$((achterElkaar + 1))
      echo "een taak liep vast (exitcode $code), de wachtrij gaat door"
      if [ "$achterElkaar" -ge 3 ]; then echo "gestopt: drie taken achter elkaar liepen vast, na $aantal afgeronde taak/taken"; exit "$code"; fi
      continue
    fi
    achterElkaar=0
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
    AIFLOW_ISSUE="$nr" AIFLOW_KLOON="$KL" AIFLOW_ACTION_MELDING="$WERK/action-$nr" bash "$SCRIPT" > "$WERK/werker-$nr.log" 2>&1 &
    pids="$pids $!:$nr"
  done
  fout=0
  for pn in $pids; do
    pid="${pn%%:*}"; nr="${pn#*:}"
    wait "$pid"; code=$?
    sed "s/^/#$nr: /" "$WERK/werker-$nr.log"
    if [ "$code" -eq 0 ]; then
      aantal=$((aantal + 1))
    elif [ "$code" -eq 11 ]; then
      action_opnieuw "$nr" || true
    else
      fout=1
    fi
  done
  if [ "$fout" -ne 0 ]; then echo "gestopt: minstens een taak liep vast na $aantal afgeronde taak/taken"; exit 1; fi
done
