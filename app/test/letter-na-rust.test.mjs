import test from 'node:test'
import assert from 'node:assert/strict'

import { controleerLetterreeks } from '../src/model/letterreeks.mjs'

test('verplaatst een repetitieletter uit een samengestelde rust naar de eerste maat erna', () => {
  const partituur = {
    partijen: [{
      maten: [
        { maatrust: 3, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [{ type: 'letter', tekst: 'D', zekerheid: 1 }] },
        { verborgen: true, aanwijzingen: [] },
        { aanwijzingen: [] },
        { aanwijzingen: [] },
      ],
    }],
  }

  const resultaat = controleerLetterreeks(partituur)

  assert.deepEqual(resultaat.partijen[0].maten[1].aanwijzingen, [])
  assert.deepEqual(resultaat.partijen[0].maten[3].aanwijzingen, [
    { type: 'letter', tekst: 'D', zekerheid: 1 },
  ])
  assert.deepEqual(partituur.partijen[0].maten[1].aanwijzingen, [
    { type: 'letter', tekst: 'D', zekerheid: 1 },
  ])
})
