# Plan: fase 5, SCORE2SOUND online

Stand: plan geschreven op 2 november 2026, nog niets gebouwd. Golf 1 tot en met 3 kunnen zonder Mels, golf 4 niet.

## Idee
De app draait nu alleen op de laptop van Mels. In deze fase kan iemand met een account online bladmuziek uploaden, herkennen, bewerken en bewaren, en ziet niemand anders die bestanden.

## Keuzes
- **Eén kleine server met één container.** De container bevat Node 24, Audiveris voor Linux met de taalbestanden, en de klankbank. Een reverse proxy (Caddy) zorgt voor HTTPS. De herkenning draait al één taak tegelijk, dus een kleine server kan het aan; een drukke dag betekent wachten, geen storing.
- **De container testen we in een GitHub Action.** Op de laptop staat geen Docker of WSL, en dat is ook niet nodig: een Action op Ubuntu bouwt de image, start hem en draait een echte herkenning van `app/test/voorbeelden/herkenning.png`.
- **Accounts zonder nieuwe bibliotheek.** Wachtwoorden met `scrypt` uit `node:crypto`, sessies met een willekeurig token, een cookie met `HttpOnly`, `Secure` en `SameSite=Lax`. E-mail en wachtwoord; de server verstuurt geen mail, dus een vergeten wachtwoord loopt eerst via een script op de server.
- **Registreren met een uitnodigingscode.** De herkenning kost rekentijd en er komen bestanden van anderen op de server. Zo blijft het klein tot we weten hoe het loopt.
- **Alles per gebruiker.** `data/<gebruiker>/projecten` en `data/<gebruiker>/herkenning`. `maakOpslag` neemt al een map; de herkenning krijgt een eigenaar per taak, en pagina-afbeeldingen zijn alleen voor de eigenaar.
- **Zonder accounts blijft het werken.** `npm start` draait lokaal zonder inloggen. Accounts gaan aan met `SCORE2SOUND_ACCOUNTS=aan`, zodat de tests en het werk op de laptop niet veranderen.
- **Grenzen:** hooguit 40 pagina's per herkenning, één herkenning per gebruiker in de rij, 500 MB per gebruiker, en een limiet op inlogpogingen. Verzoeken die iets veranderen, worden gecontroleerd op `Origin`.
- **Privacy:** bestanden zijn privé, de PDF verdwijnt na de herkenning (dat doet de app al), een account verwijderen haalt alles weg, geen trackers. Een korte pagina met voorwaarden: je uploadt alleen wat je mag gebruiken.

Valt buiten deze fase: samenwerken, delen met een link, betalen, mail versturen.

## Pakketten
| Golf | Pakket | Bestanden | Uitvoerder |
|---|---|---|---|
| 1 | Gebruikers en sessies: logica met tests | `src/server/accounts.mjs` | Codex |
| 1 | Container en Action die hem bouwt en een herkenning draait | `Dockerfile`, `.dockerignore`, `.github/workflows/container.yml` | Claude schrijft, Codex bouwt |
| 2 | API: registreren, inloggen, uitloggen, wie ben ik; de rest alleen ingelogd | `src/server/inloggen.mjs`, `server.mjs` | Codex |
| 2 | Projecten per gebruiker | `src/server/projecten.mjs` | Codex |
| 2 | Herkenning per gebruiker, met eigenaar en grenzen | `src/server/herken.mjs`, `src/server/opruimen.mjs` | Codex |
| 3 | Scherm inloggen en registreren, naam en uitloggen in de kop | `views/inloggen.js`, `main.js`, `index.html`, `app.css` | Copilot |
| 3 | Voorwaarden en privacy, account verwijderen | `public/voorwaarden.html`, `views/account.js` | Copilot |
| 4 | Online zetten: server, domein, HTTPS, backups, beschreven in `docs/online.md` | `docs/online.md` | Claude, met Mels |

## Tests
Accounts: wachtwoord nooit als tekst bewaard, verkeerde wachtwoorden, verlopen sessies, code verplicht. Per gebruiker: gebruiker A krijgt een 404 op elk project, elke herkenning en elke pagina van gebruiker B. Dat is de belangrijkste test van deze fase. Container: de Action bouwt de image en herkent het voorbeeld.

## Open vragen voor Mels
Golf 1 tot en met 3 lopen hier niet op vast.
1. **Server:** een kleine server kost ongeveer 5 euro per maand. Is dat goed, en bij welke aanbieder? Mijn voorstel is Hetzner. Bestellen en betalen doe jij.
2. **Domeinnaam:** ongeveer 10 tot 15 euro per jaar. Wil je er een, en welke naam?
3. **Wie mag erin:** alleen met een code van jou (mijn voorstel), of iedereen?
