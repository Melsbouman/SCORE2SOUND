import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { meetNauwkeurigheid } from "../app/src/controle/nauwkeurigheid.mjs";

const [, , herkendArgument, juistId] = process.argv;

if (!herkendArgument || !juistId) {
  console.error("Gebruik: node automatisering/meten.mjs <herkend.json of project-id> <project-id>");
  process.exitCode = 1;
} else {
  const projectPad = (id) => resolve("app", "projecten", `${id}.json`);
  const leesJson = async (pad) => JSON.parse(await readFile(pad, "utf8"));
  const herkendPad = herkendArgument.endsWith(".json")
    ? resolve(herkendArgument)
    : projectPad(herkendArgument);

  const [herkendBestand, juistProject] = await Promise.all([
    leesJson(herkendPad),
    leesJson(projectPad(juistId)),
  ]);
  const herkend = herkendBestand.partituur ?? herkendBestand;
  const resultaat = meetNauwkeurigheid(herkend, juistProject.partituur);

  console.log("Partij\tMaten goed\tNoten goed\tOntbrekend\tTe veel");
  for (const partij of resultaat.partijen) {
    const procentMaten = partij.maten === 0 ? 100 : Math.round((partij.matenGelijk / partij.maten) * 1000) / 10;
    const procentNoten = partij.noten === 0 ? 100 : Math.round((partij.notenGoed / partij.noten) * 1000) / 10;
    console.log(`${partij.naam}\t${partij.matenGelijk}/${partij.maten} (${procentMaten}%)\t${partij.notenGoed}/${partij.noten} (${procentNoten}%)\t${partij.ontbrekend}\t${partij.teveel}`);
  }
  console.log(`Totaal\t${resultaat.totaal.matenGelijk}/${resultaat.totaal.maten} (${resultaat.totaal.procentMaten}%)\t${resultaat.totaal.notenGoed}/${resultaat.totaal.noten} (${resultaat.totaal.procentNoten}%)`);
}
