# Veelvoorkomende problemen

## Herkenning loopt vast of duurt erg lang
Kies minder pagina's of probeer een scherpe scan van 300 dpi of hoger.

## Er komt geen geluid
Zorg ervoor dat de klankbank staat in `app/public/klankbank/standaard.sf3`.

## Een pagina wordt overgeslagen
Controleer een titelblad of een pagina zonder notenbalken.

## Herkenning is niet gelukt maar de pagina's staan er wel
Probeer die pagina apart te uploaden.

## Audiveris wordt niet gevonden
Zet het pad in `AUDIVERIS`.

## Inloggen lukt niet
Controleer dat de uitnodigingscode klopt. Wachtwoord moet minstens 10 tekens zijn.

## De container start niet
Voer `docker compose logs app` uit om de foutmelding te zien.

## Ik kan niet inloggen
Is er nog geen account en zijn er geen uitnodigingscodes ingesteld, dan kun je je eerste account registreren zonder code. Heb je een tweede account nodig, dan is een uitnodigingscode verplicht. Start de server opnieuw na een wijziging.
