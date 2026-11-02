# Keuzes

## Online web-app
De app is een online web-app, waarbij we eerst lokaal bouwen en testen voordat we online gaan (hosting, accounts, opslag per gebruiker). Dit maakt het eenvoudiger om te verwerken en te testen zonder externe afhankelijkheden.

## Herkenning met Audiveris
De herkenning van bladmuziek gebeurt met Audiveris (gratis, open source, levert MusicXML) op de server. Dit biedt een krachtige en betrouwbare manier om noten uit PDF's, scans of foto's te extraheren.

## Vaste kleine set bibliotheken
We gebruiken alleen een paar vaste bibliotheken (verovio, fast-xml-parser, spessasynth_lib) en bouwen verder alles zelf met tests. Nieuwe bibliotheken zijn alleen met akkoord van Mels toegestaan. Dit minimaliseert de afhankelijkheid en houdt het project beheersbaar.

## Volgorde: eerst fundament met MusicXML
We beginnen met het fundament: MusicXML als invoer (inlezen, bekijken, afspelen, controleren, bewaren, exporteren). Daarna is herkenning alleen een nieuwe manier om aan MusicXML te komen. Zo werkt er snel iets, en is alles wat na de herkenning komt al getest. Dit zorgt voor een snelle basis en eenvoudige tests.

## Techniek: Node 24 met modules, zonder framework
De app draait op Node 24 met JavaScript-modules, zonder framework en zonder bouwstap. De server gebruikt de ingebouwde http-module. Tests gebeuren met node --test (npm test in app/). Dit houdt de configuratie eenvoudig.

## Bibliotheken: notatie, lezen, geluid
De vaste bibliotheken zijn: verovio 6.3 (LGPL-3.0) voor notatie als SVG, fast-xml-parser 5.11 (MIT) voor MusicXML, spessasynth_lib 4.4 (Apache-2.0) voor MIDI, en een vrije General MIDI-klankbank met verspreidingslicentie. Claude kiest welke. Dit biedt krachtige functionaliteit met open-source licenties.

## Eigen muziekmodel
Alles werkt op één JSON-model (docs/model.md) met per element een zekerheid (0 tot 1) voor wat de herkenning gaf. MusicXML is alleen invoer en uitvoer, niet het werkmodel. Zo zijn controleren, transponeren en samenvoegen gewone functies die je kunt testen. Dit centraliseert de data en maakt complexe operaties mogelijk.

## Eigen MIDI-schrijver
In plaats van Verovio's MIDI-schrijver maken we een eigen: klein, goed te testen, en hij kent ons model (volume per partij, tempo, herhalingen). Dit geeft meer controle over MIDI-output.

## Taal: Nederlands met Nederlandse muziektermen
De app is in het Nederlands, met muziektermen zoals een Nederlandse muzikant ze kent (maat, maatsoort, voortekens, partij, stemming). De instrumentenlijst begint bij fanfare en brassband (zoals althoorn en bugel) plus de gangbare orkestinstrumenten. Dit maakt de app toegankelijk voor de gebruiker.

## Mappenstructuur
De app heeft een duidelijke indeling: app/ (src/, public/, test/), docs/model.md. Dit zorgt voor een goed georganiseerde codebase.

## Twee rondes herkenning
Audiveris draait in twee rondes: eerst transcriptie, dan export naar MusicXML. Pagina's die niet lukken worden gemeld. Dit verbetert de herkenningsbetrouwbaarheid.

## Zekerheid uit de .omr
De app pakt de .omr uit en koppelt elke notenkop aan een noot, per maat, notenbalk en lijnpositie. `zekerheid` wordt de `ctx-grade` van de kop. Wat niet te koppelen is, krijgt 0,5. Rusten krijgen de `ctx-grade` van hun rust als die te vinden is, anders 1. Dit laat onzekere noten zichtbaar voor correctie.

