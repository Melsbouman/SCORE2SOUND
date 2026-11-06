# Ontdekken: gratis bladmuziek zoeken en openen (wens Mels, 6 nov)

Wens: op Ontdekken klikken geeft een scherm zoals de Spotify-startpagina: zoeken, mooie titels, en gratis bestaande muziek direct in de app openen.

Bron: OpenScore Lieder (github.com/OpenScore/Lieder), CC0 (publiek domein). 1462 uitgeschreven stukken van 127 componisten, elk als MusicXML (.mxl). Dat is precies wat de app al kan openen. Catalogus (titel, componist, reeks, pad) staat in `app/public/ontdekken/lieder.json`, gemaakt uit de bestandslijst van de repo. Geen database nodig: zoeken gebeurt in de browser op die lijst.

Stukken:
1. Server: `GET /api/ontdek/<id>` haalt het .mxl van raw.githubusercontent.com (alleen paden uit de catalogus) en geeft het door.
2. Model: `zoekWerken`, `uitgelicht`, `componisten` op de catalogus (puur, met tests).
3. Scherm Ontdekken: zoekbalk, Uitgelicht, Componisten, resultaatkaarten, klik opent het stuk in de app. Zijbalk: Ontdekken wordt een gewone link.
4. Mooie titels en kaarten.
5. Documentatie.

Later: meer bronnen (OpenScore String Quartets, Mutopia, IMSLP-koppeling), favorieten, "Ontdekken" met eigen herkende rechtenvrije scans.
