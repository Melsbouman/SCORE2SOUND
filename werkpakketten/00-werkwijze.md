# Werkwijze voor elke agent (lees dit eerst)

Je voert één werkpakket uit voor SCORE2SOUND. De keuzes zijn al gemaakt door Claude en Mels en staan in je taak. **Je kiest niets zelf.** Staat iets niet in je taak, of klopt de taak niet met de code, stop dan en meld het in je rapport. Gok niet.

## Het project
SCORE2SOUND wordt nog opgezet. Zodra de opbouw vastligt, staan hier de mappen, wat waar hoort en welke onderdelen je niet aanraakt.

## Harde regels
1. **Werk alleen in de bestanden die je taak als jouw bestanden noemt.** Andere agents werken tegelijk in andere bestanden.
2. **Geen nieuwe dependencies**, tenzij de taak ze precies noemt. Geen sleutels, tokens, wachtwoorden of `.env`-bestanden.
3. **Tests:** pas bestaande tests niet aan en verwijder ze niet, tenzij de taak het vraagt. Faalt een test, dan klopt de code nog niet.
4. **Verwijder geen bestanden**, behalve als je taak dat expliciet zegt.
5. **Stijl:** volg de stijl, de naamgeving en de taal van de code eromheen. Nieuwe teksten en commentaar in het Nederlands, tenzij de taak iets anders zegt.
6. **Regeleinde:** laat het regeleinde aan het einde van elk bestand staan.

## Projectregels
Komen hier zodra de stack van SCORE2SOUND gekozen is (bijvoorbeeld: welke mappen frontend zijn, of CDN's mogen, hoe invoer wordt gecontroleerd).

## Verplichte zelfcontrole (alleen handmatig, zonder runner-script)
Draai vanuit de hoofdmap van de repo en zet de uitkomst in je rapport:
```bash
bash hermes/tests.sh pad1 pad2
node hermes/regels-controle.mjs --basis main --toegestaan "pad1,pad2"
```
Via het runner-script draai je niets: dat doet het script.

## Rapport (je laatste bericht)
- **Gewijzigde bestanden**, per bestand in één zin wat er veranderde.
- **Uitkomst van de controles** (letterlijk, alleen bij handmatig werk).
- **Wat je níet hebt gedaan of waar je twijfelt.** Liever een open vraag dan een gok.
