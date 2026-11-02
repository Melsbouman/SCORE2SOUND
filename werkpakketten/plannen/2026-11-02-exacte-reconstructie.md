# Plan: exacte reconstructie en mooiere opmaak

Stand: 2 november 2026. Bron: de specificatie van Mels (hoofddoel: de nieuwe partituur lijkt op het origineel alsof dezelfde uitgever hem opnieuw drukte), plus de gids van Indiana University en het overzicht SummaryofNotation. Referentie: *Perihelion* (zonder de PDF in de repo te zetten: auteursrecht).

## Wat de specificatie vraagt en wat er is
| Onderdeel | Stand |
|---|---|
| 1. Dezelfde maten per regel | maten bewaren `regelbegin`, XML `print new-system`, Verovio met `breaks encoded` (taken #269 tot #271) |
| 1.3 Meermaats-rusten als één groep | `maatrust` en `verborgen` (#185); controleren op *Perihelion* |
| 2. Pagina-indeling | `paginabegin` is er; paginagrootte, marges en notenbalkgrootte nog niet |
| 3. Tempo: tekst, metronoom, per maat | per maat bewerken (#283); de echte nootwaarde (gepunteerde kwart) blijft nog niet behouden; midden in een maat en geleidelijk (rall.) nog niet |
| 4. Dynamiek | gelezen, geschreven en getekend; plaatsing onder de balk |
| 5. Expressie (dolce, cantabile, mute, cadenza) | tekst boven de balk; onderscheid per soort ontbreekt |
| 6. Articulatie | staccato, accent, tenuto, marcato, fermate, legato, overbinding, versieringen: er |
| 7. Ritme | balken, triolen, andere tupletten: triolen goed, kwintolen e.d. beperkt |
| 8. Letters en maatnummers | letters in kaders (A tot en met G op *Meditation*); omkaderde maatnummers als getal-kader |
| 9. Bronpositie per element | `plek` per noot; per aanwijzing nog niet |
| 10. Visuele controle | meetlat voor noten (#288); een controle op de indeling ontbreekt |

## Wat nu klaarstaat of komt (alleen taken, de agents schrijven de code)
1. **Tekstsoorten en plaatsing:** een module die tekst indeelt in tempo, expressie, spelwijze en structuur, met de plaatsing (tempo en structuur boven, expressie meestal onder, spelwijze boven) en cursief voor expressie, bold voor tempo; afkortingen blijven letterlijk (cant. wordt geen cantabile).
2. **Metronoom met de echte nootwaarde:** het model bewaart eenheid, punt en getal ("♩. = 180" blijft zo staan; het afspelen rekent om).
3. **Indelingscontrole:** vergelijkt systemen en maten per regel van de gerenderde notatie met de bron en geeft een kort verslag; naast de nauwkeurigheid van de noten een tweede score voor de opmaak.
4. **Mooiere opmaak:** een titelblok zoals de uitgevers het doen (titel gecentreerd, instrument links, componist rechts), een rustiger notenlettertype, ruimere afstanden, de pagina als papier met marges.

## Later, wanneer de metingen er zijn
Midden in de maat beginnende tempowisselingen, geleidelijke tempowijzigingen (rall. over meerdere maten), de pagina-afmetingen en marges van het origineel overnemen, en per aanwijzing de positie in het origineel.

## Regels
Een reconstructie mag nooit stilzwijgend maten verplaatsen of tekst vervangen (rit. blijft rit.). Onzekere herkenningen blijven zichtbaar voor handmatige controle.
