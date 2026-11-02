// Export-knoppen voor MusicXML en MIDI.
// Wordt gebouwd in pakket 17 van werkpakketten/plannen/2026-10-29-score2sound-app.md.
const AUDIO_FOUTEN = {
  klankbank: 'Er is nog geen klankbank. Zet een General MIDI-klankbank in app/public/klankbank/standaard.sf3.',
  stil: 'Alle partijen staan uit in de mixer. Zet er minstens één aan.',
}

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

    const printKnop = document.createElement('button')
    printKnop.type = 'button'
    printKnop.className = 'knop'
    printKnop.textContent = 'PDF of afdrukken'

    const audioKnop = document.createElement('button')
    audioKnop.type = 'button'
    audioKnop.className = 'knop'
    audioKnop.textContent = 'Audio (WAV) downloaden'

    const status = document.createElement('p')
    status.className = 'zacht'
    status.setAttribute('role', 'status')

    printKnop.addEventListener('click', () => window.print())

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

    audioKnop.addEventListener('click', async () => {
      audioKnop.disabled = true
      status.textContent = 'Het geluid wordt gemaakt. Dit kan even duren.'
      try {
        const { maakWav } = await import('../audio-export.js')
        const naam = bestandsnaam(partituur, 'wav')
        download(await maakWav(partituur, app.stand.mixer), naam)
        status.textContent = `Gedownload: ${naam}`
      } catch (fout) {
        status.textContent = AUDIO_FOUTEN[fout.soort] ?? 'Exporteren lukte niet. Probeer het opnieuw.'
      }
      audioKnop.disabled = false
    })

    vlak.append(kop, musicXmlKnop, midiKnop, audioKnop, printKnop, status)
  })
}
