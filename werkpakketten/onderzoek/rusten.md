# Onderzoek meermaatsrusten

## Uitvoering en beperking

`hermes/echte-controle.sh` is uitgevoerd voor `04 - Galop 2nd Cornet.pdf` en `Sand and Stars - Solo Cornet 3&4 - Altena Brass Mels Bouman.pdf`. Beide herkenningen eindigden met `Stand: fout` en `De bladmuziek is niet herkend`. Audiveris stopte al bij het laden van Tesseract, omdat de JavaCPP-cache in deze uitvoeromgeving niet toegankelijk was. Daardoor is geen nieuwe MusicXML- of modeluitvoer gemaakt.

Onderstaande bevindingen zijn daarom beperkt tot de al bewaarde ruwe Audiveris-uitvoer voor *Sand and Stars* (`app/test/fixtures/sand-and-stars-begin.xml`) en de eerder vastgelegde Galop-controle in `werkpakketten/voorraad.md`. Onzekere aantallen of maatkoppelingen zijn niet ingevuld alsof ze gemeten zijn.

## Galop - 2nd Cornet

| Samengestelde rust | Aantal maten | Waar Audiveris het bewaart | Model van de app | Afwijking |
|---|---:|---|---|---|
| Rust voor letter D | 6 | De bestaande controle beschrijft een meermaatsrust die in de MusicXML als zes maten meetelt; er is geen aanwijzing dat het cijfer als `credit-words` is bewaard. | `maatrust: 6`; letter D stond eerst op een maat binnen de rust en wordt door de herstelketen naar de eerste maat erna verplaatst. | Geen afwijkend rustaantal vastgelegd. Het exacte maatnummer kon zonder nieuwe MusicXML niet opnieuw worden vastgesteld. |

De bestaande modelcontrole telt voor Galop 104 maten. De eerder gemelde afwijkingen in maat 15, 31 en 40 gaan over een te korte maatduur, niet over het aantal maten van een samengestelde rust.

## Sand and Stars - Solo Cornet 3 en 4

| Samengestelde rust | Aantal maten | Waar Audiveris het bewaart | Model van de app | Afwijking |
|---|---:|---|---|---|
| Beginrust voor de eerste gespeelde maat | 12 | `<credit page="1"><credit-words ...>12</credit-words></credit>`; dus paginacredit en niet gekoppeld aan een maat. | De ruwe import begint bij de muziek na de rust en maakt geen `maatrust: 12`. | Originele maten 1 t/m 12 ontbreken; de eerste geïmporteerde maat is de oorspronkelijke maat 13. |

Op dezelfde pagina staan ook losse numerieke `credit-words` met onder meer 4, 2, 3, 6 en 5. De MusicXML bewaart daarbij wel pagina en positie (`default-x` en `default-y`), maar geen maatverwijzing. In dezelfde credits staan ook gedrukte maatnummers zoals 28, 34, 45, 53 en 56. Alleen op de tekstwaarde selecteren is daarom niet veilig: een getal kan een rustaantal, maatnummer, metronoomgetal of andere OCR-tekst zijn. Zonder de nieuwe herkenning en bladpositie kon voor deze getallen niet betrouwbaar worden vastgesteld welke samengestelde rust en welk maatnummer erbij horen.

## Waar het misgaat

- Een MusicXML-maatrust die al als maatgegeven binnenkomt, kan de app als `maatrust` bewaren en als meerdere maten laten meetellen.
- Een cijfer dat Audiveris als letter in een maat zet, kan door `stapels.mjs` worden gebruikt, maar deze route geldt niet voor paginacredits.
- Een cijfer in `credit-words` blijft paginagegevens. De import koppelt pagina en coördinaten niet aan de dichtstbijzijnde maat of regel. Daardoor verdwijnt vooral een beginrust volledig, zoals de 12 maten van *Sand and Stars*.
- Losse creditgetallen zijn ambigu. De koppeling moet positie, pagina, regelbegin en het rustteken meenemen; alleen `Number(credit-words)` gebruiken zou ook maatnummers en tempogetallen als rust lezen.

## Voorgestelde vervolgtaken

- `app/src/server/herken.mjs` en de module die creditgegevens verwerkt: koppel een numerieke credit boven een meermaatsrust op dezelfde pagina en regel aan de betreffende modelmaat. Test met MusicXML waarin `12` als `credit-words` boven de eerste rust staat; verwacht `maatrust: 12` en behoud van de volgende maat als maat 13.
- `app/src/server/herken.mjs`: onderscheid rustaantallen van gedrukte maatnummers en metronoomgetallen op basis van positie en nabijgelegen muziektekens. Test met credits `28`, `12` en `120`; alleen `12` boven het rustteken mag een maatrust worden.
- `app/src/model/beginrust.mjs`: laat een gekoppelde credit-beginrust vóór de eerste gespeelde maat invoegen zonder dubbele maten te maken wanneer de MusicXML de maten al bevat. Test zowel de ontbrekende als de reeds aanwezige reeks.
- `app/test/fixtures/`: voeg kleine, handgeschreven fixtures toe voor één rustaantal als maatrust, als letter in de maat en als `credit-words`. Test dat alle drie hetzelfde model opleveren en dat het maatnummer na de rust gelijk is.
- `hermes/echte-controle.sh`: bewaar bij een mislukte herkenning de relevante Audiveris-fout of toon hem in de uitvoer. Test met een draaier die vóór het maken van `invoer.omr` faalt, zodat een cache- of OCR-fout niet alleen `De bladmuziek is niet herkend` wordt.
