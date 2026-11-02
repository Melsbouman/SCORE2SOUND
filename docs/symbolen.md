# Muzikale notatietekens

De twee opgegeven PDF-bestanden konden in deze werkomgeving niet worden geopend. Deze inventarisatie is daarom gebaseerd op kennis van gangbare muzieknotatie en MusicXML. `Ja` betekent dat het teken in de genoemde onderdelen van SCORE2SOUND expliciet wordt verwerkt; `nee` betekent dat daar geen ondersteuning voor is aangetroffen. Bij samengestelde aanduidingen kan het MusicXML-element uit meer dan één onderdeel bestaan.

| Teken | Nederlandse naam | MusicXML-element | Model (veld in `docs/model.md` of nee) | Inlezen | Schrijven en tekenen | Afspelen |
|---|---|---|---|---|---|---|
| Hele noot | Hele noot | `<note><type>whole</type>` | `noten[].duur` | ja | ja | ja |
| Halve noot | Halve noot | `<note><type>half</type>` | `noten[].duur` | ja | ja | ja |
| Kwartnoot | Kwartnoot | `<note><type>quarter</type>` | `noten[].duur` | ja | ja | ja |
| Achtste noot | Achtste noot | `<note><type>eighth</type>` | `noten[].duur` | ja | ja | ja |
| Zestiende noot | Zestiende noot | `<note><type>16th</type>` | `noten[].duur` | ja | ja | ja |
| Tweeëndertigste noot | Tweeëndertigste noot | `<note><type>32nd</type>` | `noten[].duur` | ja | ja | ja |
| Vierenzestigste noot | Vierenzestigste noot | `<note><type>64th</type>` | `noten[].duur` | ja | ja | ja |
| Punt | Gepunte nootwaarde | `<dot>` | `noten[].duur` | ja | ja | ja |
| Dubbele punt | Dubbel gepunte nootwaarde | `<dot><dot>` | `noten[].duur` | ja | ja | ja |
| Hele rust | Hele rust | `<note><rest/><type>whole</type>` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Halve rust | Halve rust | `<note><rest/><type>half</type>` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Kwartrust | Kwartrust | `<note><rest/><type>quarter</type>` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Achtste rust | Achtste rust | `<note><rest/><type>eighth</type>` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Zestiende rust | Zestiende rust | `<note><rest/><type>16th</type>` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Tweeëndertigste rust | Tweeëndertigste rust | `<note><rest/><type>32nd</type>` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Maatrust | Hele-maatrust | `<rest measure="yes">` | `noten[].rust`, `noten[].duur` | ja | ja | ja |
| Meermaats-rust | Meermaats-rust | `<multiple-rest>` | nee | nee | nee | nee |
| Overbinding | Overbindingsboog | `<tie>`, `<tied>` | `noten[].overbinding` | ja | ja | ja |
| Legatoboog | Legatoboog | `<slur>` | nee | nee | nee | nee |
| Fraseboog | Boog over meerdere noten | `<slur>` | nee | nee | nee | nee |
| ♯ | Kruis | `<accidental>sharp</accidental>` | `noten[].alteratie` | ja | ja | ja |
| ♭ | Mol | `<accidental>flat</accidental>` | `noten[].alteratie` | ja | ja | ja |
| ♮ | Herstellingsteken | `<accidental>natural</accidental>` | `noten[].alteratie` | ja | ja | ja |
| 𝄪 | Dubbelkruis | `<accidental>double-sharp</accidental>` | `noten[].alteratie` | ja | ja | ja |
| 𝄫 | Dubbelmol | `<accidental>flat-flat</accidental>` | `noten[].alteratie` | ja | ja | ja |
| Kruis tussen haakjes | Waarschuwingsvoorteken | `<accidental parentheses="yes">` | nee | nee | nee | nee |
| Toonsoort met kruisen | Toonsoort | `<key><fifths>` | `maten[].toonsoort` | ja | ja | nee |
| Toonsoort met mollen | Toonsoort | `<key><fifths>` | `maten[].toonsoort` | ja | ja | nee |
| 4/4 | Vierkwartsmaat | `<time><beats>4</beats><beat-type>4</beat-type>` | `maten[].maatsoort` | ja | ja | nee |
| 3/4 | Driekwartsmaat | `<time><beats>3</beats><beat-type>4</beat-type>` | `maten[].maatsoort` | ja | ja | nee |
| 6/8 | Zesachtstemaat | `<time><beats>6</beats><beat-type>8</beat-type>` | `maten[].maatsoort` | ja | ja | nee |
| C | Vierkwartsmaat, C-teken | `<time symbol="common">` | `maten[].maatsoort` | ja | ja | nee |
| ¢ | Alla breve | `<time symbol="cut">` | `maten[].maatsoort` | ja | ja | nee |
| G-sleutel | Vioolsleutel | `<clef><sign>G</sign>` | `partijen[].sleutel` | ja | ja | nee |
| F-sleutel | Bassleutel | `<clef><sign>F</sign>` | `partijen[].sleutel` | ja | ja | nee |
| C-sleutel | Alt- of tenorsleutel | `<clef><sign>C</sign>` | `partijen[].sleutel` | ja | ja | nee |
| 8va | Octaaf hoger | `<octave-shift type="down" size="8">` | nee | nee | nee | nee |
| 8vb | Octaaf lager | `<octave-shift type="up" size="8">` | nee | nee | nee | nee |
| pppp | Zeer uiterst zacht | `<dynamics><pppp>` | nee | nee | nee | nee |
| ppp | Uiterst zacht | `<dynamics><ppp>` | nee | nee | nee | nee |
| pp | Zeer zacht | `<dynamics><pp>` | nee | nee | nee | nee |
| p | Zacht | `<dynamics><p>` | nee | nee | nee | nee |
| mp | Matig zacht | `<dynamics><mp>` | nee | nee | nee | nee |
| mf | Matig sterk | `<dynamics><mf>` | nee | nee | nee | nee |
| f | Sterk | `<dynamics><f>` | nee | nee | nee | nee |
| ff | Zeer sterk | `<dynamics><ff>` | nee | nee | nee | nee |
| fff | Uiterst sterk | `<dynamics><fff>` | nee | nee | nee | nee |
| ffff | Zeer uiterst sterk | `<dynamics><ffff>` | nee | nee | nee | nee |
| sfz | Sforzato | `<dynamics><sfz>` | nee | nee | nee | nee |
| fp | Fortepiano | `<dynamics><fp>` | nee | nee | nee | nee |
| cresc. | Crescendo als tekst | `<words>` | nee | nee | nee | nee |
| dim. | Diminuendo als tekst | `<words>` | nee | nee | nee | nee |
| < | Crescendowig | `<wedge type="crescendo">` | nee | nee | nee | nee |
| > | Diminuendowig | `<wedge type="diminuendo">` | nee | nee | nee | nee |
| > boven noot | Accent | `<accent>` | nee | nee | nee | nee |
| • | Staccato | `<staccato>` | nee | nee | nee | nee |
| — | Tenuto | `<tenuto>` | nee | nee | nee | nee |
| ^ | Marcato | `<strong-accent>` | nee | nee | nee | nee |
| Fermate | Fermate | `<fermata>` | nee | nee | nee | nee |
| tr | Triller | `<trill-mark>` | nee | nee | nee | nee |
| Mordent | Mordent | `<mordent>` | nee | nee | nee | nee |
| Praltriller | Omgekeerde mordent | `<inverted-mordent>` | nee | nee | nee | nee |
| Dubbelslag | Dubbelslag | `<turn>` | nee | nee | nee | nee |
| Verticale golf | Arpeggio | `<arpeggiate>` | nee | nee | nee | nee |
| Schuine strepen | Tremolo | `<tremolo>` | nee | nee | nee | nee |
| Voorslag met streep | Korte voorslag | `<grace slash="yes">` | nee | nee | nee | nee |
| Voorslag zonder streep | Lange voorslag | `<grace>` | nee | nee | nee | nee |
| 3 | Triool | `<time-modification>`, `<tuplet>` | nee | nee | nee | nee |
| 5 | Kwintool | `<time-modification>`, `<tuplet>` | nee | nee | nee | nee |
| 6 | Sextool | `<time-modification>`, `<tuplet>` | nee | nee | nee | nee |
| Gliss. | Glissando | `<glissando>` | nee | nee | nee | nee |
| Port. | Portamento | `<slide>` | nee | nee | nee | nee |
| Dubbele maatstreep | Dubbele maatstreep | `<bar-style>light-light</bar-style>` | nee | ja | ja | nee |
| Dikke slotstreep | Eindmaatstreep | `<bar-style>light-heavy</bar-style>` | nee | ja | ja | nee |
| :|| | Herhaling einde | `<repeat direction="backward">` | nee | nee | nee | nee |
| ||: | Herhaling begin | `<repeat direction="forward">` | nee | nee | nee | nee |
| 1. | Eerste volta | `<ending number="1">` | nee | nee | nee | nee |
| 2. | Tweede volta | `<ending number="2">` | nee | nee | nee | nee |
| Segno | Segno | `<segno>` | nee | nee | nee | nee |
| Coda | Coda | `<coda>` | nee | nee | nee | nee |
| D.C. | Da capo | `<sound dacapo="yes">` | nee | nee | nee | nee |
| D.S. | Dal segno | `<sound dalsegno="…">` | nee | nee | nee | nee |
| Fine | Fine | `<sound fine="yes">` | nee | nee | nee | nee |
| A | Repetitieletter | `<rehearsal>` | nee | nee | nee | nee |
| % | Herhaal vorige maat | `<measure-repeat>` | nee | nee | nee | nee |
| // | Herhaal vorige twee maten | `<measure-repeat type="start">` | nee | nee | nee | nee |
| ♩ = 120 | Metronoomaanduiding | `<metronome>`, `<sound tempo="120">` | `tempo` | ja | ja | ja |
| Allegro | Tempoaanduiding als tekst | `<words>`, `<sound tempo="…">` | nee | nee | nee | nee |
| rit. | Ritenuto | `<words>` | nee | nee | nee | nee |
| accel. | Accelerando | `<words>` | nee | nee | nee | nee |
| Ped. | Pedaal indrukken | `<pedal type="start">` | nee | nee | nee | nee |
| ✱ | Pedaal loslaten | `<pedal type="stop">` | nee | nee | nee | nee |
| Komma | Ademhalingsteken | `<breath-mark>` | nee | nee | nee | nee |
| Caesuur | Caesuur | `<caesura>` | nee | nee | nee | nee |

