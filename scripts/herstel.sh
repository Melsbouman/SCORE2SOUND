#!/usr/bin/env bash
# Zet een back-up uit ./back-ups terug over ./data.
set -e

if [ "$#" -ne 1 ]; then
    echo "Gebruik: $0 <bestandsnaam>"
    exit 1
fi

archief="$1"
if [ ! -f "$archief" ]; then
    archief="./back-ups/$1"
fi
if [ ! -f "$archief" ]; then
    echo "Back-up niet gevonden: $1"
    exit 1
fi

read -r -p "Weet je zeker dat je deze back-up wilt terugzetten? (y/N) " bevestiging
if [ "$bevestiging" != "y" ]; then
    echo "Herstel geannuleerd."
    exit 1
fi

docker compose stop app
trap 'docker compose start app' EXIT
tar -xzf "$archief" -C .
docker compose start app
trap - EXIT
