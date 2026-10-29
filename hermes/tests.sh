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
    UIT=$(cd "$m" && npm test 2>&1); code=$?
    gedraaid=1
    # De samenvattingsregel van de testrunner, als die er is (node --test, vitest, jest).
    SAMEN=$(echo "$UIT" | grep -E '^ℹ (tests|pass|fail) |Tests:|Test Files|passed|failed' | tail -3 | tr -s ' \n' ' ')
    if [ "$code" -eq 0 ]; then echo "[$m] npm test geslaagd $SAMEN"; else echo "[$m] npm test faalt $SAMEN"; echo "$UIT" | tail -20; fout=1; fi
  elif [ -f "$m/pyproject.toml" ] || [ -f "$m/pytest.ini" ]; then
    if ! "$PYTHON" -m pytest --version >/dev/null 2>&1; then echo "[$m] pytest is niet geïnstalleerd"; fout=1; continue; fi
    UIT=$(cd "$m" && "$PYTHON" -m pytest -q 2>&1); code=$?
    # Exitcode 5 van pytest betekent: geen tests gevonden.
    if [ "$code" -eq 5 ]; then echo "[$m] nog geen pytest-tests"; continue; fi
    gedraaid=1
    SAMEN=$(echo "$UIT" | tail -1)
    if [ "$code" -eq 0 ]; then echo "[$m] pytest geslaagd $SAMEN"; else echo "[$m] pytest faalt $SAMEN"; echo "$UIT" | tail -20; fout=1; fi
  fi
done
[ "$gedraaid" = "1" ] || [ "$fout" = "1" ] || echo "[tests] geen tests gevonden"
exit "$fout"