## Volgende stappen

1. **Dynamiek:** lees en bewaar ten minste `ppp` tot en met `fff`, zodat afspelen hoorbaar overeenkomt met de partituur.
2. **Herhalingen:** ondersteun voorwaartse en achterwaartse herhalingstekens, omdat veel muziek anders in de verkeerde vorm wordt afgespeeld.
3. **Triool en andere tupletten:** behoud afwijkende tijdsverdelingen, zodat ritme en maatduur correct blijven.
4. **Legato- en frasebogen:** bewaar en teken bogen over meerdere noten, omdat ze essentieel zijn voor frasering en articulatie.
5. **Staccato, accent, tenuto en marcato:** verwerk de meest gebruikte articulaties in weergave en afspelen.
6. **Volta's:** ondersteun eerste en tweede eindes samen met herhalingen, zodat gangbare liedvormen correct verlopen.
7. **Crescendo- en diminuendowiggen:** laat geleidelijke dynamische veranderingen zien en horen.
8. **Voorslagen:** lees, teken en speel korte en lange voorslagen zonder de hoofdmaat te verstoren.
9. **Fermate:** bewaar en teken fermates en geef ze een duidelijke, configureerbare invloed op de afspeelduur.
10. **Tempoveranderingen:** ondersteun ritenuto en accelerando, zodat tempo niet alleen aan het begin maar ook binnen een stuk kan veranderen.
