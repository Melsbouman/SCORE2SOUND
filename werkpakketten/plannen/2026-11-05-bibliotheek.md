# Bibliotheek: recent, eigen mappen, labels en voorbeeldstukken

## Idee
De Bibliotheek in de zijbalk wordt een mooi scherm in de stijl van de voorpagina met Recent, eigen mappen die je zelf een naam geeft (Orkest, Concert 14 mei), labels op stukken, zoeken, en een rij Ontdekken met bekende rechtenvrije stukken die met de editor gemaakt zijn.

## Keuzes
- Een map is een naam op het project (geen aparte objecten); labels zijn korte teksten (hoogstens 5 per stuk). Zo blijft de opslag simpel en werkt alles met het bestaande projectbestand.
- Ontdekken bevat stukken die we zelf opbouwen met `maakLeegStuk` en `schrijfNoot` (Frere Jacques, Ode an die Freude, Twinkle Twinkle, Jingle Bells; allemaal rechtenvrij). Stukken die uit een scan zijn herkend komen later, als er een rechtenvrije scan bij is.
- Geen nieuwe bibliotheken.

## Pakketten
| Nr | Titel | Bestanden | Uitvoerder | Hangt af van |
|---|---|---|---|---|
| 1 | Mappen en labels in de opslag | app/src/project/opslag.mjs, meta.mjs | Codex | |
| 2 | Route voor mappen en labels | app/src/server/projecten.mjs | Codex | 1 |
| 3 | Het bibliotheekscherm | app/public/js/views/projecten.js, bibliotheek.css | Codex | 2 |
| 4 | De zijbalk met mappen | index.html, shell.css, projecten.js | Codex | 3 |
| 5 | Voorbeeldstukken (Ontdekken) | app/src/model/voorbeeldstukken.mjs | Codex | |
| 6 | Documentatie | docs/gebruik.md | Hermes | 3 |
