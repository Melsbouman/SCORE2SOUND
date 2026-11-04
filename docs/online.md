# De app online zetten op een server

1. Een server bestellen (voorstel Hetzner, het kleinste Linux-plan met Ubuntu 24.04, ongeveer 5 euro per maand; Mels bestelt en betaalt).
2. Een domeinnaam kopen en een A-record naar het IP van de server zetten.
3. Inloggen met ssh, Docker en docker compose installeren.
4. De repository klonen.
5. .env maken uit .env.example met DOMEIN en SCORE2SOUND_CODES.
6. De klankbank neerzetten in ./klankbank/standaard.sf3 (de klankbank is MuseScore_General.sf3, zie de lijst Klaar in werkpakketten/voorraad.md).
7. docker compose up -d --build.
8. Controleren in de browser dat de site met slotje opent en dat registreren met een code werkt.
9. Een back-up: wekelijks ./data kopiëren (een voorbeeld met tar in cron).
10. Updaten: git pull en docker compose up -d --build.

## Wat kost dit
ongeveer 5 euro per maand server, ongeveer 10 tot 15 euro per jaar domein.

## Bij problemen
docker compose logs app.

## Gezondheidscontrole
De container meldt zijn gezondheid via /api/gezond. Bekijk de status met `docker compose ps`.

## Back-ups maken en terugzetten
Het script `scripts/backup.sh` maakt een back-up van `./data` in `./back-ups` en bewaart alleen de laatste 8.
Het script `scripts/herstel.sh` zet een back-up terug over `./data`. Voer ze uit met:

```bash
scripts/backup.sh
```

Voor een wekelijkse back-up in cron:
```
0 2 * * 0 scripts/backup.sh
```

## Een korte demo zonder server
Verwijs naar docs/demo.md voor een demo die lokale projecten via een tijdelijke tunnel deelt.

Start met:
```bash
bash scripts/demo-online.sh
```

## Het eerste account
Het eerste account kan zich zonder uitnodigingscode registreren zolang er geen codes zijn ingesteld (SCORE2SOUND_CODES). Zet bij online gebruik altijd codes, zodat vreemden zich niet kunnen registreren.

## De startpagina en /app
De website opent op de startpagina (welkom.html) zolang je geen sessie hebt. De knop Inloggen gaat naar /app, waar de editor staat. Met een sessiecookie opent / meteen de editor. Zet de uitnodigingscodes (SCORE2SOUND_CODES) altijd aan voordat je de website openbaar maakt.