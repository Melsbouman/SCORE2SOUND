import test from 'node:test'
import assert from 'node:assert/strict'

import { controleerLetterreeks } from '../src/model/letterreeks.mjs'

test('verlaagt de zekerheid van aangenomen letters buiten de reeks', () => {
  const partituur = {
    partijen: [{
      maten: [
        { aanwijzingen: [{ type: 'letter', tekst: 'A', zekerheid: 1 }] },
        { aanwijzingen: [{ type: 'letter', tekst: 'C', zekerheid: 0.5 }] },
        { aanwijzingen: [{ type: 'letter', tekst: 'C', zekerheid: 0.5 }] },
      ],
    }],
  }

  const resultaat = controleerLetterreeks(partituur)

  assert.deepEqual(
    resultaat.partijen[0].maten.map((maat) => maat.aanwijzingen[0].zekerheid),
    [1, 0.2, 0.5],
  )
  assert.notEqual(resultaat, partituur)
  assert.equal(partituur.partijen[0].maten[1].aanwijzingen[0].zekerheid, 0.5)
})
