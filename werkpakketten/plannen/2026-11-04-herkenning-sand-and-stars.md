# Herkenning: Sand and Stars (Solo Cornet 3 en 4)

## Idee
Mels vergeleek de herkenning van "Sand and Stars - Solo Cornet 3&4.pdf" (11 pagina's) met het origineel en vond: de eerste maten rust ontbreken, 9/8- en 5/4-maten missen noten, voortekens en herstellingstekens ontbreken, bogen stoppen te vroeg of lopen niet over meerdere maten, er springen maten over, en veel noten klinken niet. Dit plan legt vast wat ik heb gemeten en wat eraan gedaan wordt.

## Meting (Audiveris 5, ruwe uitvoer tegenover onze import)
Ik draaide Audiveris zelf op een kopie van de PDF en liet onze lezer (`leesMusicXML`) op de ruwe MusicXML los.

| Wat | Ruwe Audiveris | Onze import | Conclusie |
|---|---|---|---|
| Maten | 327 | 327 | niets verloren in onze lezer |
| Noten | 1489 met toonhoogte | 1489 | niets verloren |
| Voortekens | 604 `<alter>` | 604 | niets verloren; Verovio leidt de tekens zelf af |
| Bogen | 207 begin / 201 eind | 204 begin | bogen komen in grote lijnen door |
| MIDI | | 1434 noot-aan voor 1489 noten | het MIDI-bestand bevat bijna alle noten; stilte zit dus niet in het bestand |
| Maatsoorten | alleen 4/4, 6/8, 7/8, 3/4, 3/8 | idem | **Audiveris mist de wisselingen naar 9/8 en 5/4** |
| Vollen | | 67 te volle maten, 54 te lege | gevolg van de verkeerde maatsoort |
| Begin | maat 1 begint bij "All, cup mute" | idem | **Audiveris slaat de 12 maten rust aan het begin over** |

De fixture `app/test/fixtures/sand-and-stars-begin.xml` bevat de eerste 30 maten van de ruwe uitvoer.

## Keuzes
- Wat Audiveris verkeerd leest, repareren we waar het kan na het lezen, met controleerbare regels (de inhoud van de maat bepaalt de maatsoort).
- De 12 maten rust aan het begin zijn alleen te herstellen uit de repetitiecijfers (in brassbandmuziek zijn repetitiecijfers maatnummers); dat volgt als apart pakket.
- Noten die niet klinken: het MIDI-bestand is bijna volledig; de oorzaak zit daarom in het afspelen (synthesizer, klankbank of de kanaaltoewijzing). Dat onderzoek doen we in de browser met de klankbank.
- Noten boven de balk die te laag worden gelezen: een eigen onderzoek (hulplijnen), buiten dit plan.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Golf |
|---|---|---|---|---|
| 1 | Maatsoort afleiden uit de inhoud (9/8, 5/4) | maatsoorten.mjs, importeer.mjs | Codex | 1 |
| 2 | Beginrust uit het eerste repetitiecijfer | maatsoorten.mjs | Codex | 2 |
| 3 | Landingspagina | welkom.html, welkom.css | Copilot | 1 |
| 4 | Landingspagina als startpagina zonder sessie | server.mjs | Codex | 1 |

## Tests
Pakket 1 heeft een test die in de taak staat. Pakket 2 krijgt een test na pakket 1.

## Open vragen
Geen.
