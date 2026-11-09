# Herkenning Metingen

Deze map bevat scripts om de eigen bladmuziekherkenning (`app/src/herkenning`) automatisch te meten en te controleren. 

Let op: de bladmuziek zelf (PDF-bestanden, PGM-grijsschaalbeelden en MusicXML/MXL-bronbestanden) staat niet in het openbare repository.

## Voorbereiding: PDF en Referentie omzetten

### 1. `teken.py`
Tekent de bladzijden van een PDF-bestand als grijsbeeld (PGM en PNG, 200 dpi).
* **Gebruik:** `python -I automatisering/herkenning-meting/teken.py <pdf> <uit-voorvoegsel> [aantal bladzijden]`
* **Uitvoer:** Maakt `<uit-voorvoegsel>1.pgm`, `<uit-voorvoegsel>1.png`, enzovoort.

### 2. `referentie.py`
Haalt de noten en eigenschappen per maat uit een MusicXML-bestand (`.mxl`) als JSON-referentiebestand.
* **Gebruik:** `python -I automatisering/herkenning-meting/referentie.py <stuk.mxl> <uit.json>`
* **Uitvoer:** Een JSON-bestand met de verwachte noten en maatgegevens per maat als referentie voor metingen.

---

## Meetscripts

### 3. `pijplijn.mjs`
Interne hulpmodule (bibliotheek) die PGM-bestanden inleest en de herkenningspipeline (`herken`) en modelopbouw (`bouwModel`) aanbiedt voor de andere scripts. Dit script wordt niet direct als meetscript uitgevoerd.

### 4. `balkkoppen.mjs`
Toont per balk wat de eigen herkenning aan het begin leest (sleutel, voortekening, maatsoort) en hoeveel voortekens bij noten worden gevonden.
* **Gebruik:** `node automatisering/herkenning-meting/balkkoppen.mjs <map>/galop-p1.pgm ...`
* **Uitvoer:** Overzicht per balk van lijnafstand, aantal balken, verwerkingsduur, sleutel, voortekening, maatsoort en het aantal gevonden voortekens bij noten.

### 5. `maatduur.mjs`
Berekent het aantal maten waarvan de duur niet klopt met de maatsoort na de volledige herstelketen.
* **Gebruik:** `node automatisering/herkenning-meting/maatduur.mjs <map>/galop-p1.pgm "<map>/sand-p1.pgm+<map>/sand-p2.pgm" [--toon]`
* **Uitvoer:** Per stuk het aantal maten en het aantal foute maatduren. Met `--toon` worden ook de foute maten en hun inhoud getoond.

### 6. `devils-galop.mjs`
Meet de herkenning op Devils Galop (2nd Cornet): nootkoppen (plek), voortekens bij noten (soort en haakjes) en balkkoppen ten opzichte van de referentie.
* **Gebruik:** `node automatisering/herkenning-meting/devils-galop.mjs <map>` (met `p1.pgm`, `p2.pgm` en `ref.json` in de map).
* **Uitvoer:** Resultaten en tellers voor balkkoppen, nootkoppen en voortekens ten opzichte van de referentie.

### 7. `opbouw-devils-galop.mjs`
Meet de opbouw tot het muziekmodel op Devils Galop: vergelijkt per maat de noten en rusten van het model naast de referentie, vóór en na de herstelketen, inclusief maatduurmeldingen.
* **Gebruik:** `node automatisering/herkenning-meting/opbouw-devils-galop.mjs <map> [--toon]`
* **Uitvoer:** Vergelijking per maat van model en referentie; met `--toon` worden de verschillen per maat gedetailleerd weergegeven.

### 8. `maatsoorten.mjs`
Toont per stuk waar de maatsoort in het model verandert, en per deel hoeveel maten een maatduur-melding hebben na de herstelketen.
* **Gebruik:** `node automatisering/herkenning-meting/maatsoorten.mjs "<map>/goth-p1.pgm+<map>/goth-p2.pgm"`
* **Uitvoer:** Per stuk het aantal maten, en per deel de maatsoort, de eerste maat, het blad en het aantal foute maten.