## Origineel komt ook uit de .omr
Per pagina staat in de .omr de BINARY.png, de zwart-witafbeelding die Audiveris gelezen heeft. Zo is er geen PDF-bibliotheek nodig. Dit vereenvoudigt het verwerken van het origineel.

## Zip zelf lezen
We lezen zip-bestanden met ingebouwd node:zlib, geen nieuwe bibliotheek. Daarmee kan de app meteen ook .mxl openen. Dit verkleint afhankelijkheden.

## Herkennen is een klus op de achtergrond
Upload geeft meteen een nummer terug, de browser vraagt elke seconde de stand op. Audiveris schrijft per pagina de stappen in zijn uitvoer; daaruit komt de voortgang. Er draait één herkenning tegelijk. Dit biedt snelle feedback.

## Pagina's kiezen
Bij een PDF kun je aangeven welke pagina's. Dit verhelpt het probleem van grote PDF's.

## Uploadgrens 100 MB
De uploadgrens is verhoogd van 25 naar 100 MB, want een echte scan is groot. Dit ondersteunt realistische bestanden.

## Bewaren herkenning apart
De herkenning staat in app/herkenning/<id>/ (niet in git). De partituur krijgt `bron` en de noten `plek`, zodat een bewaard project het origineel terugvindt. Opruimen komt in fase 5. Dit bewaart gebruikerswerk.

## Onzekere noten zichtbaar
De app schrijft voor de weergave een `id` op elke noot en rust en een `color` op onzekere noten; Verovio neemt beide over. Exports blijven zonder kleur. Dit visualiseert onzekere noten.

## Corrigeren van noten
Klik op een noot, krijg een paneel omhoog of omlaag, voorteken, duur, noot naar rust en andersom, "Klopt". Plus "Volgende onzekere noot". Na elke wijziging tekent de app opnieuw. Dit maakt correctie mogelijk.

## Testvoorbeelden met echte Audiveris-uitkomst
Claude maakt een klein eigen voorbeeld met een echte Audiveris-uitkomst uit app/test/voorbeelden/. Partituren van anderen komen niet in de repo. Tests hebben Audiveris niet nodig: ze werken met dat voorbeeld en een nepprogramma. Eén extra test draait alleen als Audiveris er is. Dit test de herkenning zonder externe afhankelijkheden.

## Fouten in gewone taal
Geen Audiveris gevonden, geen notenbalken gevonden, afbeelding te klein ("scan op 300 dpi"), afgebroken. Dit biedt duidelijke foutmeldingen.

## Tekstsoorten en plaatsing
Een module verdeelt tekst in tempo, expressie, spelwijze en structuur, met plaatsing (tempo en structuur boven, expressie meestal onder, spelwijze boven) en cursief voor expressie, bold voor tempo; afkortingen blijven letterlijk. Dit verbetert de visuele weergave.

## Metronoom met de echte nootwaarde
Het model bewaart eenheid, punt en getal ("♩. = 180" blijft zo staan; het afspelen rekent om). Dit behoudt ritme nauwkeurig.

## Indelingscontrole
Vergelijkt systemen en maten per regel van de gerenderde notatie met de bron en geeft een kort verslag; naast de nauwkeurigheid van de noten een tweede score voor de opmaak. Dit controleert de opmaak.

## Mooiere opmaak
Een titelblok zoals de uitgevers het doen (titel gecentreerd, instrument links, componist rechts), een rustiger notenlettertype, ruimere afstanden, de pagina als papier met marges. Dit verbetert de weergave.

## Agentworkflow: Claude plant, Codex, Copilot en Hermes bouwen
Claude plant, Codex schrijft logica en tests, Copilot doet interface, Hermes doet kleine vaste teksten. Een script controleert. Dit verdeelt het werk efficiënt.

## Accounts met uitnodigingscode
Er zijn accounts, maar ze worden aangeboden via een uitnodigingscode. Dit controleert de toegang.