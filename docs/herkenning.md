# Herkenning

De eigen herkenning van Score2Sound vertaalt bladzijden bladmuziek (als grijze afbeeldingen) naar een digitale partituur. Dit gebeurt lokaal in de browser via een Web Worker (`app/public/js/herken-worker.js`), naar het voorbeeld van de stappen van Audiveris, maar volledig zonder externe server of tekstherkenning.

## Stappen per bladzijde (`herkenPagina`)

Elke bladzijde doorloopt in `keten.mjs` een vaste volgorde van stappen:

1. **Zwart-wit omzetten (`beeld.mjs`)**: Converteert de grijze afbeelding naar zwart-wit pixels via de methode van Otsu (of een speciale papierdrempel als er geen notenbalken worden gevonden). Levert een zwart-wit bitmap op.
2. **Schaal bepalen (`schaal.mjs`)**: Bepaalt de afmeting van de notenbalklijnen en de tussenruimte. Levert de schaalmaatstaf (lijntussenruimte in pixels) op.
3. **Notenbalken vinden (`raster.mjs`)**: Zoekt de posities van de notenbalken op de bladzijde. Levert een raster van horizontale balken op.
4. **Notenbalklijnen verwijderen (`vormen.mjs`)**: Wist de horizontale balklijnen weg zodat de losse muziektekens overblijven. Levert een 'kaal' beeld zonder balklijnen op.
5. **Maten vinden (`maten.mjs`)**: Bepaalt de maatstrepen en de horizontale maatindeling op de balken. Levert de maten en strepen op.
6. **Balkkoppen lezen (`kop.mjs`)**: Leest sleutels, voortekeningen en maatsoorten aan het begin van de balken. Levert de balkkoppen op.
7. **Nootkoppen zoeken (`koppen.mjs`)**: Vindt alle nootkoppen op de balken. Levert de gevonden nootkoppen op.
8. **Duren bepalen (`duren.mjs`)**: Bepaalt de duur van de noten aan de hand van nootkoppen, stokken en vlaggen. Levert de noten met hun duur op.
9. **Hulplijnen verwijderen (`hulplijnen.mjs`)**: Wist de hulplijnen (kort boven/onder de balk) weg zodat voortekens die de hulplijn raken goed herkend kunnen worden. Levert een beeld zonder hulplijnen op.
10. **Voortekens zoeken (`voortekens.mjs`)**: Zoekt mollen, kruizen en herstellingstekens bij de noten. Levert de voortekens op.
11. **Rusten zoeken (`rusten.mjs`)**: Vindt de rusten op de balken. Levert de rusten op.
12. **Meermaatsaantallen lezen (`cijfers.mjs`)**: Leest de cijfers boven meermaatsrusten. Levert de aantallen op.
13. **Triolen lezen (`groepcijfers.mjs`)**: Leest de groepcijfers (zoals triolen) boven noten. Levert de triolen op.

## Opbouw tot model (`opbouw.mjs`) en herstelketen

Na het herkennen van de losse bladzijden bouwt `bouwUitPaginas` in `keten.mjs` de bladzijden samen tot een partituur via `bouwPartituur` in `opbouw.mjs`. Daarna volgt een herstelketen om de muziek logisch kloppend te maken:
- **`herstelHerkenning`** (`app/src/model/herstel.mjs`): Herstelt veelvoorkomende herkenningsfouten in de partituur.
- **`vulRustGaten`** (`app/src/model/rustgaten.mjs`): Vult ontbrekende rusten op waar de maatduur niet klopt.
- **`herstelTriolen`** (`app/src/model/triolenherstel.mjs`): Corrigeert de duur en verdeling binnen triolen.
- **`vulLegeMaten`** (`app/src/controle/nabewerken.mjs`): Vult lege maten op met passende rusten.
- **`controleerMaatduur`** en **`maatsoortVermoedens`** (`app/src/controle/maatduur.mjs`): Controleren of de som van de nootduren per maat klopt met de maatsoort.
- **`markeerVerdachteNoten`** en **`markeerFouteMaten`** (`app/src/model/verdacht.mjs` en `app/src/controle/nabewerken.mjs`): Markeren onzekere noten en maten voor de gebruiker.

### Onzekere maatsoort en oude meermaatsrusten
- **Maatsoort met opties** (`kop.mjs`): als twee cijfers boven elkaar niet zeker te lezen zijn (op een vage scan lijkt een 2 op een 9 en een 3 op een 5), geeft de balkkop `maatsoortOpties` mee: de maatsoorten die erop lijken, de beste eerst. Bij zeker gelezen cijfers gaan de opties ook mee, met de gelezen maatsoort vooraan.
- **`kiesMaatsoorten`** (`opbouw.mjs`): kiest na de opbouw uit de opties de maatsoort waar de meeste maten tot de volgende maatsoort precies in passen. Een zeker gelezen maatsoort wijkt alleen als er geen enkele maat in past en in een optie minstens drie en twee derde van de maten.
- **Oude meermaatsrust** (`rusten.mjs`): een gevuld blokje van de tweede lijn tot de middelste lijn is een rust van twee maten, tot de vierde lijn een rust van vier maten. Blokjes met hele rusten ernaast in één maat zijn samen één meermaatsrust met het opgetelde aantal (`aantal`); de opbouw gebruikt dat als er geen getal boven de rust gelezen is. Zo'n blokje is geen zwarte kop (`koppen.mjs`).

## Meting

De kwaliteit van de herkenning wordt gecontroleerd in `automatisering/herkenning-meting`, onder andere met `maatduur.mjs` en teststukken zoals `devils-galop.mjs`.

Per deel van een stuk (waar de maatsoort verandert) toont `maatsoorten.mjs` de gekozen maatsoort en hoeveel maten daar niet kloppen; zie de LEESMIJ in die map.
