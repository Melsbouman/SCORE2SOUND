#!/bin/bash
# Draait de tests van het project. Het runner-script en de GitHub Action gebruiken allebei dit script,
# zodat er maar één plek is die weet hoe de tests draaien.
#
# Gebruik:
#   bash hermes/tests.sh                  alle projectmappen
#   bash hermes/tests.sh pad1 pad2        alleen de projectmappen waar deze bestanden in staan
#
# Een projectmap is een map (tot drie niveaus diep) met:
#   - een package.json met een "test"-script: daar draait npm test (na npm ci als node_modules ontbreekt);
#   - een pyproject.toml of pytest.ini: daar draait python -m pytest.
# Per map komt er een regel "[map] ...". Exitcode 1 als een map faalt. Zijn er nog geen tests, dan is dat geen fout.
# Komt er een andere testrunner bij, voeg hem dan hier toe en nergens anders.
export PYTHONUTF8=1
cd "$(dirname "$0")/.." || exit 1
PYTHON="${PYTHON:-python}"

alle_mappen() {
  find . -maxdepth 3 \( -name node_modules -o -name .git -o -name .venv -o -name venv -o -name overdracht-workflow \) -prune -o \
    \( -name package.json -o -name pyproject.toml -o -name pytest.ini \) -print | xargs -r -n1 dirname | sed 's|^\./||' | sort -u
}

heeft_npm_test() { # $1 map
  [ -f "$1/package.json" ] && node -e "
const s=(require('./$1/package.json').scripts||{}).test||'';
process.exit(s && !/no test specified/.test(s) ? 0 : 1)" 2>/dev/null
}

toon_fout() { # $1 testrunner, $2 uitvoer
  printf '%s\n' "$2" | awk -v runner="$1" '
    function emit(regel) {
      if (aantal < 60) { print regel; aantal++ }
    }
    {
      regels[NR] = $0
      if (runner == "npm") {
        if ($0 ~ /^ℹ (tests|pass|fail|todo)( |$)/) {
          samenvatting[++aantal_samenvatting] = $0
          if ($0 ~ /^ℹ fail [1-9]/) heeft_fouten = 1
        }
        if ($0 ~ /failing tests:/) in_failing_tests = 1
        else if (in_failing_tests && $0 ~ /^[[:space:]]*✖ /) tests[++aantal_tests] = NR
      } else {
        if ($0 ~ /^FAILED / || $0 ~ /^ERROR / ||
            $0 ~ /^[0-9]+ (failed|passed|error|errors|skipped|xfailed|xpassed)(,| )/) {
          samenvatting[++aantal_samenvatting] = $0
          if ($0 ~ /(^|, )[1-9][0-9]* (failed|error|errors)(,| |$)/ ||
              $0 ~ /^(FAILED|ERROR) /) heeft_fouten = 1
        }
        if ($0 ~ /^_{3,} .* _{3,}$/) tests[++aantal_tests] = NR
      }
    }
    END {
      if (runner == "npm")
        bruikbaar = in_failing_tests && heeft_fouten && aantal_tests > 0 && aantal_samenvatting > 0
      else
        bruikbaar = heeft_fouten && aantal_tests > 0 && aantal_samenvatting > 0

      if (bruikbaar) {
        for (i = 1; i <= aantal_samenvatting; i++) emit(samenvatting[i])
        for (i = 1; i <= aantal_tests && aantal < 60; i++) {
          begin = tests[i]
          if (runner == "npm" && begin > 1 && regels[begin - 1] ~ /^[[:space:]]*test at .+:[0-9]+$/)
            emit(regels[begin - 1])
          emit(regels[begin])
          for (j = begin + 1; j <= NR && j <= begin + 6 && aantal < 60; j++) {
            if (runner == "npm" && regels[j] ~ /^[[:space:]]*✖ /) break
            if (runner == "pytest" && (regels[j] ~ /^_{3,} .* _{3,}$/ || regels[j] ~ /^=+ short test summary info =+$/)) break
            emit(regels[j])
          }
        }
      } else {
        begin = NR > 60 ? NR - 59 : 1
        for (i = begin; i <= NR; i++) emit(regels[i])
      }
    }
  '
}

MAPPEN=$(alle_mappen)
if [ $# -gt 0 ]; then
  # Per bestand de dichtstbijzijnde projectmap erboven.
  GEKOZEN=""
  for f in "$@"; do
    d=$(dirname "$f")
    while :; do
      if echo "$MAPPEN" | grep -qxF "$d"; then GEKOZEN="$GEKOZEN"$'\n'"$d"; break; fi
      [ "$d" = "." ] && break
      d=$(dirname "$d")
    done
  done
  MAPPEN=$(echo "$GEKOZEN" | sed '/^$/d' | sort -u)
fi

fout=0
gedraaid=0
for m in $MAPPEN; do
  if heeft_npm_test "$m"; then
    if [ -f "$m/package-lock.json" ] && [ ! -d "$m/node_modules" ]; then
      (cd "$m" && npm ci --silent >/dev/null 2>&1) || { echo "[$m] npm ci mislukt"; fout=1; continue; }
    fi
    # Een test die blijft hangen, mag de wachtrij niet tegenhouden.
    UIT=$(cd "$m" && timeout -k 10 "${AIFLOW_TESTTIJD:-300}" npm test 2>&1); code=$?
    if [ "$code" -ge 124 ]; then UIT="De tests bleven hangen en zijn na ${AIFLOW_TESTTIJD:-300} seconden gestopt.
$UIT"; fi
    gedraaid=1
    # De samenvattingsregel van de testrunner, als die er is (node --test, vitest, jest).
    SAMEN=$(echo "$UIT" | grep -E '^ℹ (tests|pass|fail|todo) |Tests:|Test Files|passed|failed' | tail -3 | tr -s ' \n' ' ')
    if [ "$code" -eq 0 ]; then echo "[$m] npm test geslaagd $SAMEN"; else echo "[$m] npm test faalt"; toon_fout npm "$UIT"; fout=1; fi
  elif [ -f "$m/pyproject.toml" ] || [ -f "$m/pytest.ini" ]; then
    if ! "$PYTHON" -m pytest --version >/dev/null 2>&1; then echo "[$m] pytest is niet geïnstalleerd"; fout=1; continue; fi
    UIT=$(cd "$m" && "$PYTHON" -m pytest -q 2>&1); code=$?
    # Exitcode 5 van pytest betekent: geen tests gevonden.
    if [ "$code" -eq 5 ]; then echo "[$m] nog geen pytest-tests"; continue; fi
    gedraaid=1
    SAMEN=$(echo "$UIT" | tail -1)
    if [ "$code" -eq 0 ]; then echo "[$m] pytest geslaagd $SAMEN"; else echo "[$m] pytest faalt"; toon_fout pytest "$UIT"; fout=1; fi
  fi
done
[ "$gedraaid" = "1" ] || [ "$fout" = "1" ] || echo "[tests] geen tests gevonden"
exit "$fout"
