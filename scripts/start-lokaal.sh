#!/usr/bin/env bash
set -eu

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' "Fout: Node.js 24 of hoger is vereist." >&2
  exit 1
fi

node_version=$(node --version)
node_major=${node_version#v}
node_major=${node_major%%.*}
case "$node_major" in
  ''|*[!0-9]*)
    printf '%s\n' "Fout: kon de Node.js-versie niet bepalen ($node_version)." >&2
    exit 1
    ;;
esac
if [ "$node_major" -lt 24 ]; then
  printf '%s\n' "Fout: Node.js 24 of hoger is vereist; gevonden: $node_version." >&2
  exit 1
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
repo_root=$(CDPATH= cd -- "$script_dir/.." && pwd)

if [ ! -f "$repo_root/app/public/klankbank/standaard.sf3" ]; then
  printf '%s\n' "Waarschuwing: app/public/klankbank/standaard.sf3 ontbreekt; afspelen werkt niet."
fi

if ! command -v audiveris >/dev/null 2>&1 \
  && ! command -v Audiveris >/dev/null 2>&1 \
  && ! command -v Audiveris.exe >/dev/null 2>&1 \
  && { [ -z "${AUDIVERIS:-}" ] || { ! command -v "$AUDIVERIS" >/dev/null 2>&1 && [ ! -e "$AUDIVERIS" ]; }; } \
  && [ ! -e '/c/Program Files/Audiveris/Audiveris.exe' ] \
  && [ ! -e 'C:/Program Files/Audiveris/Audiveris.exe' ]; then
  printf '%s\n' "Waarschuwing: Audiveris is niet gevonden; PDF- en fotoherkenning werkt niet."
fi

if [ ! -d "$repo_root/app/node_modules" ]; then
  (cd "$repo_root/app" && npm install)
fi

cd "$repo_root/app"
npm start
