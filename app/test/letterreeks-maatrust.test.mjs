import test from 'node:test'
import assert from 'node:assert/strict'

import { controleerLetterreeks } from '../src/model/letterreeks.mjs'

function maakPartituur(laatsteLetter) {
  return {
    partijen: [{
      maten: [
        { aanwijzingen: [{ type: 'letter', tekst: 'A', zekerheid: 1 }] },
        { aanwijzingen: [{ type: 'letter', tekst: 'B', zekerheid: 0.5 }] },
        { maatrust: 8, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { verborgen: true, aanwijzingen: [] },
        { aanwijzingen: [{ type: 'letter', tekst: laatsteLetter, zekerheid: 0.5 }] },
      ],
    }],
  }
}

test('laat A, B en C staan met een maatrust tussen B en C', () => {
  const resultaat = controleerLetterreeks(maakPartituur('C'))

  assert.equal(resultaat.partijen[0].maten[10].aanwijzingen[0].zekerheid, 0.5)
})

test('verlaagt de zekerheid van D na een maatrust tussen B en D', () => {
  const resultaat = controleerLetterreeks(maakPartituur('D'))

  assert.equal(resultaat.partijen[0].maten[10].aanwijzingen[0].zekerheid, 0.2)
})
