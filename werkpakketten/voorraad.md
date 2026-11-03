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
- [ ] Speler: een keuze Metronoom en Voorinteller (geen, 1 of 2 maten) in app/public/js/speler.js die schrijfMidi met de optie klik gebruikt (app/src/midi/klik.mjs); pas maken als de klik-taak gemerged is (Claude)
- [ ] Notatie: een keuze per partij Tonen in de notatie, in app/public/js/views/mixer.js, die de optie verberg van naarMusicXML gebruikt (zet app.stand.verborgen en laat weergave.js dat doorgeven); pas maken als de verberg-taak gemerged is (Claude)
- [ ] Documentatie: docs/gebruik.md aanvullen met meerdere bestanden tegelijk openen, het klikspoor en partijen verbergen, zodra die er zijn (Claude)

## Wacht op Mels
- [ ] Branch protection op `main` aanzetten (PR verplicht, later ook de check `controle`).

## Klaar
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
