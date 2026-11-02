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