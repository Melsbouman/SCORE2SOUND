# Editor en Nieuw-scherm in de stijl van MuseScore (wens Mels, 6 nov)

Mels' voorbeelden: MuseScore Studio. Wensen:
1. Zijbalk onder Maken: twee items, **Nieuwe partituur** en **Nieuwe partij** (twee verschillende schermen, elk opent de editor).
2. Nieuwe partituur: keuzescherm zoals MuseScore: tabs "Kies instrumenten" / "Maak van sjabloon"; kolommen Familie (met een keuzelijst: Regulier, Alle instrumenten, Pop/Rock, Jazz, Koor, Orkest, Symfonieorkest, Muziekkorps, ... en bij ons ook Brassband), Instrumenten (met zoekveld), pijl naar rechts, "Uw partituur" met een volgorde (Orkest, Muziekkorps, Brassband), omhoog/omlaag en verwijderen; Annuleren, Volgende, Klaar.
3. Editor: bovenin een vaste notenbalk (duren, punt, rust, voortekens, ligatuur, triolen met uitklap: duool, triool, kwartool, kwintool, sextool, zeventool, achttool, negentool; stemmen 1 tot 4). Links Paletten met uitklapbare onderdelen: Muzieksleutels, Toonsoorten, Maatsoorten, Tempo, Toonhoogte, Voortekens, Dynamiek, Articulaties, Tekst, Herhalingen en sprongen, Maatstrepen, waarvan je items kunt aanklikken of in de partituur slepen. De zijbalk van de app blijft links staan.

## Wat wel en niet kan (uitgezocht)
- **MuseScore-code (github.com/musescore/musescore)**: C++/Qt, licentie GPL v3. Overnemen in onze app zou de hele app onder de GPL brengen; bovendien is het geen web-code. We nemen dus geen code over, alleen het idee en de indeling (feiten zoals de lijst van paletten en tempowoorden mogen). Mogelijk later: MuseScore als losse server-opdracht gebruiken (bijv. om .mscz te lezen of pdf/audio te maken); dat is een apart besluit voor Mels (zwaar om online te zetten).
- **MuseSounds**: betaalde, gesloten klankbibliotheken (abonnement) alleen binnen MuseScore Studio. Niet te gebruiken op onze site. Wel: gratis klanken (MuseScore General zit er al in); betere gratis soundfonts kunnen later per instrument, bv. voor brassband.
- **Paletten (.mpal)**: kleine xml-lijsten (map `C:\Brassmuziek PDF\muziekbank editor\`). We maken een eigen lijst in code met dezelfde indeling.

## Taken (volgorde)
1. Zijbalk: Nieuwe partituur en Nieuwe partij (aanpassing van taak 1659).
2. Model: instrumentkiezer (families, volgordes, zoeken, meer instrumenten voor brassband en harmonie).
3. Model: tuplets (duool tot negentool).
4. Model: paletten (de lijst met items en acties).
5. Scherm Nieuwe partituur; scherm Nieuwe partij.
6. Notenbalk bovenin de editor.
7. Paletten-paneel met items en slepen (bouwt op 1668).
