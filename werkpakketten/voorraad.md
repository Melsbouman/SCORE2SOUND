# Werkvoorraad

Claude pakt hier werk uit als een nachtplan af is en de eindtijd nog niet bereikt is (zie `.claude/skills/nachtplan/SKILL.md`). Bovenaan staat het belangrijkste. Mels en Claude mogen allebei punten toevoegen; Claude zet bij eigen punten "(Claude)" erachter.

## Wensen van Mels uit de chat van 5 tot 7 november (geordend door Claude)
Elke regel: wat Mels zei, hoe Claude het begrijpt, de stand en het issue of plan. `[x]` is klaar op `main`; `[ ]` is open. Wat onzeker is staat onder **Vragen**.

### Herkenning en muziek
- [ ] **Meermaatsrusten goed lezen.** Mels: vaak staat er in het origineel 9, 14 of 5 maten rust, soms met een ander tempo tussen de rusten; de app maakt er een maat van. Begrepen: de aantallen boven een samengestelde rust moeten worden gelezen en aan de juiste maat gekoppeld, ook midden in een stuk. Stand: beginrust uit paginatekst gedaan (`creditBeginRust`, PR 1562); koppeling van aantallen midden in het stuk ontbreekt omdat Audiveris ze als losse paginatekst bewaart zonder maatverwijzing. Volgende stap: een echte herkenning (Audiveris draait niet in de omgeving van Codex) op Galop en Sand and Stars met een kaart van x, y per maat en regel, dan koppelen. Plan: `plannen/2026-11-05-rusten-en-tempowissels.md`, rapporten in `onderzoek/`.
- [ ] **Tempowisselingen per stuk zien.** Mels: het tempo verandert vaak in een stuk, kan nooit overal hetzelfde zijn. Begrepen: metronoomgetallen en tempowoorden midden in het stuk lezen en bij de goede maat zetten. Stand: `creditTempos` en eerste tempo uit paginatekst gedaan, a tempo en rall. herstellen, tempo in de speler; koppeling van tempo's midden in het stuk aan een maat ontbreekt (zelfde reden als hierboven).
- [ ] **Betere klank.** Mels: MuseSounds is perfect. Begrepen: een veel mooier en echter geluid, zeker voor brassband. MuseSounds zelf kan niet (gesloten, betaald, alleen in MuseScore). Taak: onderzoek naar betere gratis klankbanken (CC0 of vrije licentie) per instrument en een keuze per partij; MuseScore General blijft de basis.
- [x] Instrumentnamen en muziektermen herstellen (Drums, Xylophone, BBb Bass, Tenor Trombone, Allegretto) en tempowoorden (6 nov).
- [ ] Uit de lijst van 5 november: A4 (niets mag wegvallen, ook slagwerkbalken), tweede stem, voorslagen, fermate in notatie, arrangeur/Vivace/Marcato via Windows-OCR controleren op Galop; maat 15, 31, 40 bij Galop duren 1,5 kwart; regelindeling van het origineel; reden voor niet-gekoppelde noten.

### Schermen en indeling
- [x] **Een scherm tegelijk, kop met de naam van het scherm** (Editor, Bibliotheek, Ontdekken, Instellingen, Inloggen); Partituur valt onder Editor; gewoon lettertype. Gedaan 6 nov (`kop.js`).
- [x] **Begin-scherm:** bovenste kop weg; na het kiezen opent de editor en is het begin-scherm weg; Tempo en Aantal maten weg uit Details.
- [x] **Zijbalk onder Maken:** Nieuwe partituur en Nieuwe partij. Het scherm voor Nieuwe partij bestaat nog niet (taak 1673).
- [x] **Kleuren zoals de voorpagina:** crème, effen groene zijbalk (geen verloop), zwarte speler; donker alleen op keuze in Instellingen; koppen in de stevige Bodoni-stand.
- [x] **Opslaan in Accountinstellingen** werkte niet (verkeerde route); opgelost 6 nov, met test.
- [x] **Ontdekken** (zoals de Spotify-startpagina): zoekbalk, Uitgelicht, Componisten, kaarten; opent stukken uit OpenScore Lieder (1462 stukken, CC0). Gedaan 6 nov.
- [x] **Ontdekken met afwisseling (7 nov):** catalogus van 2295 stukken in 6 soorten: Liederen (1462), Strijkkwartetten (196), Bach-koralen (410), Klassiek en barok (68), Ragtime en meer (4), Oude muziek (155); bronnen OpenScore en music21; gemaakt met `werkpakketten/bronnen/maak_catalogus.py`.
- [ ] **Ontdekken verder uitbreiden:** Mutopia (veel piano, gitaar, koper; PDF met herkenning), IMSLP (PDF), brassband en harmonie (weinig rechtenvrij), eigen herkende rechtenvrije scans; zoeken op instrument en tijdperk, favorieten. Plan: `plannen/archief/2026-11-06-editor-roadmap.md`, fase D.
- [ ] **Bibliotheek:** de kaartmenu's (Menu) vielen over elkaar; Bibliotheek moet een eigen schoon scherm zijn (taak 1666 maakt het tabblad Bestand schoon).

