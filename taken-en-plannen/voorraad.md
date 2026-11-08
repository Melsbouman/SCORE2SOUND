# Werkvoorraad

Hieruit maakt Claude nieuwe taken als er minder dan 6 open zijn. De oude, uitgebreide lijst staat in de git-geschiedenis.
Focus sinds 8 nov: een werkende scanner met verbeteren in de editor (`plannen/2026-11-08-scanner.md`). Onderzoek: `onderzoek/2026-11-08-open-source.md`.

## Wacht op een besluit van Mels (downloads of externe code; de beveiliging hield dit 's nachts tegen)
- Audiveris `development`-tak bouwen (JDK 25 + Gradle) en met de scanmeting naast 5.11 leggen: heeft reparaties voor het cijfer boven meermaatsrusten, herhalingen en hokjes 1./2.
- copisteria (Apache-2.0, CPU) proberen als tweede motor op dezelfde testset.
- PDMX (CC BY 4.0) ophalen voor echte brass-partijen als referentie (`PDMX.csv` 225 MB, MusicXML 1,9 GB).
- pdf.js als bibliotheek, of een eigen kleine pdf-lezer (zie hieronder).

## Fase 1 (scanmeting)
- Referentie van Mels: 2 pagina's African Symphony (MusicXML), daarna in `testset.json` met de paginanummers.
- Losse partijen maken uit PDMX-stukken: één partij, `<multiple-rest>` op reeksen lege maten, A4-pdf.
- Na elke golf `node automatisering/scanmeting.mjs` en de uitslag in de stand.
- musicdiff (`-o omrned`) als tweede mening op 3 paren.

## Herkenning
- Meermaatsrust: cijfer uit de tekstherkenning werkt op synthetisch (8 van 8 maten). Galop maat 1: Audiveris leest de eerste maat (met herhaling en *ff marc.*) als hele rust en er komt een rust van 9 maten; uitzoeken waar die 9 vandaan komt.
- `herstelHerkenning` op de server laten draaien, met de scanmeting voor en na.
- Tekens uit digitale pdf's (Devils Galop, African Symphony zijn vector): eigen lezer met Node `zlib` (lettertype, tekencode, x, y), daarna tekencodes ijken aan de Audiveris-symbolen.
- OCR op uitsneden (kop, strook boven elk systeem, vak boven een rustbalk) met een vaste woordenlijst voor tempowoorden.
- Tempowisselingen midden in het stuk koppelen aan maten; Galop: arrangeur, maat 24/40/49 (eerder 15/31/40) duren 1,5 kwart, niet-gekoppelde noten.

## Editor
- Knoppen voor de 64e en 32e noot hebben geen teken (na #1674).
- Pdf-export van een partituur zet elke partij op een eigen pagina (gezien bij de scanmeting).

## Fase 2
- Browser-import (mxl, mscz), IndexedDB, statische build.

## Overig
- Taakcontrole in `automatisering/taak-check.sh` aanpassen voor verwijdertaken en nieuwe mappen.
- Donkere modus. Luistertest klankbanken (VSCO 2 CE en de huidige).
