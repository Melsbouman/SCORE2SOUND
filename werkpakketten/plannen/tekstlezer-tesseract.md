# Tekstlezer met Tesseract

## Aanleiding

Bij *Galop* leest Audiveris alleen de spelwijzen `st. mute` en `open`.
Het tempo `Vivace`, de aanduiding `Marcato` en `arr. Alan Fernie` worden niet gelezen.
Daardoor ontbreken bruikbare woorden die wel duidelijk in het bladbeeld staan.

## Aanvulling op Audiveris

Een tweede OCR-lezer kan alleen de gebieden onderzoeken waar zulke tekst wordt verwacht:

- snijd uit iedere pagina de kop bij;
- snijd de strook boven elk systeem bij;
- lees die uitsneden met Tesseract en de talen `eng+nld`;
- bewaar per gevonden woord de tekst en de x-plek in de uitsnede;
- koppel het woord via die x-plek aan de maat eronder;
- voeg alleen tekst toe die Audiveris nog niet heeft gelezen.

De kop levert onder meer titel-, tempo- en arrangeurtekst op. De stroken boven de systemen
leveren tempo-, karakter- en spelwijzeaanduidingen op. De bestaande herkenning door Audiveris
blijft de bron voor noten, maten en tekst die het al wel leest.

## Keuzes

- Tesseract moet lokaal worden geïnstalleerd; het wordt geen nieuwe Node-bibliotheek.
- Gebruik de taalmodellen voor Engels en Nederlands (`eng+nld`).
- Tesseract heeft de Apache 2.0-licentie; neem de licentievermelding op bij distributie.
- Laat OCR alleen lokaal draaien en stuur bladbeelden of uitsneden niet naar een externe dienst.
- Bepaal hoe onzeker gelezen tekst wordt gemeld en wanneer een woord wordt overgenomen.

## Stappenplan

1. Installeer Tesseract lokaal en leg de vereiste versie en taalmodellen vast.
2. Maak voor één pagina een uitsnede van de kop.
3. Bepaal uit de notenbalkplekken de strook boven ieder systeem.
4. Voer Tesseract met `eng+nld` uit op elke uitsnede.
5. Bewaar tekst, zekerheid, pagina en begrenzingsvak van ieder woord.
6. Zet de x-plek van een woord om naar de maat onder dat woord.
7. Voeg nieuwe woorden toe zonder tekst van Audiveris te overschrijven.
8. Controleer op *Galop* dat `Vivace`, `Marcato` en `arr. Alan Fernie` worden gevonden.
9. Controleer dat `st. mute` en `open` niet dubbel worden toegevoegd.
10. Leg installatie, lokaal gebruik en de Apache 2.0-licentie vast in de documentatie.