### Editor (zoals MuseScore)
Mels' voorbeeld: MuseScore Studio. Plannen: `plannen/archief/2026-11-06-musescore-stijl.md`, `archief/2026-11-06-editor-paletten.md`, `archief/2026-11-06-editor-roadmap.md`.
- [ ] **Lint opgeruimd:** knoppen in nette groepen met pictogram en één regel label, niets over elkaar (1665); Bestand-tabblad zonder bibliotheek (1666); tabbladen logischer: Bestand, Noten, Aanduidingen, Controleren, Partijen, Afspelen (was Start), Weergave; geen "alle maten lijken te kloppen" bij een lege partituur (1667).
- [ ] **Tempo-paneel in de annotatiebalk:** tempo kunnen zetten op elke maat, zodat het halverwege het stuk langzamer of sneller kan (1662). Wordt later een onderdeel van het paletten-paneel.
- [ ] **Paletten links met uitklapbare onderdelen** (Muzieksleutels, Toonsoorten, Maatsoorten, Tempo, Toonhoogte, Voortekens, Dynamiek, Articulaties, Tekst, Herhalingen en sprongen, Maatstrepen): lijst (1671), paneel (1668), klikken en slepen in de partituur (1675). Bron: `bronnen/paletten-glyphs.txt` (uit de .mpal-bestanden van Mels).
- [ ] **Notenbalk bovenin de editor** (duren, punt, rust, voortekens, ligatuur, triolen met uitklap: duool tot negentool, stemmen 1 tot 4): model (1670), balk (1674).
- [ ] **Nieuwe partituur: keuzescherm zoals MuseScore** (Kies instrumenten / Maak van sjabloon; Familie met genres Regulier, Alle instrumenten, Pop/Rock, Jazz, Koor, Orkest, Symfonieorkest, Muziekkorps, Brassband, Schoollokaal; Instrumenten met zoeken; Uw partituur met volgorde): model (1669), scherm (1672).
- [ ] **Nieuwe partij:** eigen scherm voor één partij (1673). Zie Vragen.
- [ ] **Editor even sterk als die van MuseScore:** roadmap fase B (selectie, stemmen, versieringen, tekst, ongedaan maken), C (weergave, mixer, klank, export), D (databanken). Na fase A een vergelijking met MuseScore op 30 handelingen.

