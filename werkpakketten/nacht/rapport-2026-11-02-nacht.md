# Nachtrapport 2 op 3 november 2026

## In het kort
- De tests op `main` slagen (398 geslaagd, 0 mislukt, 6 bewust als todo gemarkeerd).
- Een lus op de achtergrond en een uurlijkse hartslag hielden de wachtrijen gevuld; Claude schreef alleen taken, Codex, Copilot en Hermes de code.
- Gebouwd vannacht en gisteravond (de lijst met alle gemergede taken staat hieronder): fase 5 (accounts met uitnodigingscode, projecten en herkenningen per gebruiker, begrenzingen, container met Docker, back-ups, demo-script), de editor (knoppenbalk, slepen, extra bewerkfuncties, onzekere noten doorlopen, sneltoetsen), tempo per maat, regelindeling en paginabreuken van het origineel, meermaats-rusten, letters in kaders, partijnaam uit de kop en samenvoegen van gesplitste partijen, voorslagen, volta's, D.C. en D.S., rallentando en wiggen in het afspelen, octaafteken, tremolo en arpeggio, akkoordsymbolen, slagwerk (ongestemd), metronoom en voorinteller, meerdere bestanden tegelijk openen, een voorbeeld openen, zip-export van alle partijen, en veel tests en documentatie.

## Vastgelopen of nog niet af
- **#530** (instrumentenlijst met bijnamen) en **#558** (MusicXML als .mxl): de agents wijzigden niets of faalden na de herstelrondes. Zet ze terug op `agent-ready` of laat ze kleiner maken.
- **#560** (voorraadregels): de Action faalt bij de PR (#562). Het is alleen tekst; sluit de PR en maak de regels desnoods zelf.
- **#529** (partijen verbergen in de notatie) en de overige taken die nog open stonden: zie de lijst Open hieronder.
- **Hermes** werkt met het gratis model; bij de reserve (Haiku) meldt OpenRouter nog dat het tegoed op is. Controleer https://openrouter.ai/settings/credits.

## Wat jij moet doen
1. De laptop aan de lader houden en wakker, anders stopt het werk.
2. OpenRouter-tegoed controleren (zie hierboven).
3. Voor een online demo: `docs/demo.md` (tijdelijke link vanaf deze laptop) of `docs/online.md` (eigen server, ongeveer 5 euro per maand, plus een domein).
4. Het plan `werkpakketten/plannen/2026-11-02-echte-editor.md` komt uit een andere sessie en staat los van de editor die vannacht is gebouwd; kijk of dat nog nodig is.

## Automatisch rapport (uit GitHub)

