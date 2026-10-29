// Export-knoppen voor MusicXML en MIDI.
// Wordt gebouwd in pakket 17 van werkpakketten/plannen/2026-10-29-score2sound-app.md.
function bestandsnaam(partituur, extensie) {
  const titel = partituur.titel?.trim() || 'partituur'
  return `${titel.replace(/[^\p{L}\p{N} -]/gu, '-')}.${extensie}`
}

function download(blob, naam) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = naam
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function start(app) {
  const vlak = document.getElementById('export')

  app.op('partituur', (partituur) => {
    vlak.replaceChildren()
    if (!partituur) return

    const kop = document.createElement('h2')
    kop.textContent = 'Exporteren'

    const musicXmlKnop = document.createElement('button')
    musicXmlKnop.type = 'button'
    musicXmlKnop.className = 'knop'
    musicXmlKnop.textContent = 'MusicXML downloaden'

    const midiKnop = document.createElement('button')
    midiKnop.type = 'button'
    midiKnop.className = 'knop'
    midiKnop.textContent = 'MIDI downloaden'

    const status = document.createElement('p')
    status.className = 'zacht'
    status.setAttribute('role', 'status')

    musicXmlKnop.addEventListener('click', async () => {
      try {
        const { naarMusicXML } = await import('/src/musicxml/schrijven.mjs')
        const blob = new Blob([naarMusicXML(partituur)], {
          type: 'application/vnd.recordare.musicxml+xml'
        })
        const naam = bestandsnaam(partituur, 'musicxml')
        download(blob, naam)
        status.textContent = `Gedownload: ${naam}`
      } catch {
        status.textContent = 'Exporteren lukte niet. Probeer het opnieuw.'
      }
    })

    midiKnop.addEventListener('click', async () => {
      try {
        const { schrijfMidi } = await import('/src/midi/schrijven.mjs')
        const mixer = app.stand.mixer
        const opties = mixer ? {
          volume: Object.fromEntries(
            Object.entries(mixer).map(([id, waarde]) => [id, waarde.volume ?? waarde])
          )
        } : undefined
        const blob = new Blob([schrijfMidi(partituur, opties)], { type: 'audio/midi' })
        const naam = bestandsnaam(partituur, 'mid')
        download(blob, naam)
        status.textContent = `Gedownload: ${naam}`
      } catch {
        status.textContent = 'Exporteren lukte niet. Probeer het opnieuw.'
      }
    })

    vlak.append(kop, musicXmlKnop, midiKnop, status)
  })
}
