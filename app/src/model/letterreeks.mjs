export function controleerLetterreeks(partituur) {
  const kopie = structuredClone(partituur)

  for (const partij of kopie.partijen ?? []) {
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

function verzamelLetters(waarde, letters) {
  if (!waarde || typeof waarde !== 'object') return

  if (waarde.type === 'letter') {
    letters.push(waarde)
  }

  for (const [naam, kind] of Object.entries(waarde)) {
    if (!['type', 'zekerheid', 'tekst'].includes(naam)) verzamelLetters(kind, letters)
  }
}
