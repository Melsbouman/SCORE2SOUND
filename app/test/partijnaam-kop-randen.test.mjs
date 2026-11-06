import test from 'node:test';
import assert from 'node:assert/strict';
import { partijNaamUitKop } from '../src/model/partijnaam.mjs';

test('partijNaamUitKop returns values for these headings', () => {
  const testCases = [
    { heading: 'Bb Solo Cornet 3, 4' },
    { heading: '2nd Cornet in Bb' },
    { heading: 'Eb Bass' },
    { heading: 'Solo Euphonium (Bb)' },
  ];

  for (const { heading } of testCases) {
    const result = partijNaamUitKop(heading);
    console.log(`${heading} → ${result}`);
    assert.ok(result !== null && result !== undefined && result !== '', `Expected non-empty result for heading '${heading}', got ${result}`);
  }
});