- [ ] **Webapp die puur in de browser werkt, met een eigen domein** (geen server, geen downloads): statische hosting, importeren in de browser, Ontdekken direct bij GitHub, projecten in de browser, .mscz importeren; scan-import later apart. Plan: `plannen/archief/2026-11-07-statische-webapp.md`.
- [ ] **Herkenning: eigen meetlat en gerichte verbeteringen.** Eerst een testset (OpenScore pdf + MusicXML, Mutopia, 20 pagina's brassmuziek van Mels) en een vergelijking van Audiveris, homr en oemer; dan rustaantallen en tempogetallen uit het paginabeeld knippen en met OCR lezen (positie uit Audiveris). Eigen model trainen alleen als de meting dat rechtvaardigt.

### Vragen aan Mels (nog niet duidelijk)
1. **Nieuwe partij:** je schreef dat dit "een andere editor opent". Begrijp ik het goed als: dezelfde editor, maar met één notenbalk en de partij-opmaak (grote noten, paginanummer)? Of wil je echt een apart soort editor?
2. **Ontdekken:** is OpenScore Lieder (liederen, klassiek) genoeg als eerste bron, of wil je eerst iets voor brassband of piano? Zoeken we ook in je eigen bibliotheek?
3. **MuseScore op de server:** akkoord om later te onderzoeken of MuseScore als losse opdracht op een server kan draaien (zwaar om online te zetten)? Nu doen we het niet.
4. **Uitvoerders:** Codex is op tot 10 november 15:48, Copilot tot december; wil je Codex bijkopen, of moeten we grote schermtaken door Claude laten doen?

### Eerdere verbeteringen die al bestaan (opgeschoond 7 nov)
- [x] Scherm Wachtwoord wijzigen en Exportknop .mxl, Metronoom en Voorinteller in de speler, Partijen verbergen in de notatie, extra tests voor speelVolgorde, docs voor klikspoor en verbergen (allemaal aanwezig).

## Oudere voorraad (nog te sorteren)
- [ ] Bij *Meditation* kon de app 146 van 214 noten niet aan het origineel koppelen (klikken naar het origineel werkt daar niet); uitzoeken waarom, met de echte pagina. (Claude)
- [ ] Tekst die Audiveris leest bevat OCR-fouten (teneramenre, poco agitate, .m0rend0); een woordenlijst met muziektermen (rall., dolce, poco a poco, a tempo, molto, cresc.) kan ze verbeteren. (Claude)
- [ ] Fermate: Audiveris leest hem niet overal (bij *A Time for Peace* niet, bij *Apatheia* wel); zoek hem zoals de kaders in het bladbeeld. En de speler houdt een fermate nog niet langer aan. (Claude)
- [ ] Letters zonder gelezen tekst worden aangenomen (A, B, C in volgorde, zekerheid 0,5); een echte tekstherkenning in het kader zou dat vervangen. (Claude)
- [ ] Mels' punt "deel 1: ..." voor de partij: uitzoeken wat er mist, met een voorbeeld. (Claude)
- [ ] Editor, vervolg: meerdere noten kiezen (shift of een rechthoek om te slepen) en samen verplaatsen of verwijderen; een klik op een rust om er een noot in te voeren met het toetsenbord (letters A tot en met G); maten kopiëren en plakken; een knop Maatduur herstellen die een maat vult of inkort met rusten; een suggestie bij een onzekere noot: de toonhoogte die het best bij de omringende noten of de toonsoort past (Claude)

- [ ] Editor uitbreiden: noten toevoegen op een lege plek van de balk, horizontaal verplaatsen, maten toevoegen/verwijderen, versieringen en articulaties aanklikken (na `2026-11-02-echte-editor.md`). (Claude)
- [ ] Knoppen in de editor voor splitsen (splitsRust, splitsNoot) en Maatduur herstellen (vulMaatAan of herstelMaatduur); de toets S bestaat al. (Claude)

## Open
- [x] Scherm voor het wijzigen van het wachtwoord in app/public/js/views/inloggen.js, met POST /api/account/wachtwoord; pas maken als de taak voor wijzigWachtwoord gemerged is (Claude)
- [x] Exportknop MusicXML (.mxl) in app/public/js/views/export.js met maakMxl uit app/src/musicxml/mxl.mjs; pas maken als die gemerged is (Claude)
- [x] Extra tests voor speelVolgorde bij twee herhalingen na elkaar, een volta gevolgd door een gewone maat en een lege partij (twee pogingen faalden op een test die niet te achterhalen was; probeer één geval per taak) (Claude)
- [x] Speler: een keuze Metronoom en Voorinteller (geen, 1 of 2 maten) in app/public/js/speler.js die schrijfMidi met de optie klik gebruikt (app/src/midi/klik.mjs); pas maken als de klik-taak gemerged is (Claude)
- [x] Notatie: een keuze per partij Tonen in de notatie, in app/public/js/views/mixer.js, die de optie verberg van naarMusicXML gebruikt (zet app.stand.verborgen en laat weergave.js dat doorgeven); pas maken als de verberg-taak gemerged is (Claude)
- [x] Documentatie: docs/gebruik.md aanvullen met meerdere bestanden tegelijk openen, het klikspoor en partijen verbergen, zodra die er zijn (Claude)

## Wacht op Mels
- [ ] Branch protection op `main` aanzetten (PR verplicht, later ook de check `controle`).

## Klaar
- [x] Grote editor: lint met tabbladen, partituur over de volle breedte, origineel-paneel weg, muisselectie van noten en maten, titel/componist/arrangeur aanpassen, PDF met watermerk (via afdrukken), pijlen, Shift+pijl, Escape, Alt+1 tot 5, Maat klopt, afspelen vanaf de gekozen maat (3 november 2026, zie `werkpakketten/nacht/rapport-2026-11-03.md`). (Claude)
- [ ] Telefoonlayout: de partituur begint op 375 px nog op 507 px; lint en upload compacter. (Claude)
- [ ] Dependabot-PR's (#522 tot #527) beoordelen en beslissen of Dependabot aan blijft. Wacht op Mels.
- [ ] OpenRouter-tegoed voor Hermes aanvullen. Wacht op Mels.
- [x] `corrigeren.js` en `onzeker.js`: keydown-doel is al een Element-controle (opgelost).
- [ ] Echte server-PDF met watermerk (vraagt een nieuwe bibliotheek, dus akkoord van Mels).

- [x] Server-PDF met watermerk (/api/pdf), maten kopiëren en plakken, een toonhoogte voorstellen en zetten bij een rode noot, het eerste account zonder uitnodigingscode (3 november 2026).
- [x] Fase 4 en 5 en de editor (3 november 2026, nacht): audio-export (WAV), Verovio ingepakt, versies, tweede ronde voor vastgelopen pagina's, regelindeling en meermaats-rusten, tempo per maat, letters in kaders, partijnaam uit de kop en samenvoegen van gesplitste partijen, voorslagen, volta's, sprongen (D.C., D.S.), rallentando en wiggen in het afspelen, accounts met uitnodigingscode, projecten en herkenningen per gebruiker, container met Docker, de editor (knoppenbalk, slepen, extra bewerkfuncties), een hartslag en automatische terugloop in het script (Claude)
- [x] Notatie zoals het blad: waardestrepen, triolen, fermates en repetitieletters in kaders (2 november 2026); tweede ronde voor vastgelopen pagina's gemerged. (Claude)
- [x] Audio-export als WAV, Verovio ingepakt en onthouden in de browser, herkenningen opruimen, tweede ronde voor een vastgelopen pagina, versies bewaren, vergelijken en om en om beluisteren (2 november 2026). (Claude)
- [x] Partijen hernoemen, instrumentenlijst aangevuld, lege maten en twijfelmaten, meldingen inklapbaar, notatie zoomen en meer maten per regel, toetsenbord bij corrigeren, startscherm, opmaak, controles door het script (2 november 2026). (Claude)
- [x] Speler: meer dan 15 partijen, dynamiek, articulatie, herhalingen en maatnummers; partijen toevoegen uit een ander bestand; notatie op de telefoon groter; PDF via afdrukken (1 november 2026). (Claude)
- [x] Wachtrij gaat door na een vastgelopen taak; het script merkt ontbrekende bestanden uit de taak op (1 november 2026). (Claude)
- [x] Gecomprimeerde MusicXML (.mxl) openen en Audiveris geïnstalleerd (1 november 2026).
- [x] Klankbank MuseScore_General.sf3 gedownload met akkoord van Mels; de speler speelt af en de maten lopen mee (30 oktober 2026).
- [x] Fase 3 zonder Audiveris: instrumentenlijst, transponeren met bereikmeldingen, partijen uitnemen en samenvoegen, scherm Partijen bewerken (nacht van 29 op 30 oktober 2026). (Claude)
- [x] Projectuitleg verwerkt en fase 1 van de app gebouwd (nacht van 29 op 30 oktober 2026). (Claude)
- [x] Copilot werkt op het account van Mels; een taak met `--voor copilot` is door Copilot zelf gedaan (29 oktober 2026).
- [x] Testronde met alle drie de uitvoerders en automatisch mergen geslaagd (29 oktober 2026).
- [x] OpenRouter-sleutel in Hermes gezet (29 oktober 2026).
- [x] Plan voor fase 5 (online): hosting, accounts, opslag per gebruiker, privacy. (2 november 2026)
- [x] Fermate zal getekend en bewaard worden. (2 november 2026)
- [x] Repetitieletters. (2 november 2026)
- [x] Hermes-tegoed (opgewaardeerd). (2 november 2026)
- [x] Mels' punt deel 1. (2 november 2026)

- [x] Noteflight-editor (3 november 2026): pijlen per halve toon, letters A-G, maten kiezen en kopiëren, aanduidingenbibliotheek met vaste plaatsing, stemming en arr. in het titelblok, zoom los van de pagina, Spotify-speler, merkletters volgens de PDF.

- [ ] PDF: titelblok (partijnaam met stemming, componist, arr.) bovenaan de pagina laten tekenen; nu staat alleen de titel boven het stuk.
- [ ] Noten horizontaal verplaatsen en slepen naar een andere maat; crescendo- en decrescendohaken (wedge) uit het tabblad Aanduidingen.

- [ ] Herkenning: de credit-words van Audiveris bevatten de maatnummers aan het begin van elke regel (bij Sand and Stars 28, 34, 45, 53, 56, 59, 64, ...) en de aantallen boven samengestelde rusten (12, 4, 2, 3). Koppel ze aan de maten waar een regel begint (maat.regelbegin) en geef lege maten het juiste aantal; de volgorde en pagina van een credit staan in het MusicXML (credit page, default-x en default-y).
- [ ] Herkenning: fermate herkennen waar Audiveris hem mist, en het tempo-getal van een metronoomteken lezen als Audiveris het als losse tekst bewaart (staat nu in tempo-uit-tekst voor tekstaanwijzingen, niet voor credit-words).

- [ ] Oefenmateriaal in `C:\Brassmuziek PDF` (herkenning met `bash hermes/echte-controle.sh <pdf>`, nacht 3 op 4 november): *Suite Gothique 2nd Cornet* geeft "De bladmuziek is niet herkend": bekeken (4 november), het is een ruisachtige fotokopie met handgeschreven pijlen, cirkels en kruisjes door de balken; geen fout van de app, wel een kandidaat om te testen of een voorbewerking (contrast, ruis weghalen) de herkenning redt; *Devils Galop*: de cijfers 11, 19, 29 ... zijn echte repetitiecijfers in kaders (klopt dus, bekeken 4 november), maar de app geeft 71 niet-gekoppelde noten en twee maten van 3,5 kwart; *Renaissance* heeft 86 onzekere noten en 16 maatrusten; *Galop* en *Distant Land/Masque/African Symphony/Arban/Integrated Warm Up* nog niet bekeken. Een pagina bekijken kan pas met poppler (pdftoppm). (Claude)

- [x] Nacht 3 op 4 november 2026 (zie `werkpakketten/nacht/rapport-2026-11-04.md`): herstelketen (beginrust, verdachte noten, ontbrekende maten, zangtekst, tempo uit tekst, muziektermen, letterreeks), knop Herkenning herstellen, verplaatsen/delen/aanvullen van noten en maten, toegankelijkheid, tests en docs. (Claude)
- [ ] De editor in de browser doorlopen met een testaccount (focusrand, link naar de partituur, S, Alt + pijlen) en op 375 px. (Claude)

- [ ] Integrated Warm Up (C:\Brassmuziek PDF): pagina 3 wordt nu herkend (mvtnull gefixt, PR #1205), maar Audiveris maakt drie scores per pagina die elkaar overschrijven (taak #1206 loopt); nog uitzoeken wat er met kopjes (PART I, Chromatics, Noodle, Lip Slur) en de ringbandgaten links gebeurt op pagina 4 en 6, en of tekstpagina's (1, 2) netjes worden overgeslagen. (Claude)

- [ ] Geluid valt weg na een paar maten (Mels, 4 november 2026): offline gerenderd (`hermes/geluidscheck.mjs`, vanuit app/ draaien omdat spessasynth_core daar staat) klinken alle noten van *A Time for Peace* en *The Irish Blessing*; in de browser niet na te bootsen. Vraag Mels om het stuk en de maat; mogelijke oorzaken: AudioContext, klankbank nog aan het laden, mixer op demp/solo. Taak voor een melding bij gestopt geluid staat klaar. (Claude)

- [ ] Gedraaide scans: *Masque 2nd Cornet* (C:\Brassmuziek PDF) is een liggend A4-vel met twee pagina's naast elkaar die 90 graden gedraaid staan; Audiveris meldt "geen notenbalken". Oplossing: de pdf per pagina draaien en in tweeën knippen vóór de herkenning. Vraagt een bibliotheek om pdf's te bewerken (bijvoorbeeld pdf-lib): akkoord van Mels nodig. (Claude, 4 november 2026)
- [ ] *Distant Land* (140 noten) en *African Symphony* (75 noten) koppelen veel noten niet aan het origineel; de reden per soort (geen kop in de maat, andere toonhoogte, al gebruikt) staat al in `koppelOmr` (`redenen`) maar niet in de melding. (Claude, 4 november 2026)

## Vergelijking met het origineel (Galop, 4 november 2026)
Gedaan met `VERGELIJK_UIT=<json> bash hermes/echte-controle.sh <pdf> 1`, daarna `node hermes/maak-pdf.mjs <json> <uit.pdf>` en `python hermes/vergelijk.py <origineel.pdf> <uit.pdf> <uit.png>`. Nog niet goed:
- [ ] Letter D (en elke letter na een meermaats-rust) wordt niet getekend: hij staat op een maat die onder de samengestelde rust (6 maten) valt; de letter moet naar de eerste maat na de rust. (Claude)
- [ ] De hokjes 1. en 2. bij de herhaling vóór E ontbreken; de herhalingsstrepen staan op andere maten dan op het blad (herhaling.eind op maat 32 in plaats van de maat voor de hokjes). (Claude)
- [ ] `open` boven de maat (spelwijze) en het tempo `Vivace` uit de kop ontbreken. (Claude)
- [ ] De regelindeling van het origineel (new-system) staat op verkeerde maten (regelbegins vlak na elkaar); daarom staat `breaks: encoded` uit. Zoek uit waar `koppelOmr` de maten telt (samengestelde rust en ingevoegde maten). (Claude)
- [ ] De titelkop, componist (Shoshtakowich in plaats van Shostakovich, OCR) en arr. Alan Fernie ontbreken in de uitkomst; het colofon (copyrightregel) moet onderaan komen. (Claude)

## Onafhankelijk van Audiveris (vraag van Mels, 4 november 2026)
- [ ] Vóór er geld voor gevraagd wordt: de licentie van Audiveris (AGPL-3.0, voor zover ik weet) laten nalopen. Online draait het op onze server als los programma; gebruikers hoeven niets te downloaden. Een gedownloade of meegeleverde versie (desktop, app) vraagt dat de broncode en licentie meegegeven worden. (Mels/Claude)
- [ ] De herkenning achter één vaste koppeling zetten (een "motor" met dezelfde uitvoer), zodat een andere motor naast Audiveris kan: nu staat alles in `app/src/server/herken.mjs`, `omr.mjs` en `audiveris.mjs`. (Claude)
- [ ] Audiveris leest meer dan het exporteert: in het blad-bestand staan woorden als `open` (Direction) en de hokjes 1. en 2. met hun plek, terwijl de MusicXML ze weglaat. Meer van zulke woorden zelf uit het blad-bestand halen (plaats en maat), zoals nu bij de letters en hokjes. (Claude)
- [ ] Tekst die Audiveris mist lokaal aanvullen met Tesseract OCR; zie `werkpakketten/plannen/tekstlezer-tesseract.md`.
- [ ] Andere motoren naast Audiveris proberen en met `hermes/vergelijk.py` op onze oefenstukken vergelijken (bijvoorbeeld oemer en homr; licenties eerst nakijken). (Claude)

- [ ] Koppelen aan het origineel: per niet gekoppelde noot de reden melden (geen kop in de maat, andere toonhoogte, al gekoppeld) bij Meditation en Distant Land; eerst uitzoeken in welk bestand de koppeling (plek) wordt gemaakt, het stond niet in verdacht.mjs (nacht 4 op 5 november).
- [ ] homr-vergelijk: de uitlijning corrigeren voor meermaats-rusten (app telt ze als meerdere maten, homr als een) en daarna opnieuw meten op Galop en Renaissance.
- [ ] Herkenning: bij Distant Land en African Symphony de reden per niet gekoppelde noot melden (zoek de tekst 'konden niet aan het origineel worden gekoppeld' in hermes/echte-controle.sh).

## Nacht 4 op 5 november: overgebleven punten
- [ ] Maat 15, 31 en 40 bij Galop duren 1,5 kwart in plaats van 2 (kleine noot niet gelezen of kwart i.p.v. achtste).
- [ ] Het scherm Nieuw stuk, partijen toevoegen en noten invoeren in de browser doorlopen met een testaccount en op 375 px (Claude of Mels).
- [ ] Tesseract als tweede tekstlezer (plan: werkpakketten/plannen/tekstlezer-tesseract.md); akkoord Mels voor de installatie.

> Opmerking (7 nov): de plannen over MuseScore-stijl, paletten, roadmap en de statische webapp zijn op verzoek van Mels naar `werkpakketten/plannen/archief/` verplaatst, tot hij heeft gebrainstormd. De open issues 1660, 1662, 1665 tot en met 1668 en 1670 tot en met 1675 staan zonder label stil.
