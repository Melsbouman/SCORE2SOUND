# Een demo delen via internet

## Voorbereiden

Herken de projecten die je wilt laten zien en bewaar ze alvast op deze laptop. Sluit de laptop aan op de lader en zorg dat hij niet in slaapstand gaat. De laptop moet tijdens de demo aan en verbonden met internet blijven.

## Starten en delen

Start vanuit de hoofdmap van de repository:

```bash
bash scripts/demo-online.sh
```

Het script toont een uitnodigingscode. Zodra `cloudflared` is gestart, verschijnt de tijdelijke https-link in de uitvoer. Deel de link en de code met je bezoekers. De link is tijdelijk en werkt alleen zolang het script draait en de laptop aan blijft.

## Wat bezoekers zien

Bezoekers openen de app via de link. Ze kunnen alleen met de uitnodigingscode een account registreren.

## Stoppen

Druk in het terminalvenster op Ctrl-C. De app en de tunnel stoppen; de gegevens in `demo-data/` blijven op de laptop bewaard.
