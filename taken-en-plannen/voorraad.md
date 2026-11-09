# Werkvoorraad

Hieruit maakt Claude nieuwe taken als er minder dan 6 open zijn. De oude, uitgebreide lijst staat in de git-geschiedenis.
Focus sinds 8 nov: een werkende scanner met verbeteren in de editor (`plannen/2026-11-08-scanner.md`). Onderzoek: `onderzoek/2026-11-08-open-source.md`. Laatste nachtrapport: `nacht/rapport-2026-11-08.md`.

## Wacht op een besluit van Mels
- Audiveris `development`-tak bouwen (JDK 25 + Gradle) en met de scanmeting naast 5.11 leggen: heeft reparaties voor het cijfer boven meermaatsrusten, herhalingen en hokjes 1./2. (download, 's nachts tegengehouden door de beveiliging).
- copisteria (Apache-2.0, CPU) proberen als tweede motor op dezelfde testset (download).
- PDMX (CC BY 4.0) ophalen voor echte brass-partijen als referentie (`PDMX.csv` 225 MB, MusicXML 1,9 GB).
- pdf.js als bibliotheek (nieuwe bibliotheek), of de eigen kleine pdf-lezer uitbreiden.

## Besloten door Mels (9 nov)
- Origineel naast de scan: niet terug (weinig toegevoegde waarde).
- Knop "Invoegen" bij de melding over een weggelaten meermaatsrust: gebouwd (#1819, PR #1820).
- Paletten met tekens en slepen naar een maat of noot: gebouwd (branch `claude/palet-met-tekens`).

## Fase 1 (scanmeting)
- Referentie van Mels: 2 pagina's African Symphony (MusicXML), daarna in `testset.json` met de paginanummers.
- Losse partijen maken uit PDMX-stukken: één partij, `<multiple-rest>` op reeksen lege maten, A4-pdf.
- Na elke golf `node automatisering/scanmeting.mjs` en de meetronde over `C:\Brassmuziek PDF` (stand na de nacht van 8 nov in het nachtrapport).
- musicdiff (`-o omrned`) als tweede mening op 3 paren.

## Herkenning
- Masque: de pdf is een liggende scan van twee pagina's naast elkaar (A3) in een staande A4-pagina, 90° gedraaid; Audiveris vindt dan geen notenbalken. De melding zegt het nu. Nodig: voorbewerking (pagina renderen, rechtop draaien, in tweeën knippen) vóór Audiveris.
- Cijfer boven een rustbalk op een scan (Distant Land 98: 6, Sand and Stars regel 2: 4, 2, 3, Suite Gothique blad 2: 6): de Windows-tekstherkenning leest een los cijfer niet, ook niet op een vergrote uitsnede (getest). Kandidaten: Tesseract met `--psm 10` op een uitsnede, of de eigen sjablonen voor 0-9 uit `app/src/server/kaders.mjs` op de vormen boven de rustbalk; eerst meten hoe vaak een cijfer verkeerd gelezen wordt. Bij Distant Land 98 en Sand and Stars regel 2 helpt het pas als Audiveris de rustbalk als eigen maat ziet.
- Gedrukte maatnummers aan het begin van een regel: bij een digitale pdf goed gelezen (Devils 16 van 17), bij een scan met Windows-tekstherkenning wisselend (Renaissance wel, Distant Land 1 van 16, Sand and Stars met fouten). Tekstherkenning op een uitsnede links boven elke regel proberen.
- Renaissance: 13 maten ontbreken vóór regel 106 (geen eerder gedrukt nummer gelezen); de app meldt het.
- Alleen een latere pagina scannen (paginas): een repetitiecijfer in de eerste acht maten (bijvoorbeeld 41) geeft dan een beginrust van tientallen maten. Bij een scan die niet op pagina 1 begint geen beginrust maken.
- Maat één notenwaarde te lang omdat Audiveris een achtste als kwart las (Galop 52, 77): de noot met een gat erna zo klein als na een achtste wordt een achtste. Alleen voor eenvoudige maten; Sand and Stars (zestienden, 6/8, kwintolen) heeft er tientallen.
- Galop: maat 39 en hokje 1 (40) zijn bij Audiveris één stapel (twee keer zo breed, zonder maatstreep in het midden); vanaf letter E nummert de herkenning één te laag. Het blad heeft 105 maten.
- Devils Galop: maat 69 tot 73 (rusten van 3 en 3 maten) leest Audiveris als één rust van 3; de nummermelding wijst erop.
- Distant Land: 130 van de 134 maten; een maat te veel in regel 3 en 4 (Audiveris splitst een maat), de rust van 6 maten bij 98 wordt niet gelezen.
- Meldingen met een maatnummer in de tekst ("Maat 53: ...") houden dat nummer na het invoegen van maten; de maat waar ze bij horen schuift wel mee.
- Suite Gothique: vanaf maat 57 zijn bijna alle maten in 4/4 precies een tel te kort (het lijkt 3/4, een Menuet), en in het Choral (2/4) duren maten vier tellen: de maatsoort is verkeerd gelezen. `herstelMaatsoorten` past bewust niets aan; nu komen er tientallen losse maatduur-meldingen. Voorstel: één melding "maat 57 tot 140 duren elk 3 kwarten: staat er misschien 3/4?" als vier of meer maten op rij hetzelfde afwijken.
- Tempowisselingen midden in het stuk koppelen aan maten; Galop: arrangeur, en de laatste 4 maatduur-meldingen (31, 52, 77, 97).

## Editor
- Het vaste lint met de conceptbalk neemt op 1366 x 800 bijna de helft van de hoogte; de conceptbalk kan kleiner of inklapbaar.
- Pdf-export van een partituur zet elke partij op een eigen pagina (gezien bij de scanmeting).

## Fase 2
- Browser-import (mxl, mscz), IndexedDB, statische build.

## Overig
- Taakcontrole in `automatisering/taak-check.sh` aanpassen voor verwijdertaken en nieuwe mappen.
- Donkere modus. Luistertest klankbanken (VSCO 2 CE en de huidige).

## Werkwijze
- Codex: gebruikslimiet bereikt tot dinsdag 10 nov 15:48; tot dan bouwt de Claude-uitvoerder (ook als reserve voor Codex-taken).
