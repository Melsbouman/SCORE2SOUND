# Agents: paneel voor Claude

Een mod voor Claude Code die de workflow met agents toont. Open het paneel met `/agents-paneel`. Van boven naar beneden:

- **Kop**: een pil met de algemene stand (Actie nodig, Bezig, Wachtrij staat stil of Rust) en vier tegels: bezig, wachtrij, vast en review.
- **Actie nodig**: vastgelopen en afgekeurde taken en PR's die op review wachten, met de reden die het runner-script bewaart (bijvoorbeeld "tegoed op" of "opdracht te lang").
- **Taken**: een lopende taak als stroom (Plan, Wachtrij, Uitvoeren, Controle, PR, Review) met wie hem uitvoert; taken in de wachtrij als één regel met de uitvoerder die hem krijgt.
- **Uitvoerders**: Claude in deze chat, actieve subagents, en elke uitvoerder (Claude-uitvoerder, Gemini, Hermes, Codex, Copilot) met model, stand, de laatste acht uitslagen als stippen en het aantal geslaagde taken.
- **Klaar** en **Modeltest**: standaard dicht.

Hij leest de statusbestanden en de geschiedenis die `automatisering/werkpakket.sh` schrijft naar `~/.aiflow-status/`, en vraagt GitHub (`gh`) en Hermes om de stand. In `hooks/register.tsx` staan bovenaan vaste paden voor de computer van Mels (`HERMES`, `GH`, `REPO`, `STATUSMAP`, `BENCHMAP`); pas die aan op een andere computer.
