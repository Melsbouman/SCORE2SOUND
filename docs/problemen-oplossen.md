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

## De PDF lukt niet
Lukt PDF downloaden niet, dan opent de browser het afdrukvenster: kies daar Opslaan als PDF. Controleer ook of je bent ingelogd en of de server draait.

## Het stuk is te groot of te klein
Houd Ctrl ingedrukt en scroll boven het stuk, of gebruik de knoppen rechtsboven in het stuk. Ctrl en 0 zet het terug op 80 procent. De app onthoudt je keuze.

## Op een telefoon
Het stuk begint op 50 procent. Knijp met twee vingers boven het stuk om in of uit te zoomen. De knoppenbalk in het lint scrolt opzij. De speler onderaan toont alleen de knoppen en de voortgangsbalk.

## De herkenning mist maten of noten
Probeer eerst Herkenning herstellen in het tabblad Noten. Wat de herkenning niet kon lezen, blijft fout; kies daarvoor een scherpere scan of foto, of geef een MusicXML-bestand op als dat er is. Maten die ontbreken tussen repetitiecijfers staan als rode rust.
