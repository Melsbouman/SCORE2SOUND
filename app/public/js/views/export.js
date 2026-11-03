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

    const mxlKnop = document.createElement('button')
    mxlKnop.type = 'button'
    mxlKnop.className = 'knop'
    mxlKnop.textContent = 'Gecomprimeerd (.mxl) downloaden'

    const partijenZipKnop = document.createElement('button')
    partijenZipKnop.type = 'button'
    partijenZipKnop.className = 'knop'
    partijenZipKnop.textContent = 'Alle partijen (zip)'

    const midiKnop = document.createElement('button')
    midiKnop.type = 'button'
    midiKnop.className = 'knop'
    midiKnop.textContent = 'MIDI downloaden'

    const printKnop = document.createElement('button')
    printKnop.type = 'button'
    printKnop.className = 'knop'
    printKnop.textContent = 'PDF downloaden'

    const audioKnop = document.createElement('button')
    audioKnop.type = 'button'
    audioKnop.className = 'knop'
    audioKnop.textContent = 'Audio (WAV) downloaden'

    const partijKeuze = document.createElement('select')
    const allePartijen = document.createElement('option')
    allePartijen.value = ''
    allePartijen.textContent = 'Alle partijen'
    partijKeuze.append(allePartijen)
    for (const partij of partituur.partijen) {
      const optie = document.createElement('option')
      optie.value = partij.id
      optie.textContent = partij.naam
      partijKeuze.append(optie)
    }

    const partijAudioKnop = document.createElement('button')
    partijAudioKnop.type = 'button'
    partijAudioKnop.className = 'knop'
    partijAudioKnop.textContent = 'WAV van deze partij'
    partijAudioKnop.disabled = true

    const status = document.createElement('p')
    status.className = 'zacht'
    status.setAttribute('role', 'status')

    const afdrukken = () => {
      const titel = document.title
      document.title = app.stand.partituur.titel?.trim() || 'SCORE2SOUND'
      window.addEventListener('afterprint', () => {
        document.title = titel
      }, { once: true })
      status.textContent = 'Kies in het venster Opslaan als PDF. Op elke pagina staat het watermerk SCORE2SOUND.'
      window.print()
    }

    printKnop.addEventListener('click', async () => {
      status.textContent = 'De pdf wordt gemaakt...'
      try {
        const [{ naarMusicXML }, { partijTitel }] = await Promise.all([
          import('/src/musicxml/schrijven.mjs'),
          import('/src/model/stemming.mjs'),
        ])
        printKnop.disabled = true
        printKnop.setAttribute('aria-busy', 'true')
        const antwoord = await fetch('/api/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            musicxml: naarMusicXML(app.stand.partituur, { zonderPartijnamen: app.stand.partituur.partijen.length === 1 }),
            titelblok: {
              titel: app.stand.partituur.titel,
              componist: app.stand.partituur.componist,
              arrangeur: app.stand.partituur.arrangeur,
              partij: app.stand.partituur.partijen.length === 1
                ? partijTitel(app.stand.partituur.partijen[0])
                : '',
            },
          }),
        })
        if (!antwoord.ok) {
          afdrukken()
          return
        }
        const naam = bestandsnaam(app.stand.partituur, 'pdf')
        download(await antwoord.blob(), naam)
        status.textContent = 'Gedownload: ' + naam
      } catch {
        afdrukken()
      } finally {
        printKnop.disabled = false
        printKnop.removeAttribute('aria-busy')
      }
    })

    partijKeuze.addEventListener('change', () => {
      partijAudioKnop.disabled = !partijKeuze.value
    })

    partijenZipKnop.addEventListener('click', async () => {
      partijenZipKnop.disabled = true
      status.textContent = 'De partijen worden geëxporteerd. Dit kan even duren.'
      try {
        const [{ partijUitnemen }, { naarMusicXML }, { maakZip }] = await Promise.all([
          import('/src/model/partijen.mjs'),
          import('/src/musicxml/schrijven.mjs'),
          import('/src/model/zipschrijven.mjs'),
        ])
        const bestanden = partituur.partijen.map((partij, index) => ({
          naam: `${String(index + 1).padStart(2, '0')} - ${partij.naam.replace(/[/:]/g, '-')}.musicxml`,
          inhoud: naarMusicXML(partijUitnemen(partituur, partij.id)),
        }))
        const blob = new Blob([maakZip(bestanden)], { type: 'application/zip' })
        const naam = bestandsnaam({ titel: `${partituur.titel?.trim() || 'partituur'} - partijen` }, 'zip')
        download(blob, naam)
        status.textContent = `Gedownload: ${naam}`
      } catch {
        status.textContent = 'Exporteren lukte niet. Probeer het opnieuw.'
      }
      partijenZipKnop.disabled = false
    })

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

    mxlKnop.addEventListener('click', async () => {
      try {
        const [{ naarMusicXML }, { maakMxl }] = await Promise.all([
          import('/src/musicxml/schrijven.mjs'),
          import('/src/musicxml/mxl.mjs'),
        ])
        const blob = new Blob([maakMxl(naarMusicXML(partituur))], {
          type: 'application/vnd.recordare.musicxml'
        })
        const naam = bestandsnaam(partituur, 'mxl')
        download(blob, naam)
        status.textContent = 'Gedownload: ' + naam
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

    partijAudioKnop.addEventListener('click', async () => {
      const partij = partituur.partijen.find((item) => item.id === partijKeuze.value)
      if (!partij) return
      partijAudioKnop.disabled = true
      status.textContent = 'Het geluid wordt gemaakt. Dit kan even duren.'
      try {
        const { maakWavVoorPartij } = await import('../audio-export.js')
        const titel = partituur.titel?.trim() || 'partituur'
        const naam = bestandsnaam({ titel: `${titel} - ${partij.naam}` }, 'wav')
        download(await maakWavVoorPartij(partituur, partij.id), naam)
        status.textContent = `Gedownload: ${naam}`
      } catch (fout) {
        status.textContent = AUDIO_FOUTEN[fout.soort] ?? 'Exporteren lukte niet. Probeer het opnieuw.'
      }
      partijAudioKnop.disabled = false
    })

    vlak.append(kop, musicXmlKnop, mxlKnop, partijenZipKnop, midiKnop, audioKnop, partijKeuze, partijAudioKnop, printKnop, status)
  })
}
