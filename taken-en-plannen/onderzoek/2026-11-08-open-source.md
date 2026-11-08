# Onderzoek open source voor de scanner (8 november 2026)

Voor Mels. Doel: wat er buiten ons eigen werk bestaat om van een brasspartij (scan of digitale pdf) betrouwbare, bewerkbare muziek te maken, op een Linux-server en zonder dat klanten iets installeren. Eerdere bevindingen (`plannen/motoren-vergelijking.md`, `onderzoek/rusten.md`, `onderzoek/tempo.md`, `plannen/tekstlezer-tesseract.md`) zijn niet herhaald. Alles is op 8 november 2026 op internet nagekeken, met links onderaan. Wat ik niet kon controleren staat erbij als **(niet geverifieerd)**. Er is niets geïnstalleerd, gedownload of gecommit.

## Samenvatting: vijf aanbevelingen, gerangschikt op verwachte winst

1. **Audiveris uit de `development`-tak proberen, nog voor we zelf iets bouwen.** Na 5.11.0 (11 juli 2026) zijn er tientallen verbeteringen samengevoegd die precies onze zwakke plekken raken. Bij meermaatsrusten telt het cijfer erboven nu mee (#1009), een getal van twee cijfers wordt gelezen (#1081) en de H-balk wordt ook bij de balken van de tweede dikte gezocht (#1090). Daarnaast zijn er verbeteringen voor herhalingen (#996, #1000) en hokjes 1./2. (#1091, #1092). Het is ongewijzigde Audiveris als los programma, dus de licentieregels blijven gelijk. Weinig moeite, grote kans op winst. Eén geval is nog open: een H-balk die als balk wordt beoordeeld en dan weggegooid (#1015).
2. **Een echte testset met brasspartijen maken.** Zonder dat ziet de beslisregel (85% / 65%) geen verschil. Haal publiek-domein partijen uit PDMX (CC BY 4.0, met MusicXML én pdf), maak losse partijen met meermaatsrusten, en maak er vervuilde "gescande" versies van (scheef, ruis, 200 dpi). Eén keer echt printen en scannen is nog realistischer.
3. **copisteria als tweede motor uitproberen.** Nieuw (oktober 2026), Apache-2.0 (code en gewichten), draait op de CPU in 5 tot 15 seconden per pagina en schrijft MusicXML. De makers melden een veel lagere foutmaat dan Audiveris 5.11 en homr 0.7 (Lieder-scans: 17,7% tegen 51,8% en 42,3%). Dat zijn hun eigen cijfers op eigen testsets en het project is een maand oud. Daarom eerst meten op onze pagina's. Het cijfer boven een meermaatsrust leest het uit de tekstherkenning, dus het past goed bij punt 4.
4. **Een Linux-tekstlezer achter `leesBlad`: Tesseract 5.5.4 als basis, RapidOCR (PP-OCR-modellen, Apache-2.0) als vergelijking.** Die is sowieso nodig voor de server. Hij levert tempowoorden, partijnamen en de cijfers boven rusten. Lees alleen uitsneden (kop, strook boven elk systeem, vak boven een H-balk), vergroot ze en verbeter achteraf met een eigen woordenlijst.
5. **Digitale pdf's (Finale/Sibelius/Dorico/MuseScore) direct lezen in plaats van ze als plaatje te scannen.** Twee van de tien pdf's in `C:\Brassmuziek PDF` zijn digitaal. Daarin staan de muziektekens als lettertekens met een exacte plek, en de notenlijnen als lijnen. Het proefproject *scorn* liet zien dat het corrigeren van Audiveris met die tekens de nootnauwkeurigheid verhoogt van 70,9% naar 76,4% (152 bestanden). Een commercieel programma (PDFtoMusic Pro) haalt bijna alles. Middelgrote moeite; de lastigste stap is uitzoeken welk tekencode welk teken is (zie onderwerp 2).

Kleiner, maar het noemen waard: homr 0.7.0 opnieuw proberen, want het leest nu herhalingen, hokjes en meermaatsrusten tot 10 maten. Let wel op het licentierisico van de trainingsdata, zie onderwerp 1. Als punt 1 de meermaatsrusten niet oplost, is er een eigen vangnet: de H-balk opzoeken in het `.omr`-bestand en het cijfer erboven lezen met punt 4.

---

## 1. Scanmotoren (OMR) die als los programma op een server kunnen

| Naam | Licentie | Wat het doet / uitvoer | Actief? | Past het bij ons? | Moeite |
|---|---|---|---|---|---|
| **Audiveris 5.11.0** en `development` | AGPL-3.0 | Klassieke herkenning (Java), hele pagina's, meerdere partijen, MusicXML; tekst via ingebouwde Tesseract | Ja: 5.11.0 op 11 juli 2026, commits op `development` tot 6 nov 2026, 248 open issues | Ja, huidige motor. De development-tak lost waarschijnlijk meermaatsrusten en herhalingen deels op | Klein: zelf bouwen met `gradlew build` (Java 25) |
| **copisteria** (KobiMusic) | Apache-2.0 (code en gewichten) | Symbooldetector (270 klassen) plus kleine transformer ("evidence model"), MusicXML, JSON per symbool, HTML-viewer; tekst uit een los OCR-bestand | Ja: repo sinds ~4 okt 2026, laatste commit 29 okt 2026; 18 sterren | Mogelijk sterk: CPU, snel, gedrukt notenschrift, permissieve licentie. Eigen cijfers, nog niet onafhankelijk getoetst | Klein om te proberen (Python 3.12, PyTorch, poppler) |
| **homr 0.7.0** | AGPL-3.0 (code en gewichten) | Segmentatie (UNet, van oemer) plus transformer per notenbalk (van Polyphonic-TrOMR), MusicXML | Ja: 0.7.0 op 26 juni 2026, commits tot 5 nov 2026 | Als tweede mening. Leest nu herhalingen en hokjes, meermaatsrusten tot 10 maten; geen waardestrepen of octaaflijnen. **Licentierisico:** alle uitgebrachte gewichten zijn mede getraind op Camera-PrIMuS, waarvan de kopie op Hugging Face CC BY-NC 4.0 (niet-commercieel) is | Klein (`uvx --from 'homr[cpu]' homr <beeld>`), Docker-map aanwezig |
| oemer 0.1.8 | MIT | Segmentatie plus regels, MusicXML | Nee: laatste versie 16 nov 2024; de README verwijst zelf naar homr | Nee, viel bij ons om op de notenbalkdetectie | — |
| LEGATO (UW / AI2) | Code en gewichten MIT, maar gebouwd op Llama 3.2 11B Vision | Beeld naar ABC-notatie, omzetten naar MusicXML met MuseScore | Paper juni 2025, ICLR 2026 | **Nee.** De Llama 3.2-voorwaarden geven personen en bedrijven die in de EU gevestigd zijn géén rechten op de multimodale modellen. Verder 20 GB+ GPU-geheugen en alleen gezet notenschrift | Groot |
| Sheet Music Transformer / SMT++ (PRAIG) | MIT | Volledige pagina naar `**bekern`; gewichten voor piano (GrandStaff) en strijkkwartetten | Paper in IJCV, jan 2026 | Nee voor nu: niet getraind op losse blazerspartijen, GPU aanbevolen, uitvoer is kern in plaats van MusicXML | Groot (zelf trainen) |
| Transcoda (paper mei 2026) | Paper CC BY 4.0; code/gewichten **niet gevonden** | 59M-model, genormaliseerd `**kern` met grammatica | Nieuw | Onbekend; geen downloadlink gevonden (homr en copisteria hebben het wel gedraaid) | — |
| Polyphonic-TrOMR (NetEase) | Apache-2.0 | Transformer per notenbalk, alleen inferentie | 2023, stil | Nee; opgegaan in homr | — |
| Clarity-OMR | GPL-3.0 | YOLO voor notenbalken plus DaViT per balk, MusicXML | Maart 2026, 6 commits | Nee: alleen op piano getest, geen cijfers, GPU aanbevolen | Middel |
| U-MusT | Gewichten CC BY-NC-SA | Alleen piano | 2026 | Nee (niet-commercieel, piano) | — |
| Sheet-Music-Recognition (Luckolite) | Apache-2.0 | Eigen model, JSON/MusicXML | 2026, "experimenteel", 1 ster | Nee, geen meetcijfers | — |

**Audiveris in detail.**
- *Meermaatsrusten.* Sinds 5.8 blijft een rust zonder gelezen cijfer bewaard, met telling 1 en de melding "Multirest with no measure count, using default value 1". Dat zie je in onze nulmeting: de rust van 3 maten kwam als één maat terug. Issue #1007 beschrijft de oorzaak: het cijfer wordt wel gevonden, maar weggegooid omdat het geen steun krijgt van de rust. PR #1009 (22 sep 2026) lost dat op. PR #1081 en #1083 (2 okt) lezen getallen van meer cijfers en houden het cijfer gekoppeld. PR #1090 (2 okt) zoekt de H-balk ook tussen "kleine balken". Nog open is #1015: een H-balk die als balk wordt beoordeeld en net onder de drempel uitkomt (0,498 tegen 0,5). Dat lijkt erg op ons geval "H-balk wordt BEAM".
- *Overige winst op development* (allemaal na 5.11.0): herhalingen herkend aan de punten (#996), herhalingsaantallen als "x2" (#1000), hokjes over een balk heen (#1091), een 6 en een 3 bij tuplets uit elkaar houden (#1104). Ook kan de glyph-classificatie nu zonder scherm trainen (#1054), en een trainingsronde kan met een vaste seed worden herhaald (#1126). Daarmee kun je Audiveris later op de server bijtrainen met voorbeelden uit brasspartijen. Een recente commit (2 nov 2026) zet de tekstherkenning op "alleen Engels".
- *Instellingen die we nog niet gebruiken.* De OCR-taal gaat via `-constant org.audiveris.omr.text.Language.defaultSpecification=...` (standaard `eng`), met taalbestanden via `TESSDATA_PREFIX`. Audiveris gebruikt Tesseract als ingebouwde bibliotheek en heeft dus op Linux geen Windows-OCR nodig. `audiveris.mjs` zet de taal nu niet.
- *Wanneer komt 5.12?* Er is geen datum gevonden. Een informele bron noemt elke 6 tot 12 maanden een uitgave. Er zijn wel community-images voor Docker, maar die zijn oud. Een fork met een HTTP-API (AntonZN/audiveris-api) nam #1009 en #1090 op 3 november over; die heeft geen gebruikers en geen bekende licentie-uitleg, dus niet gebruiken, alleen ter info.

**copisteria in detail.** De makers melden met musicdiff (OMR-NED, lager is beter) de volgende foutmaten. Audiveris kreeg 54 van de 252 kwartetpagina's niet herkend; die tellen als 100% fout. Het zijn **eigen cijfers op eigen testsets (niet geverifieerd)**, en er zit geen brass en geen losse partij bij.

| Testset | copista-28m | copista-2m | Audiveris 5.11 | homr 0.7 |
|---|---|---|---|---|
| Strijkkwartet, scans | 8,7% | 11,2% | 66,9% | alleen piano |
| Lieder, scans | 17,7% | 17,8% | 51,8% | 42,3% |
| Lieder, renders | 14,6% | 15,9% | 28,8% | 38,0% |
| Pools piano, scans | 34,4% | 38,7% | 62,6% | 48,3% |

Verder: de gewichten zijn getraind op 31.800 pagina's gemaakt uit 28.000 PDMX-stukken (CC BY 4.0, dus naamsvermelding nodig). Handschrift valt erbuiten, liedtekst wordt niet geschreven, en tuplets zonder getal kunnen als gewone noten worden gelezen. Tekst (titel, partijnamen, tempo, rustcijfers) komt uit een los bestand `<pagina>.texts.json` van een OCR-programma. Zij gebruikten Tesseract en noemen PaddleOCR-VL als beter. Licentie Apache-2.0: in de app mag het, met de NOTICE-tekst op de licentiepagina. Het blijft een los Python-programma op de server.

**Waarom niet de rest.** LEGATO valt af vanwege de EU-beperking. Die geldt voor jou als in Nederland gevestigde persoon of bedrijf, niet voor je klanten. SMT, U-MusT en Clarity-OMR zijn op piano of kwartet gericht. Bij homr is de AGPL geen probleem zolang het een los programma blijft, maar de NC-trainingsdata wel als je geld vraagt. Laat dat meenemen bij het juridisch loket (zie `docs/licenties.md`).

**Betaalde diensten** (PlayScore 2, Soundslice, ScanScore, PDFtoMusic Pro): niet getest, want daarvoor is een account of aankoop nodig.

## 2. Digitale pdf's lezen zonder beeldherkenning

**Wat er in jouw eigen pdf's zit.** Ik heb met een klein Node-scriptje in de scratchpad de lettertypen en plaatjes geteld, zonder nieuwe bibliotheek:
- 8 van de 10 zijn scans of plaatjes: HP Scan, Canon, Fujitsu en "Microsoft Print to PDF" met beelden. *Masque* bestaat uit 232 beeldtegels.
- *Devils Galop 2nd Cornet* is gemaakt in **Finale** met het lettertype **Maestro** (plus EngraverTextT, Times en Arial). Op pagina 1 staan de tekens als gewone tekst met een exacte plek: `&` = vioolsleutel (9×), `b` = mol (23×), `#` = kruis (10×), `.` = punt (38×), `>` = accent (26×). Dat is de oude Sonata-indeling. Daarnaast komt één tekencode 122 keer voor, vrijwel zeker de zwarte nootkop. Notenlijnen, stokken en maatstrepen zijn ~400 lijnstukken, balken ~40 gevulde vlakken. De paginastroom is niet eens gecomprimeerd.
- *African Symphony 2nd Cornet* is via "Microsoft Print to PDF" gemaakt, maar is wél vector. De lettertypen hebben een anonieme naam (`CIDFont+F1`...`F5`) en de tekens staan als codes van twee bytes.

**De kern van het probleem.** Hetzelfde muzieklettertype kan twee keer in één pdf zitten: één keer met leesbare 8-bitcodes (Sonata-achtig) en één keer met glyph-nummers (bij Devils Galop `<009D>`). Bij Print-to-PDF ontbreekt ook de naam. Je moet dus per pdf uitzoeken welke code welk teken is. Drie manieren:
1. **Ijken aan Audiveris (aanrader).** Laat Audiveris de pagina gewoon herkennen. Leg elke tekencode naast het symbool dat Audiveris op dezelfde plek vond, en laat de meerderheid beslissen ("`<009D>` = zwarte nootkop"). Daarna verbeter je alle plekken waar Audiveris iets miste of verkeerd las. Werkt ook met anonieme lettertypen.
2. Een vaste tabel per bekend lettertype (Maestro, Opus, Petrucci, Sonata, en de SMuFL-lettertypen Bravura, Leland en Finale Maestro, die op vaste Unicode-plekken staan). Een kant-en-klare tabel van Maestro/Opus naar SMuFL heb ik niet gevonden **(niet geverifieerd)**.
3. De vorm van het ingebedde teken vergelijken. Dat vraagt een lettertypelezer. `fontkit` (MIT) staat al in `node_modules` als onderdeel van pdfkit, maar direct gebruiken telt als nieuwe bibliotheek, dus alleen met jouw akkoord.

| Naam | Licentie | Wat het doet | Actief? | Past het bij ons? | Moeite |
|---|---|---|---|---|---|
| **scorn** (BradleyKH) | AGPL-3.0-or-later | Leest pdf-tekens en -lijnen (PyMuPDF `get_text("rawdict")`, `get_drawings()`), en corrigeert per maat de MusicXML van Audiveris (partijen, toonhoogte, ritme, tekens, tekst); herkent lettertypen aan de getekende tekens | Proefproject, 8 commits, 2026 | Als **bewijs dat het werkt**. Niet overnemen (AGPL, Windows-gericht). Eigen cijfers op 152 bestanden: nootnauwkeurigheid 70,9% → 76,4%, toonhoogte 73,1% → 77,9%, bestanden met ≥98% van 40 naar 60 | — |
| PDFtoMusic Pro (Myriad) | Commercieel | Leest pdf's uit notatieprogramma's via de ingebedde lettertypen; MusicXML; ook voor Linux | Ja | Laat zien dat bijna 100% haalbaar is. Of je het op een server mag aanbieden is onbekend **(niet geverifieerd)**. Kost geld | — |
| pdf.js (Mozilla) | Apache-2.0 | Pdf-lezer in JavaScript: tekst met lettertype en plek (`getTextContent`), tekenopdrachten (`getOperatorList`) | Ja, v6.5.438 (1 nov 2026) | Past technisch het best (Node, geen bouwstap), maar is een **nieuwe bibliotheek: akkoord van Mels nodig** | Middel |
| Eigen kleine pdf-lezer | eigen code | Alleen paginastromen, lettertypen en lijnen; Node `zlib` volstaat | — | Kan zonder nieuwe bibliotheek. Werkte in deze proef op beide digitale pdf's. Wordt lastiger bij versleutelde pdf's of objectstromen | Middel |
| MuPDF `mutool` | AGPL-3.0 | `mutool draw -F stext` geeft XML met lettertype en vak per teken; `-F trace` geeft de tekenopdrachten | Ja | Kan als los programma (zoals Audiveris) | Klein tot middel |
| PyMuPDF | AGPL-3.0 | Python-binding van MuPDF (gebruikt door scorn) | Ja | Alleen als los programma | Middel |
| pdfminer.six / Poppler / PDFium | MIT / GPL / BSD-Apache | Tekst met posities | Ja | Alternatieven als los programma **(licenties niet opnieuw nagekeken)** | Middel |
| pdf_oxide (Rust) | — | Herkent muziekgebieden aan lettertypenamen (Maestro, Bravura, Petrucci, Opus, Sonata, Emmentaler, EngraverText) plus minstens 5 horizontale lijnen | Ja | Alleen de werkwijze is nuttig: zo herken je of een pdf digitaal is | — |

**Hoe haalbaar is het?** Het herkennen van een digitale pdf (lettertypen plus lijnen, geen beelden) en het uitlezen van tekens met hun plek is klein werk; dat liet deze proef zien. Een volledige omzetting naar MusicXML is groot werk: stokken aan koppen koppelen, balken, stemmen, maten. Daarom de route van scorn: **Audiveris levert het skelet** (maten, partijen) en de pdf-tekens verbeteren wat zeker is (aantal koppen per maat, toonhoogte uit de verticale plek ten opzichte van de notenlijnen, voortekens, dynamiek, tekst). Tekst in een gewoon lettertype (tempo, "arr.", partijnaam) staat in een digitale pdf letterlijk als tekst. Dat lost voor dit deel ook het OCR-probleem op. Finale is in 2024 gestopt (algemeen bekend, niet opnieuw nagekeken), maar er blijven nog jaren Maestro-pdf's in omloop.

## 3. Tekstherkenning op Linux (tempowoorden, partijnamen, cijfers)

| Naam | Licentie | Wat het doet | Actief? | Past het bij ons? | Moeite |
|---|---|---|---|---|---|
| **Tesseract 5.5.4** | Apache-2.0 | Klassieke OCR (LSTM), CLI, TSV-uitvoer met woord, vak en zekerheid | Ja: 5.5.3 (24 jul 2026), 5.5.4 (28 okt 2026, 17 beveiligingsfixes) | Ja, basis: `apt install`, klein, snel op de CPU (~0,1–0,3 s per beeld volgens een blogtest); zit ook al in Audiveris | Klein |
| **RapidOCR 3.10.0** | Apache-2.0 | PaddleOCR-modellen via onnxruntime/OpenVINO, zonder PaddlePaddle | Ja (8 okt 2026) | Goede tweede: beter op kleine, scheve of ruizige tekst (algemene benchmarks, niet op bladmuziek). Welke PP-OCR-versie standaard is: **niet geverifieerd** | Klein tot middel |
| PaddleOCR 3.7.0 | Apache-2.0 | PP-OCRv5/v6, plus PaddleOCR-VL (documentmodel van 0,9B) | Ja (11 juni 2026) | Kan, maar zwaar framework; het VL-model is te zwaar voor een kleine server | Middel |
| docTR 1.1.0 (Mindee) | Apache-2.0 | Detectie plus herkenning, PyTorch | Ja (augustus, jaar niet zichtbaar) | Kan, geen voordeel boven RapidOCR gevonden | Middel |
| EasyOCR 1.7.2 | Apache-2.0 | PyTorch | Traag: laatste versie sep 2024 | Nee | — |
| Surya | Code Apache-2.0, gewichten aangepaste OpenRAIL-M | Sterk documentmodel | Ja | Nee: de gewichten zijn alleen gratis onder een omzet- of financieringsgrens (5 miljoen dollar), en voor de CPU is een llama.cpp-server nodig | — |
| Windows.Media.Ocr (nu) | Windows | Ingebouwd | — | Alleen op Windows; blijft voor lokaal gebruik | — |

**Wat werkt bij korte woorden en cijfers** (algemene OCR-praktijk, nog niet op onze bladen gemeten):
- Lees nooit een hele pagina. Lees uitsneden: de kop, de strook boven elk systeem (zoals in `tekstlezer-tesseract.md`) en het vak boven een H-balk.
- Vergroot 2–3× tot een letterhoogte van ruwweg 20–30 pixels. Haal notenlijnen eerst weg of snijd erboven.
- Gebruik bij Tesseract `--psm 7` (één regel) of `--psm 8` (één woord), en voor cijfers `-c tessedit_char_whitelist=0123456789`.
- Gebruik talen `eng+ita+nld`, want tempowoorden zijn Italiaans.
- Verbeter achteraf in eigen code met een vaste woordenlijst (Allegro, Andante, Moderato, Vivace, Maestoso, Marcato, rall., rit., a tempo, cresc., dim., Solo, Tutti, mute, open, arr., Cornet, Flugel, Horn, Baritone, Euphonium, Trombone, Bass) en een kleinste-afstand-vergelijking. Dat vangt fouten als "frernie".
- Neem een woord alleen over boven een zekerheidsdrempel. Bij twijfel komt er een melding in de editor.

## 4. Testmateriaal met een juist antwoord

| Bron | Licentie | Wat het is | Grootte | Past het bij ons? |
|---|---|---|---|---|
| **PDMX** (Zenodo v9, juni 2025) | Dataset CC BY 4.0; stukken publiek domein/CC0. Gebruik de deelset `no_license_conflict` (222.856 stukken) | 250K+ MuseScore-stukken als MusicXML, pdf (render van MuseScore), MIDI en metadata | Totaal 14,4 GB: `PDMX.csv` 225 MB, `metadata` 159 MB, `mxl` 1,9 GB, `pdf` 9,6 GB | **Ja, eerste keus.** Filter op brassinstrumenten via de kolommen `tracks`/`groups`/`tags`; of daar echt instrumentnamen in staan: **niet geverifieerd**. De pdf's zijn ook testmateriaal voor onderwerp 2 |
| OpenScore Lieder | CC0 | ~1.300–1.460 liederen (zang en piano), MuseScore | **niet geverifieerd** | Alleen als algemene controle; geen brass |
| OpenScore String Quartets | CC0 | ~116 kwartetten | **niet geverifieerd** | Idem; meerdere partijen |
| OSSQ-OMR (ISMIR 2026) | Licentie dataset **onbekend** | Echte IMSLP-scans van die kwartetten, uitgelijnd met MusicXML, kern en ABC (24.544 systemen) | Geen downloadlink gevonden | Interessant: echte scans met een juist antwoord |
| OLiMPiC | Data CC BY-SA, code MIT | Piano, synthetisch en echte scans, met MusicXML | Op de releasepagina | Voor TEDn-vergelijking; geen brass |
| Sheet Music Benchmark (SMB) | Toegang op aanvraag (HF-token) | 685 pagina's, kern | — | Alleen als we ons met anderen willen vergelijken |
| DeepScoresV2 | CC BY 4.0 | Symbolen met vakken (detectie) | 81,7 GB totaal; "dense" deel waarschijnlijk 742 MB | Alleen voor het trainen van een detector |
| MUSCIMA++ | CC BY-NC-SA 4.0 **(niet opnieuw nagekeken)** | Handschrift | — | Nee |
| Camera-PrIMuS | CC BY-NC 4.0 (HF-kopie) | Eenstemmige incipits, foto-achtig | — | Alleen intern meten, niet commercieel |
| IMSLP-scans | Publiek domein (let op: in de EU leven + 70 jaar) | Echte oude partijen zonder MusicXML | — | Echte scans. Een juist antwoord moet je zelf maken. Goede kandidaten die in de EU vrij zijn: Sousa (overl. 1932), Fučík (1916), Alford (1945), Holst (1934, *First Suite* voor harmonie) |
| Jouw eigen pdf's | Auteursrecht van uitgevers | Echte brassscans | — | Alleen intern; 2 pagina's als juist antwoord blijft waardevol |

**Scans namaken.** *Augraphy* (MIT, 8.2.6, december 2023, niet meer bijgewerkt) maakt van een schone render een "gekopieerde of gescande" versie: inkt, ruis, scheefstand, lage resolutie. *ImageMagick* (los programma) kan het eenvoudiger: draaien 0,3–1,5°, vervagen, ruis, drempel, JPEG-compressie, 200 dpi. *Smashcima* (Apache-2.0) maakt handschrift van MusicXML; voor ons niet nodig. Het meest realistisch is 5 pagina's printen en scannen met jouw scanner. *Renaissance* komt ook van een HP-scanner.

**Let op bij de synthetische stukken.** Controleer één keer of Verovio de rust van 3 maten in `synth-gemengd` tekent als H-balk met "3" erboven, en niet als kerkrusten (losse rusttekens). In een brasspartij staat bijna altijd een H-balk. Hoe Verovio dat standaard doet, heb ik niet kunnen vinden **(niet geverifieerd)**.

## 5. Meetgereedschap als controle op `vergelijk.mjs`

| Naam | Licentie | Wat het doet | Actief? | Past het bij ons? | Moeite |
|---|---|---|---|---|---|
| **musicdiff 6.0** | MIT | Vergelijkt twee partituren (MusicXML, kern, via music21/converter21), uitvoer als tekst, pdf-markering of OMR-NED-JSON (`-o omrned`); ook een map tegen een map | Ja (22 sep 2026) | Ja, als tweede mening op een paar paren. copisteria, homr en LEGATO gebruiken het ook, dus de cijfers zijn vergelijkbaar | Klein (Python 3.12) |
| TEDn (in `ufal/olimpic-icdar24`) | MIT | Boom-bewerkingsafstand op MusicXML (Hajič e.a. 2016) | Stil | Traag: 30–120 s per systeem; alleen voor een steekproef | Middel |
| MV2H | MIT | Maat voor toonhoogte, stem, metrum, nootwaarde en harmonie (Java); MusicXML via MuseScore 3 | Stil | Eerder voor transcriptie van audio; niet nodig | Middel |
| music21 | BSD-3 | Algemene muziekbibliotheek (Python) | Ja | Alleen als hulpmiddel bij musicdiff | — |

Let op het verschil: OMR-NED deelt de bewerkingen door het aantal symbolen van beide partituren samen (referentie plus uitkomst), terwijl wij "noten goed" en "maten goed" tellen. De getallen zijn dus niet gelijk, maar de **volgorde** tussen motoren hoort wel gelijk te zijn. Is die anders, dan zit er een fout in een van beide.

## 6. Kort: klankbanken en notenschrift in de browser

**Klankbanken** (spessasynth speelt SF2/SF3/DLS, geen SFZ; SFZ-bibliotheken moeten eerst worden omgezet, bijvoorbeeld met Polyphone als los programma):

| Naam | Licentie | Brass? | Opmerking |
|---|---|---|---|
| MuseScore General (nu in gebruik) | MIT | Algemene GM-blazers: trompet, trombone, tuba, hoorn | Geen echte cornet, bugel of euphonium **(niet opnieuw nagekeken)** |
| VSCO 2 Community Edition | CC0 (deels samples uit andere bronnen: de licentiebestanden nakijken) | Ja, basisspeelwijzen | SFZ + WAV |
| Karoryfer War Tuba | CC0 | Tuba (104 MB) | SFZ |
| University of Iowa MIS | Vrij te gebruiken "without restrictions" | Waarschijnlijk hoorn, trompet, trombone, tuba **(niet geverifieerd)** | Losse AIFF-noten, zelf een klankbank van maken |
| Sonatina Symphonic Orchestra | CC Sampling Plus 1.0 (oud, beperkend) | Ja | Liever niet |
| Virtual Playing Orchestra | Mengsel (Sampling Plus, CC BY-SA 3.0, Iowa) | Ja | Licentie per onderdeel; liever niet |
| Northern Trumpets (VGTrumpet) | Gratis, licentie onbekend | Trompet | Niet gebruiken zolang de licentie onbekend is |

**Notenschrift in de browser:** Verovio blijft de beste keus (LGPL, MEI en MusicXML, al in gebruik). Alternatieven:
- OpenSheetMusicDisplay 2.3.0 (7 nov 2026, BSD-3, gebouwd op VexFlow), MusicXML.
- VexFlow (MIT), een laag-niveau tekenaar.
- alphaTab (MPL-2.0), leest MusicXML, met eigen SF2/SF3-speler; gericht op gitaar en tab.
- abcjs (MIT), alleen ABC.

Geen reden om te wisselen.

---

## Wat we als eerste zouden proberen

Elke stap is één taak met een controleerbaar eind.

1. **Audiveris development bouwen.** Haal `development` op, bouw met `gradlew build` (Java 25) in een map buiten het repo, zet `AUDIVERIS` op die build en draai `node automatisering/scanmeting.mjs`. *Klaar als:* de uitslag naast die van 8 november staat. Controleer bij `synth-gemengd` of de rust als `maatrust: 3` terugkomt, en of de melding "Multirest with no measure count" weg is bij Galop. Leg de commit-hash vast in `docs/licenties.md` (ongewijzigde AGPL-bron, met link).
2. **Render van de testrust bekijken.** Kijk één keer naar de pdf van `synth-gemengd` maat 3–5 (H-balk of kerkrusten). Pas zo nodig de pdf-maker aan zodat hij een H-balk met cijfer tekent.
3. **PDMX-kandidaten zoeken.** Download `PDMX.csv` (225 MB) en een script `automatisering/pdmx-kies.mjs` filtert op brassinstrumenten (cornet, flugel, tenor horn, baritone, euphonium, trombone, tuba, trumpet) binnen `no_license_conflict`. *Klaar als:* er een lijst van 30 stukken staat in `taken-en-plannen/meting/pdmx-kandidaten.json`.
4. **Losse partijen maken.** Een script haalt één partij uit een MusicXML, zet `<multiple-rest>` op reeksen lege maten (zoals in gedrukte partijen) en maakt er een A4-pdf van met Verovio. *Klaar als:* 10 partijen met referentie in `testset.json` staan.
5. **Vervuilde varianten.** Van elke partij een 200-dpi-beeld, licht gedraaid, met ruis en JPEG (ImageMagick of Augraphy, alleen op de testmachine), als `soort: "vervuild"`. Optioneel: jij print en scant er 3, als `soort: "scan"`.
6. **copisteria proberen.** Venv in de scratchpad, draai het op Galop p1, Renaissance p1, Devils Galop p1, `synth-gemengd` en 2 PDMX-partijen, en vergelijk met `vergelijk.mjs`. *Klaar als:* de cijfers in `plannen/motoren-vergelijking.md` staan. Doe in dezelfde taak homr 0.7.0, met de licentiekanttekening erbij.
7. **Linux-tekstlezer.** In `tekstlezer.mjs` een tweede uitvoering van `leesBlad` die de `tesseract` CLI aanroept en de TSV inleest (woord, vak, zekerheid). De keuze gaat via een omgevingsvariabele. Test met een vaste TSV als fixture; geen Tesseract nodig in de test.
8. **OCR-vergelijking op uitsneden.** Neem 40 uitsneden uit de testset: tempowoorden, partijnamen, rustcijfers. Zet Tesseract (psm 7/8, `eng+ita+nld`, cijferfilter), RapidOCR en Windows-OCR naast elkaar, met de score per soort. Voeg de woordenlijstcorrectie toe in eigen code.
9. **Vangnet meermaatsrust** (alleen als stap 1 het niet oplost). Zoek in de `.omr`-uitvoer een BEAM of SMALL_BEAM zonder stokken, op de middelste lijn, over het grootste deel van de maat. Snijd het vak erboven uit, lees het cijfer en zet het op `maatrust`. Test met een fixture uit de `.omr` van `synth-gemengd`.
10. **Tekens uit digitale pdf's.** Een script `automatisering/pdf-tekens.mjs` (eigen code, alleen Node `zlib`) geeft per pagina lettertype, tekencode, x/y, grootte en lijnstukken. Test op Devils Galop p1: verwacht ~122 keer dezelfde code (nootkoppen), 23 mollen, 9 vioolsleutels.
11. **IJken van tekencodes aan Audiveris.** Koppel de codes uit stap 10 aan de Audiveris-symbolen op dezelfde plek en maak per pdf een codetabel. Gebruik die als tweede mening per maat (aantal koppen, voortekens) bij digitale pdf's. Test op Devils Galop en African Symphony.
12. **musicdiff als controle.** Draai musicdiff 6.0 (`-o omrned`) op 3 paren die `vergelijk.mjs` ook meet. *Klaar als:* er staat of de volgorde tussen motoren gelijk is.

**Beslissingen voor jou** (ik meld ze, het werk gaat door met de eigen route):
- pdf.js als nieuwe bibliotheek, of de eigen kleine pdf-lezer (stap 10 kan zonder).
- copisteria op de server als het wint (Apache-2.0, los programma; mag volgens de licentieregels).
- homr alleen intern, zolang de vraag over de trainingsdata niet is uitgezocht.

## Bronnen

**Scanmotoren**
- Audiveris releases: https://github.com/Audiveris/audiveris/releases
- Audiveris repo en development-commits: https://github.com/Audiveris/audiveris , https://github.com/Audiveris/audiveris/commits/development
- Audiveris handboek meermaatsrust: https://audiveris.github.io/audiveris/_pages/guides/specific/multi_rest
- Audiveris issue #1007 (cijfer verloren): https://github.com/Audiveris/audiveris/issues/1007
- Audiveris issue #1015 (rust als balk weggegooid): https://github.com/Audiveris/audiveris/issues/1015
- Audiveris PR #1009: https://github.com/Audiveris/audiveris/pull/1009
- Audiveris PR #1090: https://github.com/Audiveris/audiveris/pull/1090
- Lijst PR's van de bijdrager (o.a. #1081, #1083, #996, #1000, #1054): https://github.com/Audiveris/audiveris/pulls?q=is%3Apr+author%3A2opremio
- Audiveris OCR-talen: https://audiveris.github.io/audiveris/_pages/guides/main/languages
- Audiveris opdrachtregel: https://audiveris.github.io/audiveris/_pages/guides/advanced/cli
- Audiveris bouwen uit bron: https://audiveris.github.io/audiveris/_pages/install/sources
- Audiveris training: https://audiveris.github.io/audiveris/_pages/guides/advanced/training
- Fork met API: https://github.com/AntonZN/audiveris-api
- copisteria: https://github.com/kobimusic/copisteria , https://huggingface.co/kobimusic/copisteria , https://huggingface.co/kobimusic/copista-2m
- homr: https://github.com/liebharc/homr , https://pypi.org/project/homr/
- homr licentie-FAQ: https://github.com/liebharc/homr/blob/main/LICENSE_FAQ.md
- homr benchmark: https://github.com/liebharc/homr/blob/main/Benchmark.md
- homr ideeën en ontbrekende functies: https://github.com/liebharc/homr/blob/main/IDEAS_FOR_CONTRIBUTORS.md
- oemer: https://github.com/BreezeWhite/oemer , https://pypi.org/project/oemer/
- LEGATO: https://arxiv.org/abs/2506.19065 , https://huggingface.co/guangyangmusic/legato , https://github.com/guang-yng/legato
- Llama 3.2 en de EU-beperking: https://huggingface.co/blog/llama32 , https://www.llama.com/faq/
- SMT / SMT++: https://github.com/antoniorv6/SMT , https://github.com/antoniorv6/fp-smt , https://link.springer.com/article/10.1007/s11263-025-02654-6
- Transcoda: https://arxiv.org/abs/2605.10835
- Polyphonic-TrOMR: https://awesome.ecosyste.ms/projects/github.com%2Fnetease%2Fpolyphonic-tromr
- Clarity-OMR: https://github.com/clquwu/Clarity-OMR
- U-MusT: https://replicate.com/malerlab/u-must-omr/readme
- Sheet-Music-Recognition (Luckolite): https://github.com/Luckolite/Sheet-Music-Recognition

**Digitale pdf's**
- scorn: https://github.com/BradleyKH/scorn
- PDFtoMusic Pro: https://myriad-online.com/en/products/pdftomusicpro.htm
- Forumoverzicht pdf naar MusicXML (2026): https://forums.steinberg.net/t/pdf-to-musicxml-conversion-2026-options/1032734
- pdf_oxide muziekgebieden: https://docs.rs/crate/pdf_oxide/0.3.76/source/src/converters/music_region_finder.rs
- pdf.js: https://github.com/mozilla/pdf.js/releases
- mutool draw: https://mupdf.readthedocs.io/en/latest/mutool-draw.html
- SMuFL: https://www.smufl.org/ , https://github.com/w3c/smufl/releases

**Tekstherkenning**
- Tesseract: https://github.com/tesseract-ocr/tesseract/releases
- PaddleOCR: https://pypi.org/project/paddleocr/
- RapidOCR: https://pypi.org/project/rapidocr/
- EasyOCR: https://pypi.org/project/easyocr/
- docTR: https://github.com/mindee/doctr/releases
- Surya: https://github.com/datalab-to/surya
- OCR-vergelijkingen (algemeen, blogs): https://imagetotable.ai/blog/best-open-source-ocr-tools-2026 , https://codesota.com/ocr/paddleocr-vs-easyocr

**Testmateriaal**
- PDMX: https://zenodo.org/records/15571083 , https://arxiv.org/abs/2409.10831
- OpenScore Lieder: https://github.com/OpenScore/Lieder
- OSSQ-OMR: https://arxiv.org/abs/2608.10978
- OLiMPiC / TEDn: https://github.com/ufal/olimpic-icdar24
- Sheet Music Benchmark: https://arxiv.org/abs/2506.10488
- DeepScoresV2: https://zenodo.org/record/4012193
- Augraphy: https://pypi.org/project/augraphy/
- Smashcima: https://github.com/OMR-Research/Smashcima
- IMSLP voorbeeld (brass band): https://imslp.org/wiki/Festive_Caprice_(Catelinet,_Philip_Bramwell)

**Meetgereedschap**
- musicdiff: https://pypi.org/project/musicdiff/
- MV2H: https://github.com/apmcleod/MV2H

**Klank en notenschrift**
- VSCO 2 CE: https://versilian-studios.com/vsco-community/
- SFZ-brass (War Tuba, Northern Trumpets): https://sfzinstruments.github.io/brass
- Iowa MIS: https://theremin.music.uiowa.edu/MIS.html
- Sonatina: https://github.com/peastman/sso
- VPO-licenties: https://os.zynthian.org/factory_sfz/Other/VPO3-perf/Documentation/license.htm
- OpenSheetMusicDisplay: https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/releases
- alphaTab: https://github.com/CoderLine/alphaTab

**Eigen meting** (scratchpad-script, niet in het repo): lettertypen en beelden geteld in de 10 pdf's van `C:\Brassmuziek PDF`; glyphs en lijnen geteld op pagina 1 van Devils Galop en African Symphony.
