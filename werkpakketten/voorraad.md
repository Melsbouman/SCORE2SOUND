# Werkvoorraad

Claude pakt hier werk uit als een nachtplan af is en de eindtijd nog niet bereikt is (zie `.claude/skills/nachtplan/SKILL.md`). Bovenaan staat het belangrijkste. Mels en Claude mogen allebei punten toevoegen; Claude zet bij eigen punten "(Claude)" erachter.

- [ ] Bij *Meditation* kon de app 146 van 214 noten niet aan het origineel koppelen (klikken naar het origineel werkt daar niet); uitzoeken waarom, met de echte pagina. (Claude)
- [ ] Tekst die Audiveris leest bevat OCR-fouten (teneramenre, poco agitate, .m0rend0); een woordenlijst met muziektermen (rall., dolce, poco a poco, a tempo, molto, cresc.) kan ze verbeteren. (Claude)
- [ ] Fermate: Audiveris leest hem niet overal (bij *A Time for Peace* niet, bij *Apatheia* wel); zoek hem zoals de kaders in het bladbeeld. En de speler houdt een fermate nog niet langer aan. (Claude)
- [ ] Letters zonder gelezen tekst worden aangenomen (A, B, C in volgorde, zekerheid 0,5); een echte tekstherkenning in het kader zou dat vervangen. (Claude)
- [ ] Mels' punt "deel 1: ..." voor de partij: uitzoeken wat er mist, met een voorbeeld. (Claude)
- [ ] Editor, vervolg: meerdere noten kiezen (shift of een rechthoek om te slepen) en samen verplaatsen of verwijderen; een klik op een rust om er een noot in te voeren met het toetsenbord (letters A tot en met G); maten kopiëren en plakken; een knop Maatduur herstellen die een maat vult of inkort met rusten; een suggestie bij een onzekere noot: de toonhoogte die het best bij de omringende noten of de toonsoort past (Claude)

- [ ] Editor uitbreiden: noten toevoegen op een lege plek van de balk, horizontaal verplaatsen, maten toevoegen/verwijderen, versieringen en articulaties aanklikken (na `2026-11-02-echte-editor.md`). (Claude)

## Open
- [ ] Scherm voor het wijzigen van het wachtwoord in app/public/js/views/inloggen.js, met POST /api/account/wachtwoord; pas maken als de taak voor wijzigWachtwoord gemerged is (Claude)
- [ ] Exportknop MusicXML (.mxl) in app/public/js/views/export.js met maakMxl uit app/src/musicxml/mxl.mjs; pas maken als die gemerged is (Claude)
- [ ] Extra tests voor speelVolgorde bij twee herhalingen na elkaar, een volta gevolgd door een gewone maat en een lege partij (twee pogingen faalden op een test die niet te achterhalen was; probeer één geval per taak) (Claude)
- [ ] Speler: een keuze Metronoom en Voorinteller (geen, 1 of 2 maten) in app/public/js/speler.js die schrijfMidi met de optie klik gebruikt (app/src/midi/klik.mjs); pas maken als de klik-taak gemerged is (Claude)
- [ ] Notatie: een keuze per partij Tonen in de notatie, in app/public/js/views/mixer.js, die de optie verberg van naarMusicXML gebruikt (zet app.stand.verborgen en laat weergave.js dat doorgeven); pas maken als de verberg-taak gemerged is (Claude)
- [ ] Documentatie: docs/gebruik.md aanvullen met meerdere bestanden tegelijk openen, het klikspoor en partijen verbergen, zodra die er zijn (Claude)

## Wacht op Mels
- [ ] Branch protection op `main` aanzetten (PR verplicht, later ook de check `controle`).

## Klaar
- [x] Grote editor: lint met tabbladen, partituur over de volle breedte, origineel-paneel weg, muisselectie van noten en maten, titel/componist/arrangeur aanpassen, PDF met watermerk (via afdrukken), pijlen, Shift+pijl, Escape, Alt+1 tot 5, Maat klopt, afspelen vanaf de gekozen maat (3 november 2026, zie `werkpakketten/nacht/rapport-2026-11-03.md`). (Claude)
- [ ] Telefoonlayout: de partituur begint op 375 px nog op 507 px; lint en upload compacter. (Claude)
- [ ] Dependabot-PR's (#522 tot #527) beoordelen en beslissen of Dependabot aan blijft. Wacht op Mels.
- [ ] OpenRouter-tegoed voor Hermes aanvullen. Wacht op Mels.
- [ ] `corrigeren.js` en `onzeker.js`: controleer of het keydown-doel een Element is. (Claude)
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
