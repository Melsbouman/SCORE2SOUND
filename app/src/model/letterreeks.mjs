export function controleerLetterreeks(partituur) {
  const kopie = structuredClone(partituur)

  for (const partij of kopie.partijen ?? []) {
    verplaatsLettersNaMaatrust(partij.maten ?? [])

    const letters = []
    verzamelLetters(partij, letters)

    for (let index = 0; index < letters.length; index += 1) {
      const verwachteLetter = String.fromCharCode('A'.charCodeAt(0) + index)
      if (letters[index].zekerheid === 0.5 && letters[index].tekst !== verwachteLetter) {
        letters[index].zekerheid = 0.2
      }
    }
  }

  return kopie
}

function verplaatsLettersNaMaatrust(maten) {
  for (let index = 0; index < maten.length; index += 1) {
    const aantal = maten[index].maatrust
    const doelIndex = index + aantal
    if (!Number.isInteger(aantal) || aantal < 2 || doelIndex >= maten.length) continue

    for (let bronIndex = index; bronIndex < doelIndex; bronIndex += 1) {
      verplaatsLetters(maten[bronIndex], maten[doelIndex], 'aanwijzingen')
      verplaatsLetters(maten[bronIndex], maten[doelIndex], 'elementen')
    }
  }
}

function verplaatsLetters(bron, doel, naam) {
  if (!Array.isArray(bron[naam])) return

  const letters = bron[naam].filter((waarde) => waarde?.type === 'letter')
  if (letters.length === 0) return

  bron[naam] = bron[naam].filter((waarde) => waarde?.type !== 'letter')
  doel[naam] = [...(doel[naam] ?? []), ...letters]
}

function verzamelLetters(waarde, letters) {
  if (!waarde || typeof waarde !== 'object') return

  if (waarde.type === 'letter') {
    letters.push(waarde)
  }

  for (const [naam, kind] of Object.entries(waarde)) {
    if (!['type', 'zekerheid', 'tekst'].includes(naam)) verzamelLetters(kind, letters)
  }
}
