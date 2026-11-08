# Webapp die puur in de browser werkt (wens Mels, 7 nov)

Wens: een webapp die alleen uit code bestaat: geen downloads, geen eigen server. Je geeft hem een domein en mensen gebruiken hem online.

## Wat kan in de browser (statisch hosten, bv. Cloudflare Pages of Netlify, plus een domein)
- Editor, notatie (Verovio, WebAssembly), afspelen (spessasynth), mixer, export van MusicXML, MIDI, WAV en pdf via afdrukken.
- Ontdekken: de catalogus staat al als bestand; de stukken haalt de browser direct bij raw.githubusercontent.com op (die zet Access-Control-Allow-Origin: *; getest 7 nov). De serverroute /api/ontdek is dan niet meer nodig.
- Importeren van MusicXML, .mxl en (nieuw, zelf te schrijven) MuseScore-bestanden .mscz: dat zijn zip-bestanden met xml.
- Projecten bewaren in de browser (IndexedDB) en als bestand opslaan en openen. Geen account nodig.

## Wat nu nog een server vraagt
- /api/importeer (parsen van MusicXML): verhuist naar de browser (de lezer in src/musicxml is al gewone JavaScript; alleen leesZip gebruikt Node).
- Accounts en opgeslagen projecten per gebruiker (nu server): vervangen door lokaal bewaren; delen of synchroniseren later via een kleine serverloze dienst.
- PDF en foto naar noten (Audiveris, Java): kan niet in de browser. Opties: later een optionele losse herkenningsdienst; of herkenning in de browser met een open model (onnxruntime-web, zwaar en nog onbewezen); tot dan is de scan-import een aparte functie.

## MuseScore in de browser?
Er bestaat geen MuseScore voor de browser. De code is C++/Qt onder GPL v3. Als we er ooit stukken van meeleveren aan bezoekers wordt onze hele app GPL (open source verplicht). Dat is een keuze voor later; nu schrijven we alles zelf.

## Stappen
1. Statische modus: een build die zonder Node-server draait (index.html, js, src, vendor als losse bestanden).
2. Importeren in de browser (musicxml, mxl); leesZip met DecompressionStream.
3. Ontdekken direct bij GitHub; CSP connect-src aanpassen.
4. Projecten in IndexedDB; opslaan en openen als bestand.
5. .mscz importeren.
6. Domein en hosting (keuze en betaling door Mels), met een privacyverklaring.
7. Scan-import als optionele dienst, apart besluit.
