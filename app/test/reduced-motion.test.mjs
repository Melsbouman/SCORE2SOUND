import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const bestanden = [
  "public/editor.css",
  "public/app.css",
  "public/welkom.css",
];

for (const bestand of bestanden) {
  test(`${bestand} houdt rekening met minder beweging`, async () => {
    const css = await readFile(new URL(`../${bestand}`, import.meta.url), "utf8");

    assert.match(css, /prefers-reduced-motion/);
  });
}
