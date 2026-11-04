# SCORE2SOUND API-documentatie

De SCORE2SOUND-app biedt de volgende API-adressen voor uitbreiding en testen. Dit is een overzicht van alle endpoints met hun methoden, parameters, vereisten en responsen.

## Kort overzicht

| Endpoint | Methode | Vereist | Beschrijving |
|----------|--------|----------|-------------|
| /api/account | GET | Token | Haalt het huidige ingelogde gebruiker-object op |
| /api/account | POST | - | Registreert een nieuwe gebruiker |
| /api/account | DELETE | Token | Verwijdert het huidige account |
| /api/account/uit | POST | - | Logt de huidige gebruiker uit |
| /api/importeer | POST | - | Importeert een MusicXML-bestand of -zip |
| /api/herken | POST | - | Start bladmuziekherkenning |
| /api/herken/<id> | GET | - | Krijgt de herkenningsstatus op |
| /api/herken/<id>/blad/<nummer> | GET | - | Krijgt een pagina als PNG terug |
| /api/herken/<id> | DELETE | - | Breekt een lopende herkenning af |
| /api/projecten | GET | - | List alle projecten van de gebruiker |
| /api/projecten | POST | - | Maakt een nieuw project of opslaat een partituur |
| /api/projecten/<id> | GET | - | Krijgt een specifiek project op |
| /api/projecten/<id> | DELETE | - | Verwijdert een specifiek project |
| /api/gezond | GET | - | Health-check-endpoint |

## /api/account

**GET /api/account**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + geldig cookie-token
- Antwoord: 200 met gebruiker-object of 401 als niet ingelogd
- Fouten: 401 "Log eerst in."

**POST /api/account/registreer**
- Vereist: - (nee)
- Verstuurt: JSON {email: "...", wachtwoord: "..."}
- Antwoord: 200 met gebruiker-object en stelt een cookie in
- Fouten: 400 met onderstaande foutmeldingen

**POST /api/account/login**
- Vereist: - (nee)
- Verstuurt: JSON {email: "...", wachtwoord: "..."}
- Antwoord: 200 met gebruiker-object en stelt een cookie in
- Fouten: 400 "E-mailadres of wachtwoord klopt niet."

**POST /api/account/uit**
- Vereist: - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 {uitgelogd: true} en verwijdert cookie

**DELETE /api/account**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + geldig cookie-token
- Verstuurt: JSON {wachtwoord: "..."}
- Antwoord: 200 {verwijderd: true} en verwijdert cookie
- Fouten: 400 "Het wachtwoord klopt niet."

## /api/importeer

**POST /api/importeer**
- Vereist: - (nee)
- Verstuurt: Raw bytes (MusicXML .xml of .mxl zip)
- Antwoord: 200 met {partituur, meldingen}
- Fouten:
  - 400: "Het bestand is leeg."
  - 413: "Het bestand is te groot (maximaat 100 MB)."
  - 415: "Gecomprimeerde MusicXML (.mxl) kan de app nog niet openen."
  - 422: "De gegevens zijn geen geldige JSON." of "In dit .mxl-bestand staat geen MusicXML."

## /api/herken

**POST /api/herken**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header OR - (nee)
- Verstuurt: Raw bytes (PDF, PNG of JPG) met optionele query-parameters:
  - naam: naam voor de herkenning (string)
  - paginas: pagina-bereik zoals "1-4 7"
- Antwoord: 202 {id: herkennings-id} of 429 bij limietbereik
- Fouten:
  - 400: "Het bestand is leeg." / "Kies een PDF, PNG of JPG."
  - 400: "Schrijf de pagina's als 1-4 7."
  - 400: "Kies hooguit 40 pagina's per keer."
  - 400: "Deze PDF heeft X pagina's. Kies hooguit 60 pagina's."
  - 413: "Er loopt al een herkenning van jou."
  - 429: "Je hebt dit uur al 10 herkenningen gestart."

**GET /api/herken/<id>**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 met herkenningsstatus:
  - {id, stand, tekst, procent, ...partituur?, ...meldingen?}
- Fouten:
  - 404: "Onbekende herkenning."
  - 401: "Log eerst in." (als SCORE2SOUND_ACCOUNTS=aan)

**GET /api/herken/<id>/blad/<nummer>**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 met image/png van de pagina
- Fouten:
  - 404: "Onbekende herkenning." of "Deze pagina is er niet."

**DELETE /api/herken/<id>**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 {id: herkennings-id} of 404
- Fouten: 404 "Onbekende herkenning."

**POST /api/herken/oud** (verouderd)
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 met herkenningsstatus

## /api/projecten

**GET /api/projecten**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 met array van projecten

**POST /api/projecten**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: JSON {partituur: ...} of raw partituur-data
- Antwoord: 200 met opgeslagen project of 413 "Je opslag is vol."
- Fouten:
  - 400: "De gegevens zijn geen geldige JSON."
  - 413: "Je opslag is vol. Verwijder een project en probeer het opnieuw."

**GET /api/projecten/<id>**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 met project-object

**DELETE /api/projecten/<id>**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 {verwijderd: true}

**GET /api/projecten/<id>/blad/<nummer>**
- Vereist: SCORE2SOUND_ACCOUNTS=aan + origin-header + dezelfde gebruiker OR - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 met image/png van de pagina

## /api/gezond

**GET /api/gezond**
- Vereist: - (nee)
- Verstuurt: - (nee)
- Antwoord: 200 {ok: true}

## Algemene opmerkingen

- ID's zijn 12-karakter hex strings (bijv. "a1b2c3d4e5f6")
- Paginanotatie: "1-4 7" betekent pagina's 1, 2, 3, 4 en 7
- Alle bewerkingen behalve herkenning accepteren normaliseren JSON
- Bij SCORE2SOUND_ACCOUNTS=aan hebben alleen accountgerelateerde endpoints en CORS-verificatie nodig
- Serveronderbrekingen leveren 500 "Er ging iets mis op de server." op
- Totaal maximale uploadgrootte: 100 MB

## /api/pdf

- POST met een MusicXML-tekst als body.
- Antwoord 200: een pdf (application/pdf) met het watermerk SCORE2SOUND op elke pagina, als bijlage partituur.pdf.
- 400: lege body. 405: een andere methode dan POST. 422: de pdf kon niet worden gemaakt.
|- Bij SCORE2SOUND_ACCOUNTS=aan is een geldige sessie nodig.

## Inhoud van de pdf
De pdf bevat de notenbalken, noten, stokken en balken, een schuin watermerk SCORE2SOUND op elke pagina en geen voetregel van Verovio.

## /api/pdf met een titelblok
De body mag ook JSON zijn: { "musicxml": "...", "titelblok": { "titel": "", "componist": "", "arrangeur": "", "partij": "" } }. Dan staan de titel, de partijnaam, de componist en arr. met de arrangeur bovenaan de pdf. Een ongeldige JSON geeft 400.

## /api/herken en de herstelketen
Het resultaat van /api/herken is al door de herstelketen gegaan: maatsoort uit de inhoud, maten rust aan het begin, ontbrekende maten, verdachte noten, zangtekst-ruis, tempo uit tekst en de titel. Wat nog onzeker is, heeft zekerheid onder 0,8.
