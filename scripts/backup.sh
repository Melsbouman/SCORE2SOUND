#!/usr/bin/env bash
# Maakt een back-up van ./data in ./back-ups en bewaart de laatste 8.
set -e

mkdir -p ./back-ups

archief="./back-ups/backup-$(date +%Y-%m-%d_%H-%M-%S).tar.gz"
tar -czf "$archief" -C . data

mapfile -t oude_backups < <(find ./back-ups -maxdepth 1 -type f -name 'backup-*.tar.gz' -printf '%f\n' | sort -r | tail -n +9)
for backup in "${oude_backups[@]}"; do
    rm -- "./back-ups/$backup"
done
