#!/bin/bash
# Bewaakt de drie wachtrijen, start stilgevallen wachtrijen en meldt in één regel wat aandacht vraagt.
set -u

GH="${GH:-/c/Program Files/GitHub CLI/gh.exe}"
R="${AIFLOW_REPO:-Melsbouman/SCORE2SOUND}"
STATUS="${AIFLOW_STATUS:-$HOME/.aiflow-status}"
DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$STATUS"
WERK="$(mktemp -d)"
trap 'rm -rf "$WERK"' EXIT

if ! "$GH" issue list -R "$R" --state open --limit 100 --json number,labels > "$WERK/issues.json" 2>/dev/null ||
   ! "$GH" pr list -R "$R" --state open --limit 100 --json number > "$WERK/prs.json" 2>/dev/null; then
  echo "ACTIE NODIG: GitHub kon niet worden gelezen"
  exit 0
fi

SAMENVATTING=$(ISSUES="$WERK/issues.json" python -I -X utf8 -c '
import json,os
issues=json.load(open(os.environ["ISSUES"],encoding="utf-8"))
def labels(issue): return {label["name"] for label in issue["labels"]}
open_taken=[i for i in issues if labels(i) & {"agent-ready","agent-terug","agent-bezig","agent-review","agent-vast"}]
vast=[str(i["number"]) for i in open_taken if "agent-vast" in labels(i)]
bezig=sum("agent-bezig" in labels(i) for i in open_taken)
print(len(open_taken),bezig,",".join(vast) or "-")
')
OPEN=${SAMENVATTING%% *}
REST=${SAMENVATTING#* }
BEZIG=${REST%% *}
VAST=${REST#* }

# Een rij die al lang "bezig" meldt maar niet meer draait (pc uit, venster gesloten): zet de taak terug en de status op standby.
for UITVOERDER in codex copilot hermes; do
  SF="$STATUS/$UITVOERDER.json"
  [ -f "$SF" ] || continue
  OUD=$(SF="$SF" python -I -X utf8 -c '
import json,os,time
d=json.load(open(os.environ["SF"],encoding="utf-8"))
print(int(d.get("status")=="bezig" and time.time()-d.get("start",time.time())>1800))' 2>/dev/null)
  if [ "$OUD" = "1" ] && [ "$(powershell.exe -NoProfile -Command "@(Get-CimInstance Win32_Process -Filter \"Name='bash.exe'\" | ? CommandLine -match 'werkpakketten\.sh').Count" 2>/dev/null | tr -d '')" = "0" ]; then
    for NR in $("$GH" issue list -R "$R" --state open --label "agent-$UITVOERDER" --label agent-bezig --json number --jq '.[].number'); do
      "$GH" issue edit "$NR" -R "$R" --remove-label agent-bezig --add-label agent-ready >/dev/null 2>&1
    done
    SF="$SF" python -I -X utf8 -c '
import json,os
d=json.load(open(os.environ["SF"],encoding="utf-8")); d["status"]="standby"; d["fase"]="gereset door de hartslag"
json.dump(d,open(os.environ["SF"],"w",encoding="utf-8"))'
    echo "hersteld: $UITVOERDER stond vast zonder draaiende rij"
    # taken opnieuw ophalen voor de volgende stap
    "$GH" issue list -R "$R" --state open --limit 100 --json number,labels > "$WERK/issues.json" 2>/dev/null
  fi
done

for UITVOERDER in codex copilot hermes; do
  TOESTAND=$(U="$UITVOERDER" ISSUES="$WERK/issues.json" STATUSBESTAND="$STATUS/$UITVOERDER.json" python -I -X utf8 -c '
import json,os
issues=json.load(open(os.environ["ISSUES"],encoding="utf-8"))
u=os.environ["U"]
def labels(issue): return {label["name"] for label in issue["labels"]}
van=[i for i in issues if "agent-"+u in labels(i)]
werk=any(labels(i) & {"agent-ready","agent-terug"} for i in van)
bezig=any("agent-bezig" in labels(i) for i in van)
status="standby"
try:
    status=json.load(open(os.environ["STATUSBESTAND"],encoding="utf-8")).get("status","")
except (FileNotFoundError,json.JSONDecodeError,OSError):
    pass
print("start" if werk and not bezig and status=="standby" else "wacht")
')
  if [ "$TOESTAND" = "start" ]; then
    LOG="$STATUS/$UITVOERDER.log"
    AIFLOW_ALLEEN="$UITVOERDER" AIFLOW_KLOON="/c/Users/mels1/SCORE2SOUND-agent-$UITVOERDER" \
      nohup bash "$DIR/werkpakketten.sh" > "$LOG" 2>&1 &
  fi
done

if [ "$VAST" != "-" ]; then
  echo "ACTIE NODIG: agent-vast bij #${VAST//,/, #}"
elif [ "$OPEN" -lt "${AIFLOW_MIN_TAKEN:-8}" ]; then
  echo "ACTIE NODIG: weinig taken ($OPEN open), maak er bij"
else
  REVIEW=$(bash "$DIR/review.sh" 2>&1)
  if echo "$REVIEW" | grep -Eq 'diff lezen|Action faalt'; then
    MELDING=$(echo "$REVIEW" | grep -E 'diff lezen|Action faalt' | head -n 1 | tr '\n' ' ')
    echo "ACTIE NODIG: $MELDING"
  else
    echo "OK: $OPEN open, $BEZIG bezig"
  fi
fi
