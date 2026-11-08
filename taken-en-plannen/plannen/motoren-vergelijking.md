# Motorenvergelijking: oemer en homr naast Audiveris (4 november 2026)

Doel: nagaan of een tweede gratis motor naast Audiveris iets toevoegt. Testpagina's: Galop 2nd Cornet en Renaissance 2nd Cornet, pagina 1, 200 dpi.

## Uitkomst in het kort
| Motor | Galop | Renaissance | Bruikbaar? |
|---|---|---|---|
| Audiveris + herstelketen (de app) | 104 maten, 44 noten onder zekerheid 0,8, 55 noten niet aan het origineel te koppelen | 78 maten, 46 onzekere noten, 23 niet te koppelen | ja, huidige motor |
| homr 0.x | 100 maten, 344 noten, 123 rusten, alle 12 notenbalken gevonden | 74 maten, 259 noten, 59 rusten | geeft een uitkomst, kwaliteit nog niet gemeten |
| oemer 0.1.8 | stopt in "Extracting stafflines" (`IndexError: invalid index to scalar variable`) | zelfde fout | nee, valt om op deze pagina's |

## Bevindingen
- **oemer** breekt in de balkdetectie op een volle pagina met twaalf regels (oorzaak niet uitgezocht). Eerst faalde het ook op de nieuwste onnxruntime (`pads must not contain negative values`); met onnxruntime 1.19.2 en numpy 2 draait het wel, maar de balkdetectie breekt. Niet verder mee.
- **homr** vindt op Galop alle twaalf regels (zie `galop-p1_teaser.png`: elke regel een eigen kleur) en schrijft MusicXML. Alles komt als één partij met honderd achtereenvolgende maten uit; de herhalingen, hokjes 1./2., repetitieletters, dynamiek en tekst ontbreken of zijn niet gekoppeld. Het mist dus precies wat de herstelketen van de app aanvult.
- homr heeft 4 maten minder dan Audiveris op Galop en 4 minder op Renaissance. Of dat de goede aantallen zijn, is nog niet getoetst aan het origineel.

## Wat dit betekent
- oemer valt af.
- homr is geschikt als **tweede mening**: een noot waar Audiveris onzeker is (zekerheid onder 0,8) kan met homr worden vergeleken, en gaat alleen mee als beide motoren hetzelfde zien. Dat vraagt een koppeling per maat en is een groter pakket.

## Volgende stap (voorstel, geen akkoord nodig)
1. Een script `automatisering/homr-vergelijk.mjs` dat de MusicXML van homr leest en per maat noten telt en toonhoogtes naast `galop.json` zet. Dat meet hoeveel noten homr anders ziet dan Audiveris.
2. Pas als homr op meer dan de helft van de onzekere noten de juiste toonhoogte geeft, bouwen we de koppeling in `herstel.mjs`.

Betaalde diensten zijn niet getest (account nodig); Mels kan een pagina zelf proberen.

## Hoe opnieuw te draaien
`venv-homr` en `venv-oemer` staan in de scratchpad van de vorige chat; opnieuw installeren kan met `python -m venv` en `pip install homr` of `pip install oemer` (python 3.12). oemer vraagt `onnxruntime==1.19.2` en `numpy>=2,<2.3`.

## Meting met automatisering/homr-vergelijk.mjs (5 november 2026)
Het script legt homr per maat naast de app (Audiveris plus herstelketen). Eerste poging gaf nul noten door een veldnaam (`type` in plaats van `soort`, PR 1383); hieronder de cijfers daarna.

| Stuk | Maten homr / app | Maten met gelijk notenaantal | Noten met gelijke toonhoogte |
|---|---|---|---|
| Galop | 100 / 104 | 51 | 83 |
| Renaissance | 74 / 78 | 12 | 9 |

Let op bij het lezen:
- De vergelijking legt maat 1 naast maat 1, maat 2 naast maat 2 enzovoort. Een rust van meerdere maten (de app telt die als meerdere maten, homr als één) verschuift alles erna. Bij Galop komt het verschil na maat 14 daardoor deels uit de uitlijning (maat 15, 26 en verder staan bij de app leeg) en bij Renaissance loopt de uitlijning vanaf maat 2 mis.
- Dit zegt dus nog niet welke motor gelijk heeft; alleen dat homr op Galop vaak hetzelfde ziet als de app (83 gelijke toonhoogtes).

## Conclusie
homr is niet duidelijk beter dan Audiveris en mist herhalingen, hokjes, letters en tekst. Voordat een koppeling zin heeft moet de vergelijking eerst de uitlijning corrigeren (maten van een meermaats-rust meetellen). Nieuw voorraadpunt: uitlijning in `homr-vergelijk.mjs` met `maatrust`-telling, daarna opnieuw meten.
