import test from "node:test";
import assert from "node:assert/strict";

import { maakMxl } from "../src/musicxml/mxl.mjs";
import { leesZip } from "../src/server/zip.mjs";

test("schrijft MusicXML in een .mxl met een verwijzend container-bestand", () => {
  const xml = '<?xml version="1.0"?><score-partwise version="4.0"></score-partwise>';
  const bestandsnaam = "muziek/stuk.musicxml";
  const bestanden = leesZip(Buffer.from(maakMxl(xml, bestandsnaam)));
  const container = bestanden.get("META-INF/container.xml").toString("utf8");

  assert.match(container, new RegExp(`<rootfile full-path="${bestandsnaam}" media-type="application/vnd\\.recordare\\.musicxml\\+xml"/>`));
  assert.equal(bestanden.get(bestandsnaam).toString("utf8"), xml);
});

test("gebruikt standaard partituur.musicxml als bestandsnaam", () => {
  const xml = "<score-partwise/>";
  const bestanden = leesZip(Buffer.from(maakMxl(xml)));

  assert.equal(bestanden.get("partituur.musicxml").toString("utf8"), xml);
  assert.match(bestanden.get("META-INF/container.xml").toString("utf8"), /full-path="partituur\.musicxml"/);
});