## Gemerged (150)
- #242 Account verwijderen, deel 1: alleen de DELETE-tak in inloggen.mjs
- #243 Fermate in de MIDI, deel 1: de noot zelf duurt twee keer zo lang
- #247 Notatie: meldingen netjes onder elkaar met een kleur per soort
- #248 Voorraad: afgeronde punten verplaatsen naar Klaar
- #249 Pakket: scripts/start-lokaal.sh en een korte README
- #250 Herkenning: de letter in een kader lezen met een eigen vergelijking
- #251 Uploadgrens en tempo-begrenzing op registreren en inloggen
- #252 Tests: het bestand met een gemengde partituur dat alle details dekt
- #264 docs: korte beschrijving van de opbouw van de app
- #262 Pagina: een duidelijke foutpagina en melding bij een verbroken verbinding
- #263 Server leest de body van DELETE, met de test voor account verwijderen
- #265 docs: veelgestelde vragen
- #266 Project: automatisch bewaren elke twee minuten
- #267 Toetsenbord: een lijst met sneltoetsen op één plek
- #268 WAV-export: per partij en de mixer als keuze
- #273 Notatie: dezelfde regels als het origineel tekenen
- #275 Tests: de herkenning met een nepdraaier die twee pagina's en een mislukte pagina geeft
- #276 Regelindeling: onthoud welke maat een nieuwe regel begint (herkenning)
- #280 Speler: het tempo-percentage ook intypen, met het aantal bpm erbij
- #282 Regelindeling: regelbegin lezen en schrijven in MusicXML
- #285 Herkenning: één instrument dat in stukken (Voice, Voice) is gesplitst weer samenvoegen
- #289 Tests: een volledige gang met de server (met de juiste statuscodes)
- #290 Dekkingslijst: welke notatietekens kent de app wel en niet (docs/symbolen.md)
- #291 Meetlat: herkenning vergelijken met een gecorrigeerd project
- #297 Plan voor exacte reconstructie en mooiere opmaak
- #299 Mooiere opmaak: titelblok, notenlettertype en de pagina als papier
- #300 Tekst indelen in soorten en netjes plaatsen en opmaken
- #301 Demo: een script dat de app tijdelijk online zet vanaf deze laptop
- #302 Metronoom: de echte nootwaarde en het getal blijven staan
- #309 Indelingscontrole: klopt de regelindeling met het origineel
- #310 Mixer: toetsenbord en schermlezer
- #312 Begrenzing op registreren en inloggen koppelen
- #311 Origineel: pijltjestoetsen voor vorige en volgende pagina
- #313 Docker: logboek begrenzen en geheugen
- #314 Accounts: verlopen sessies opruimen
- #317 PDF-paginatelling: een losse functie met test
- #323 Versies: hernoemen en verwijderen
- #324 Tempo per maat: bewerken in de notatie, zoals op het blad
- #325 Projecten: verwijderen met bevestiging
- #328 docs: uitleg voor Mels over hoe het werk loopt en wat hij moet doen
- #327 Partijen in vaste partituurvolgorde sorteren (logica)
- #330 Kwota per gebruiker: een losse functie met test
- #335 Meer bewerkfuncties: overbinding, articulatie, fermate, noot invoeren, verwijderen
- #336 Editor: knoppenbalk met pictogrammen, toetsenbord en ongedaan maken
- #337 Editor: noten slepen in de notatie om de toonhoogte te veranderen
- #346 docs/editor.md: de editor en de sneltoetsen
- #347 Editor: knoppen voor fermate, articulatie, overbinding en verwijderen
- #348 Volta's: eerste en tweede keer lezen, bewaren, tekenen en afspelen
- #349 Onzekere noten: teller en door de rode noten lopen
- #350 Afspelen: rallentando en accelerando maken het tempo geleidelijk trager of sneller
- #351 Herkenning: een PDF met te veel pagina's zonder paginakeuze weigeren (koppeling)
- #352 Beveiliging: koppen voor https en een test
- #355 Voorraad: vervolgpunt voor de editor
- #363 Toegankelijkheid: focus, sprongkoppeling en minder beweging
- #364 Tempo midden in een maat: een tempo-event op de juiste tel
- #365 Koppelen aan het origineel: tel waarom noten niet gekoppeld worden
- #367 Server: nette fouten bij ongeldige invoer, met een test
- #366 docs/symbolen.md bijwerken met wat er nu gebouwd is
- #372 Test: willekeurige partituren heen en weer (met alle verplichte velden)
- #373 Zip schrijven: neem de werkende maakZip over uit een test
- #374 Voorslagen schrijven (deel 2)
- #383 README bijwerken met wat de app nu kan
- #384 Exporteren: alle partijen als losse MusicXML-bestanden in een zip
- #385 Kwota koppelen aan het bewaren van projecten
- #386 Partijen bewerken: een knop om in partituurvolgorde te sorteren
- #387 Begrenzing op herkenningen per gebruiker per uur
- #388 Origineel: een strook met kleine pagina's om snel te springen
- #382 Voorslagen lezen, met aanpassing van de bestaande lezen-test
- #391 Editor: ongedaan maken en opnieuw (geschiedenis)
- #397 PDF downloaden met watermerk SCORE2SOUND
- #398 Grote editor: stylesheets editor.css en print.css koppelen
- #399 Titelgegevens: titel, componist en arrangeur in model en MusicXML
- #400 Groot scherm: origineel weg en de partituur over de volle breedte
- #401 Muisselectie: noot binnen 14 px en een maat aantikken
- #411 docs/online.md bijwerken met healthcheck, back-ups en logboek
- #410 Installeerbaar maken: manifest en pictogram
- #412 Afdrukken: alleen de partituur op papier, met nette pagina-einden
- #413 D.C., D.S., segno, coda en fine: lezen, bewaren, tekenen en afspelen
- #417 Lint met tabbladen boven de partituur
- #418 Afspelen: crescendo en decrescendo laten de sterkte geleidelijk veranderen
- #419 Formulier voor titel, componist en arrangeur
- #421 docs/opbouw.md bijwerken met de nieuwe modules
- #420 Bronpositie per tekst-aanwijzing: koppel woorden aan hun plek op het origineel
- #422 Toegangslogboek zonder persoonsgegevens
- #423 Groter tekenen: de partituur vult de breedte
- #430 Lint compact: een rij, vast bovenaan
- #431 Toetsenbord: pijl links en rechts kiezen de vorige en volgende noot
- #432 Open bladmuziek inklappen als er een partituur is
- #433 Lint: partituur over de volle breedte (een kolom)
- #434 docs/editor.md: lint, selectie, titelgegevens en PDF
- #437 Sneltoetsenlijst: pijl links en rechts
- #444 Test herken-opruimen: niet te vroeg kijken (soms faalt hij)
- #445 Octaafteken 8va en 8vb: lezen, bewaren, tekenen en afspelen
- #446 Nachtelijke controle in GitHub: tests en containerbouw elke nacht
- #449 Voorraad: wat er vandaag klaar is toevoegen aan Klaar
- #450 Maatnummers controleren na meermaats-rusten en herhalingen
- #452 docs/keuzes.md: de belangrijkste keuzes in de app op een rij
- #451 Weergave: niet onnodig opnieuw tekenen en snelle wijzigingen samenvoegen
- #454 Lint, tabblad Start: afspelen en tempo in een rij
- #455 Telefoon: de partituur eerder in beeld
- #453 Afhankelijkheden controleren: een script dat npm audit samenvat
- #461 Afspelen vanaf de gekozen maat
- #462 Model: keurMaatGoed zet alle noten van een maat op zeker
- #463 Lint: het gekozen tabblad onthouden
- #464 Kop kleiner: de ondertitel weg zodra er een partituur is
- #474 docs/api.md: de API in kaart
- #473 Weergave: pagina's met dezelfde verhouding als het origineel
- #475 docs/problemen-oplossen.md voor gebruikers en beheerders
- #476 Projecten: zoeken en sorteren
- #465 Kop kleiner: de ondertitel weg zodra er een partituur is
- #481 Editor: knop Maat klopt bij een gekozen maat
- #482 Sneltoetsenlijst: Shift met pijl omhoog of omlaag
- #484 docs/editor.md: sneltoetsen voor het navigeren en het octaaf
- #483 Tijdlijn van het afspelen als gedeelde module met tests
- #485 Lint: Alt+1 tot en met Alt+5 wisselen van tabblad
- #486 Herkenningsresultaat bewaren, zodat het een herstart van de server overleeft
- #487 Tremolo, arpeggio en glissando: lezen, bewaren en tekenen
- #503 SECURITY.md: hoe beveiliging en privacy zijn geregeld
- #505 docs/testen.md: hoe de tests zijn ingedeeld
- #504 Niet gevonden door zoekmachines: robots.txt en meta
- #506 Onzekere letters rood tekenen en pedaal lezen en schrijven
- #507 Test: meerdere stemmen in een maat heen en weer
- #508 Test: prestatie bij een grote partituur
- #509 Importeren: partijnaam uit credit-words als part-name ontbreekt
- #510 Server: JSON-antwoorden ingepakt versturen
- #511 Opslag van projecten: schrijven zonder kans op een kapot bestand
- #513 Opslag van accounts: schrijven zonder kans op een kapot bestand
- #516 Editor: Escape heft de selectie op
- #517 Test: maatsoort- en toonsoortwisselingen heen en weer en in de duur
- #518 Editor: de gekozen maat tonen in de knoppenbalk
- #519 Test: transponerende instrumenten klinken goed in de MIDI
- #520 Lint: zichtbare focusrand en koppeling tab en paneel
- #502 Dependabot voor npm, Docker en Actions
- #536 Meerdere bestanden tegelijk openen en samenvoegen tot één partituur
- #537 Metronoom en voorinteller: een klikspoor in de MIDI
- #538 Voorraad: vervolgpunten voor klik, verbergen van partijen en meerdere bestanden
- #539 Slagwerk: ongestemde noten (unpitched) lezen, bewaren en schrijven
- #540 Voorraad: extra tests voor herhalingen en volta's
- #541 Test: een typische MuseScore-export met overbinding over de maatstreep en stichnoten
- #550 Tests: bij een fout de mislukte tests laten zien in plaats van de laatste 20 regels
- #549 Speler: metronoom en voorinteller kiezen
- #551 Een voorbeeld openen zonder bestand (voor een demo)
- #552 Akkoordsymbolen (Am7, C/E) lezen, bewaren en schrijven
- #553 Rapport: een script dat het ochtendrapport van de nacht maakt
- #554 docs/gebruik.md aanvullen met wat er sinds de eerste versie is bijgekomen
- #555 Server: tijdslimieten tegen trage verbindingen en een kleinere limiet voor JSON
- #561 Speler: spatiebalk voor afspelen en pauze, Home voor naar het begin
- #563 Partijen verbergen in de notatie: een optie in naarMusicXML
- #564 Zangtekst (lyrics) lezen, bewaren en schrijven
- #565 Wachtwoord wijzigen (API)

## Vastgelopen (3)
- #560 Voorraad: vervolgpunten voor wachtwoord en .mxl
- #558 MusicXML als .mxl (gecomprimeerd bestand) maken
- #530 Instrumentenlijst uitbreiden met bijnamen en afkortingen

## Open (3)
- #560 Voorraad: vervolgpunten voor wachtwoord en .mxl
- #558 MusicXML als .mxl (gecomprimeerd bestand) maken
- #530 Instrumentenlijst uitbreiden met bijnamen en afkortingen

Totaal: 150 gemerged, 3 open.
