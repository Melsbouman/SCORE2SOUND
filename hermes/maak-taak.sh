#!/bin/bash
# Maakt een agent-taak als GitHub-issue in het vaste sjabloon, met het label agent-ready.
#
# Gebruik:
#   bash maak-taak.sh --titel "Kort en concreet" --doel "Eén zin" \
#     --bestand pad/naar/bestand [--bestand pad2] \
#     --stap "Wat de agent doet" [--stap "..."] \
#     [--verwacht "regel die precies moet worden toegevoegd"] [--verwacht "..."] \
#     [--criterium "extra criterium"] [--niet "wat niet mag"] [--bron "verwijzing"]
#     [--voor codex|copilot|hermes]   wie de taak bouwt (label agent-codex, agent-copilot of agent-hermes);
#                  zonder --voor: codex. hermes is voor kleine achtergrondtaken, liefst met --verwacht.
#
# Met --verwacht controleert het runner-script na afloop of de wijziging precies die regels toevoegt en
# niets verwijdert. Dat maakt het nakijken van mechanische taken veel sneller.
export PYTHONUTF8=1
GH="${GH:-/c/Program Files/GitHub CLI/gh.exe}"
R="${AIFLOW_REPO:-Melsbouman/SCORE2SOUND}"
TITEL=""; DOEL=""; BRON="Gemaakt met maak-taak.sh"
VOOR=""
BESTANDEN=(); STAPPEN=(); VERWACHT=(); CRITERIA=(); NIET=()
while [ $# -gt 0 ]; do
  case "$1" in
    --titel) TITEL="$2"; shift 2 ;;
    --doel) DOEL="$2"; shift 2 ;;
    --bestand) BESTANDEN+=("$2"); shift 2 ;;
    --stap) STAPPEN+=("$2"); shift 2 ;;
    --verwacht) VERWACHT+=("$2"); shift 2 ;;
    --criterium) CRITERIA+=("$2"); shift 2 ;;
    --niet) NIET+=("$2"); shift 2 ;;
    --bron) BRON="$2"; shift 2 ;;
    --voor) VOOR="$2"; shift 2 ;;
    *) echo "onbekende optie: $1" >&2; exit 2 ;;
  esac
done
[ -n "$TITEL" ] && [ -n "$DOEL" ] && [ "${#BESTANDEN[@]}" -gt 0 ] && [ "${#STAPPEN[@]}" -gt 0 ] || { echo "titel, doel, minstens een bestand en een stap zijn verplicht" >&2; exit 2; }

BT='`'
FENCE="$BT$BT$BT"
TMP="$(mktemp)"
{
  echo "## Doel"; echo "$DOEL"; echo
  echo "## Bestanden"; echo "Alleen deze bestanden mogen veranderen:"
  for b in "${BESTANDEN[@]}"; do echo "- $BT$b$BT"; done; echo
  echo "## Wat je doet"
  n=1; for s in "${STAPPEN[@]}"; do echo "$n. $s"; n=$((n + 1)); done
  echo "$n. Verander verder niets."; echo
  if [ "${#VERWACHT[@]}" -gt 0 ]; then
    echo "## Verwacht"; echo "De wijziging voegt precies deze regels toe en verwijdert niets:"; echo "$FENCE"
    for v in "${VERWACHT[@]}"; do echo "$v"; done
    echo "$FENCE"; echo
  fi
  echo "## Acceptatiecriteria"
  if [ "${#VERWACHT[@]}" -gt 0 ]; then echo "- [ ] De toegevoegde regels komen exact overeen met het blok onder Verwacht"; fi
  echo "- [ ] Alleen de genoemde bestanden zijn gewijzigd"
  for c in "${CRITERIA[@]}"; do echo "- [ ] $c"; done
  echo "- [ ] De regelcontrole en de tests slagen"; echo
  echo "## Niet doen"
  echo "- Geen andere bestanden aanpassen en geen scripts of externe bronnen toevoegen."
  for x in "${NIET[@]}"; do echo "- $x"; done; echo
  echo "## Bron"; echo "$BRON"
} > "$TMP"
case "${VOOR:-codex}" in codex|copilot|hermes) ;; *) echo "--voor moet codex, copilot of hermes zijn" >&2; rm -f "$TMP"; exit 2 ;; esac
EXTRA=(--label "agent-${VOOR:-codex}")
"$GH" issue create -R "$R" --title "$TITEL" --body-file "$TMP" --label agent-ready "${EXTRA[@]}"
rm -f "$TMP"
