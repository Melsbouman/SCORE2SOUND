# Onderzoek tempowisselingen

## Uitvoering en beperking

`hermes/echte-controle.sh` is uitgevoerd voor `04 - Galop 2nd Cornet.pdf` en `Sand and Stars - Solo Cornet 3&4 - Altena Brass Mels Bouman.pdf`. Beide herkenningen eindigden met `Stand: fout` en `De bladmuziek is niet herkend`. Er is daardoor geen nieuwe MusicXML- of modeluitvoer gemaakt en een volledige inventaris van alle gedrukte tempowisselingen is in deze uitvoeromgeving niet mogelijk.

Onderstaande tabellen scheiden daarom gemeten gegevens van ontbrekende gegevens. Voor *Sand and Stars* is de al bewaarde ruwe Audiveris-uitvoer `app/test/fixtures/sand-and-stars-begin.xml` gebruikt. Voor *Galop* is geen bewaarde MusicXML met tempo-informatie beschikbaar. Onbekende plaatsen of maatnummers zijn niet ingevuld alsof ze gemeten zijn.

## Galop, 2nd Cornet

| Maat | Getal of woord | Bewaring door Audiveris | Model van de app | Afwijking |
|---|---|---|---|---|
| Niet vast te stellen | Niet vast te stellen | De nieuwe herkenning leverde geen MusicXML. In de beschikbare projectgegevens staat alleen dat Audiveris bij *Galop* de spelwijzen `st. mute` en `open` leest; dat zijn geen tempowisselingen. | Er is geen nieuw model gemaakt. | Alle gedrukte tempowisselingen en hun maatnummers ontbreken in deze meting. Niet vast te stellen is of ze als `direction`, `sound tempo`, `credit-words` of tekst in een maat zouden zijn geëxporteerd. |

## Sand and Stars, Solo Cornet 3 & 4

De bewaarde fixture bevat de ruwe export van het begin en laat één tempowisseling betrouwbaar zien. De MusicXML-maat heet daar `4`, maar het repetitieteken in die maat is `16`: door de twaalf maten beginrust is dit de oorspronkelijke maat 16.

| Maat | Getal of woord | Bewaring door Audiveris | Model van de app | Afwijking |
|---|---|---|---|---|
| 16 (MusicXML-maat 4) | `Vivace risoluto (J. = 148)`, waarbij `J.` de gepunte kwart voorstelt | `direction` met `direction-type/words`, dus tekst in de maat. Geen `metronome` en geen `sound tempo`; het getal staat niet in `credit-words`. | `tempoUitTekst` herkent `J. = 148`, maakt een tempo-aanwijzing met getoonde gepunte kwart 148 en rekent dit voor het model om naar 222 kwartnoten per minuut. `Vivace risoluto` blijft als gewone tekst staan. | De maatkoppeling is twaalf maten verschoven zolang de beginrust niet is hersteld. De tempo-inhoud zelf wordt bruikbaar hersteld, maar is door Audiveris niet als structureel metronoomteken of `sound tempo` opgeslagen. |
| Overige maten | Niet vast te stellen | De nieuwe herkenning mislukte. In de bewaarde fixture staan buiten maat 16 geen `direction`-teksten met Allegro, Andante, `a tempo`, rall., rit. of een metronoomgetal en nergens een `sound tempo`. Losse numerieke `credit-words` zijn wel aanwezig, maar zijn zonder bladkoppeling niet betrouwbaar als tempo te onderscheiden van maatnummers en rustaantallen. | Er kunnen uit de beschikbare uitvoer geen verdere tempowisselingen in het model worden vastgesteld. | Eventuele latere wisselingen verdwijnen uit deze meting; maatnummer en opslagvorm zijn onbekend. |

## Wat de app nu met tempo doet

- Een MusicXML-`direction` met `metronome` wordt een tempo-aanwijzing; `sound tempo` krijgt voorrang als beide aanwezig zijn.
- Een metronoomgetal in tekst wordt herkend wanneer het de vorm `J = 120` of `J. = 120` heeft. Een gepunte eenheid wordt omgerekend naar kwartnoten per minuut.
- Een los tempowoord wordt alleen in de eerste modelmaat naar een getal omgezet. Een woord als Allegro of Andante bij een latere tempowisseling blijft dus tekst.
- `rall.`, `rit.`, `allargando`, `accel.`, `accelerando` en `stringendo` leveren alleen een tempoverloop op als Audiveris ze als tekstaanwijzing in een maat heeft gezet. `a tempo`, `tempo primo` en `tempo I` beëindigen zo'n verloop, maar zetten zelf geen exact tempo terug in de maat.
- Tempogetallen of -woorden in `credit-words` hebben geen algemene koppeling aan de dichtstbijzijnde maat. Daardoor zijn paginapositie en getal in de huidige import onvoldoende om een tempowisseling te maken.

## Voorgestelde vervolgtaken

- `hermes/echte-controle.sh`: toon of bewaar bij een mislukte herkenning de relevante Audiveris-fout, zodat duidelijk is waarom geen MusicXML is gemaakt. Test met een herkenning die vóór de export faalt en controleer dat de concrete fout in de uitvoer staat.
- `app/src/server/herken.mjs` en de verwerking van paginacredits: koppel een tempo-`credit-words` op basis van pagina, positie en regelbegin aan de juiste maat, zonder maatnummers en rustaantallen als tempo te lezen. Test met credits voor een maatnummer, een rustaantal en `J = 120`; alleen de laatste moet tempo worden.
- `app/src/model/tempotekst.mjs`: herken zelfstandige tempowoorden ook bij latere maten en behoud samengestelde teksten zoals `Vivace risoluto`. Test een eerste Allegro, een latere Andante en gewone tekst met hetzelfde woord erin.
- `app/src/model/tempoverloop.mjs`: laat `a tempo` het laatst geldende vaste tempo herstellen in plaats van alleen een verloop te begrenzen. Test `120`, daarna `rall.`, daarna `a tempo`; na `a tempo` moet opnieuw 120 gelden.
- `app/test/fixtures/` en een nieuwe tempowisselingstest: voeg na een geslaagde echte herkenning kleine, rechtenvrije uitsneden toe van de feitelijke opslagvormen `direction/words`, `metronome`, `sound tempo` en `credit-words`. Test per maat het getoonde getal, het modeltempo en het tempoverloop.
