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
|| Meermaats-rust | Meermaats-rust | `<multiple-rest>` | nee | nee | nee | nee |
|| Overbinding | Overbindingsboog | `<tie>`, `<tied>` | `noten[].overbinding` | ja | ja | ja |
|| Legatoboog | Legatoboog | `<slur>` | ja | ja | ja |
|| Fraseboog | Boog over meerdere noten | `<slur>` | ja | ja | ja |
|| ♯ | Kruis | `<accidental>sharp</accidental>` | `noten[].alteratie` | ja | ja | ja |
|| ♭ | Mol | `<accidental>flat</accidental>` | `noten[].alteratie` | ja | ja | ja |
|| ♮ | Herstellingsteken | `<accidental>natural</accidental>` | `noten[].alteratie` | ja | ja | ja |
|| 𝄪 | Dubbelkruis | `<accidental>double-sharp</accidental>` | `noten[].alteratie` | ja | ja | ja |
|| 𝄫 | Dubbelmol | `<accidental>flat-flat</accidental>` | `noten[].alteratie` | ja | ja | ja |
|| Kruis tussen haakjes | Waarschuwingsvoorteken | `<accidental parentheses="yes">` | nee | nee | nee | nee |
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
|| pppp | Zeer uiterst zacht | `<dynamics><pppp>` | ja | ja | ja |
|| ppp | Uiterst zacht | `<dynamics><ppp>` | ja | ja | ja |
|| pp | Zeer zacht | `<dynamics><pp>` | ja | ja | ja |
|| p | Zacht | `<dynamics><p>` | ja | ja | ja |
|| mp | Matig zacht | `<dynamics><mp>` | ja | ja | ja |
|| mf | Matig sterk | `<dynamics><mf>` | ja | ja | ja |
|| f | Sterk | `<dynamics><f>` | ja | ja | ja |
|| ff | Zeer sterk | `<dynamics><ff>` | ja | ja | ja |
|| fff | Uiterst sterk | `<dynamics><fff>` | ja | ja | ja |
|| ffff | Zeer uiterst sterk | `<dynamics><ffff>` | ja | ja | ja |
|| sfz | Sforzato | `<dynamics><sfz>` | ja | ja | ja |
|| fp | Fortepiano | `<dynamics><fp>` | ja | ja | ja |
|| cresc. | Crescendo als tekst | `<words>` | ja | ja | ja |
|| dim. | Diminuendo als tekst | `<words>` | ja | ja | ja |
|| < | Crescendowig | `<wedge type="crescendo">` | ja | ja | ja |
|| > | Diminuendowig | `<wedge type="diminuendo">` | ja | ja | ja |
|| > boven noot | Accent | `<accent>` | ja | ja | ja |
|| • | Staccato | `<staccato>` | ja | ja | ja |
|| — | Tenuto | `<tenuto>` | ja | ja | ja |
|| ^ | Marcato | `<strong-accent>` | ja | ja | ja |
|| Fermate | Fermate | `<fermata>` | ja | ja | ja |
|| tr | Triller | `<trill-mark>` | ja | ja | ja |
|| Mordent | Mordent | `<mordent>` | ja | ja | ja |
|| Praltriller | Omgekeerde mordent | `<inverted-mordent>` | ja | ja | ja |
|| Dubbelslag | Dubbelslag | `<turn>` | ja | ja | ja |
|| Verticale golf | Arpeggio | `<arpeggiate>` | nee | nee | nee | nee |
|| Schuine strepen | Tremolo | `<tremolo>` | nee | nee | nee | nee |
|| Voorslag met streep | Korte voorslag | `<grace slash="yes">` | nee | nee | nee | nee |
|| Voorslag zonder streep | Lange voorslag | `<grace>` | nee | nee | nee | nee |
|| 3 | Triool | `<time-modification>`, `<tuplet>` | nee | nee | nee | nee |
|| 5 | Kwintool | `<time-modification>`, `<tuplet>` | nee | nee | nee | nee |
|| 6 | Sextool | `<time-modification>`, `<tuplet>` | nee | nee | nee | nee |
|| Gliss. | Glissando | `<glissando>` | nee | nee | nee | nee |
|| Port. | Portamento | `<slide>` | nee | nee | nee | nee |
|| Dubbele maatstreep | Dubbele maatstreep | `<bar-style>light-light</bar-style>` | nee | ja | ja | nee |
|| Dikke slotstreep | Eindmaatstreep | `<bar-style>light-heavy</bar-style>` | nee | ja | ja | nee |
|| :|| | Herhaling einde | `<repeat direction="backward">` | nee | nee | nee | nee |
|| ||: | Herhaling begin | `<repeat direction="forward">` | nee | nee | nee | nee |
|| 1. | Eerste volta | `<ending number="1">` | nee | nee | nee | nee |
|| 2. | Tweede volta | `<ending number="2">` | nee | nee | nee | nee |
|| Segno | Segno | `<segno>` | nee | nee | nee | nee |
|| Coda | Coda | `<coda>` | nee | nee | nee | nee |
|| D.C. | Da capo | `<sound dacapo="yes">` | nee | nee | nee | nee |
|| D.S. | Dal segno | `<sound dalsegno="…">` | nee | nee | nee | nee |
|| Fine | Fine | `<sound fine="yes">` | nee | nee | nee | nee |
|| A | Repetitieletter | `<rehearsal>` | nee | nee | nee | nee |
|| % | Herhaal vorige maat | `<measure-repeat>` | nee | nee | nee | nee |
|| // | Herhaal vorige twee maten | `<measure-repeat type="start">` | nee | nee | nee | nee |
|| ♩ = 120 | Metronoomaanduiding | `<metronome>`, `<sound tempo="120">` | `tempo` | ja | ja | ja |
|| Allegro | Tempoaanduiding als tekst | `<words>`, `<sound tempo="…">` | nee | nee | nee | nee |
|| rit. | Ritenuto | `<words>` | nee | nee | nee | nee |
|| accel. | Accelerando | `<words>` | nee | nee | nee | nee |
|| Ped. | Pedaal indrukken | `<pedal type="start">` | nee | nee | nee | nee |
|| ✱ | Pedaal loslaten | `<pedal type="stop">` | nee | nee | nee | nee |
|| Komma | Ademhalingsteken | `<breath-mark>` | nee | nee | nee | nee |
|| Caesuur | Caesuur | `<caesura>` | nee | nee | nee | nee |

## Volgende stappen

1. **Octaafverschuiving (8va/8vb):** voeg ondersteuning toe voor octaafverschuivingsaanwijzingen.
2. **Herstelvoorteken:** sla kwadraat aangehaakte voortekens op, zoals `<accidental parentheses="yes">`.
3. **Glissando en portamento:** ondersteun door- en overloopbewegingen.
4. **Segno, Coda, D.C., D.S. en Fine:** verwerk terugkeerindieningen.
5. **Repetitieletters:** lees hervattingstekens zoals `<rehearsal>`.
6. **Herhaalvorige maat (% en //):** sla maatherhalingen op.
7. **Pedalen:** voeg start- en stopaanwijzingen toe voor pedaalbewerking.
8. **Ademhalingsteken en caesuur:** sla ademhalings- en pauze-indieningen op.
9. **Ritenuto en accelerando:** verwerk tempo-veranderende teksten.
10. **Pedaal:** ondersteun pedaalstart- en -stopaanwijzingen.
