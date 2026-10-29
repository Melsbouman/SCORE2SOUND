import type { Register } from 'claude-code'

import type { Bench, ClaudeStatus, Extern, Geschied, Klaar, Lokaal, Runner, Sub, Taak } from '../types'

// Een eigen naam, zodat dit paneel niet botst met andere mods die een paneel 'agents' openen.
const PANE = 'score2sound-agents'
const HERMES = 'C:/Users/mels1/AppData/Local/hermes/bin/hermes.exe'
const GH = 'C:/Program Files/GitHub CLI/gh.exe'
const REPO = 'Melsbouman/SCORE2SOUND'
// Map waar het runner-script zijn statusbestanden en de geschiedenis neerzet.
const STATUSMAP = 'C:/Users/mels1/.aiflow-status'
// Map met de uitslag van een modeltest (resultaten.jsonl, plus een map per lopende run). Bestaat die niet, dan toont het paneel geen modeltest.
const BENCHMAP = 'C:/Users/mels1/.aiflow-status/modeltest'
const LOKAAL_MS = 5000
const EXTERN_MS = 30000
// Een agent die langer dan dit niets heeft laten weten, geldt als mogelijk vastgelopen.
const VERLOOP_MS = 15 * 60 * 1000

// Fase per label op een issue: kleur en korte tekst.
const FASEN: Record<string, { tekst: string; kleur: string }> = {
  'agent-ready': { tekst: 'in wachtrij', kleur: '#8A8A85' },
  'agent-bezig': { tekst: 'wordt uitgevoerd', kleur: '#E0A030' },
  'agent-review': { tekst: 'wacht op Claude', kleur: '#4C8DF6' },
  'agent-terug': { tekst: 'terug naar de uitvoerder', kleur: '#C16BD9' },
  'agent-vast': { tekst: 'vastgelopen', kleur: '#E5534B' },
}
const VOLGORDE = ['agent-vast', 'agent-terug', 'agent-bezig', 'agent-review', 'agent-ready']

// De stappen van de workflow, van links naar rechts.
const STAPPEN = ['Plan', 'Wachtrij', 'Uitvoeren', 'Controle', 'PR', 'Review']

type Uitrusting = 'bril' | 'helm' | 'zwaar' | 'jury' | 'schild' | 'baret' | 'geen'
type Kaart = {
  naam: string
  rol: string
  kleur: string
  uitrusting: Uitrusting
  actief: boolean
  status: string
  taak: string
  voortgang: number | null
  detail: string
  staat?: 'wacht' | 'bezig' | 'klaar' | 'vast'
}
// Een taak als stroom door de workflow.
type Pijp = {
  nummer: number
  titel: string
  huidig: number
  staat: 'wacht' | 'bezig' | 'terug' | 'vast' | 'review' | 'klaar'
  statusTekst: string
  kleur: string
  uitvoerder: string
  model: string
  seconden: number
  pr: number
  exact: boolean
  ontwerp: boolean
  bestanden: string[]
  tokensIn: number
  tokensUit: number
}

const KLEI = '#D97757'
const INKT = '#1F1E1D'
const GROEN = '#3FB68B'
const LETTERTYPE = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

// Het paneel weigert stuurtekens (zoals kleurcodes uit de uitvoer van een programma).
const STUURTEKENS = new RegExp('[' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + String.fromCharCode(127) + '-' + String.fromCharCode(159) + ']', 'g')
const schoon = (t: string) => t.replace(STUURTEKENS, ' ').trim()
const NIEUWE_REGEL = String.fromCharCode(10)

const xml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const tekstBreedte = (t: string, maat: number) => [...t].length * maat * 0.56
const pas = (t: string, maat: number, max: number) => {
  if (tekstBreedte(t, maat) <= max) return t
  const letters = Math.max(1, Math.floor(max / (maat * 0.56)) - 1)
  return [...t].slice(0, letters).join('') + '…'
}

const duurTekst = (ms: number) => {
  if (!Number.isFinite(ms) || ms < 0) return ''
  const min = Math.floor(ms / 60000)
  return min < 1 ? `${Math.floor(ms / 1000)} s` : `${min} min`
}

const json = (tekst: string) => {
  try {
    return JSON.parse(tekst)
  } catch {
    return null
  }
}

// Tokens leesbaar: 842, 12,4k, 1,2m.
const tok = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '0'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.', ',')}m`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 100000 ? 0 : 1).replace('.', ',')}k`
  return String(n)
}

const uitvoerderNaam = (u: string) => (u === 'codex' ? 'Codex-programma' : u === 'copilot' ? 'Copilot-programma' : u === 'hermes' ? 'Hermes' : u)
const uitvoerderKleur = (u: string) => (u === 'codex' ? '#2E9E83' : u === 'hermes' ? '#9B7BE0' : '#5B8DEF')

// Kleuren voor licht en donker; het paneel volgt het thema van de app.
const STIJL = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tegel{fill:#f4f3f0}.lijn{stroke:#d7d6d2}.leeg{fill:none;stroke:#c3c2be}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.k{fill:#2c2c2b}.ln{stroke:#333331}.tegel{fill:#262625}.lijn{stroke:#3a3a38}.leeg{fill:none;stroke:#555552}}
</style>`
const svg = (b: number, h: number, inhoud: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${h}" viewBox="0 0 ${b} ${h}">${STIJL}${inhoud}</svg>`

// Een pixelkrab op een raster van 20 bij 16, met per agent andere uitrusting.
const krab = (x: number, y: number, uitrusting: Uitrusting, gedimd: boolean) => {
  const u = 1.7
  const r = (px: number, py: number, w: number, h: number, kleur: string) =>
    `<rect x="${(x + px * u).toFixed(1)}" y="${(y + py * u).toFixed(1)}" width="${(w * u).toFixed(1)}" height="${(h * u).toFixed(1)}" fill="${kleur}"/>`
  const zwaar = uitrusting === 'zwaar'
  let d = ''
  d += r(4, 6, 12, 7, KLEI)
  d += zwaar ? r(0, 6, 4, 5, KLEI) + r(16, 6, 4, 5, KLEI) : r(1, 8, 3, 3, KLEI) + r(16, 8, 3, 3, KLEI)
  d += r(6, 8, 2, 2, INKT) + r(12, 8, 2, 2, INKT)
  d += [5, 8, 11, 14].map(p => r(p, 13, 2, 3, KLEI)).join('')
  if (uitrusting === 'bril') {
    d += `<rect x="${(x + 5 * u).toFixed(1)}" y="${(y + 7 * u).toFixed(1)}" width="${(4 * u).toFixed(1)}" height="${(4 * u).toFixed(1)}" fill="none" stroke="${INKT}" stroke-width="1"/>`
    d += `<rect x="${(x + 11 * u).toFixed(1)}" y="${(y + 7 * u).toFixed(1)}" width="${(4 * u).toFixed(1)}" height="${(4 * u).toFixed(1)}" fill="none" stroke="${INKT}" stroke-width="1"/>`
  }
  if (uitrusting === 'helm') d += r(5, 3, 10, 3, '#F2C14E') + r(4, 5, 12, 1, '#F2C14E')
  if (zwaar) d += r(4, 2, 12, 4, '#E07A2F') + r(3, 5, 14, 1, '#E07A2F')
  if (uitrusting === 'jury') d += r(5, 3, 10, 3, '#9AA0A6') + r(8, 13, 4, 1, '#FFFFFF')
  if (uitrusting === 'schild') d += r(0, 7, 3, 6, '#4C8DF6') + r(1, 8, 1, 4, '#CFE0FF')
  if (uitrusting === 'baret') d += r(5, 3, 10, 2, '#D9534F') + r(8, 2, 4, 1, '#D9534F') + r(13, 4, 4, 1, '#D9534F')
  return `<g opacity="${gedimd ? 0.45 : 1}">${d}</g>`
}

const kopSvg = (b: number, bezig: number, totaal: number, taken: Taak[]) => {
  const gap = 6
  const tw = (b - gap * 2) / 3
  const druk = bezig > 0
  const pillTekst = druk ? 'Busy' : 'Sleeping'
  const pillKleur = druk ? GROEN : '#8A8A85'
  const pillB = 22 + tekstBreedte(pillTekst, 12) + 6
  const tegel = (i: number, k: string, v: string, kleur?: string) =>
    `<rect class="tegel" x="${i * (tw + gap)}" y="34" width="${tw}" height="46" rx="8"/>
<text class="s" x="${i * (tw + gap) + 11}" y="51" font-family="${LETTERTYPE}" font-size="11">${xml(k)}</text>
<text ${kleur ? `fill="${kleur}"` : 'class="t"'} x="${i * (tw + gap) + 11}" y="71" font-family="${LETTERTYPE}" font-size="16" font-weight="600">${xml(pas(v, 16, tw - 20))}</text>`
  const aantal = (f: string) => taken.filter(t => t.fase === f).length
  return svg(
    b,
    90,
    `<text class="t" x="1" y="19" font-family="${LETTERTYPE}" font-size="17" font-weight="700">SCORE2SOUND</text>
<rect x="${b - pillB}" y="3" width="${pillB}" height="22" rx="11" fill="${pillKleur}" opacity="0.16"/>
<circle cx="${b - pillB + 12}" cy="14" r="4" fill="${pillKleur}"/>
<text fill="${pillKleur}" x="${b - pillB + 22}" y="18" font-family="${LETTERTYPE}" font-size="12" font-weight="600">${pillTekst}</text>
${tegel(0, 'Aan het werk', `${bezig} van ${totaal}`, druk ? GROEN : undefined)}
${tegel(1, 'Taken open', `${taken.length}`)}
${tegel(2, 'Wacht op review', `${aantal('agent-review')}`, aantal('agent-review') > 0 ? '#4C8DF6' : undefined)}`,
  )
}

// Eén taak als stroom: Plan, Wachtrij, Uitvoeren, Controle, PR, Review. Onder de stap staat wie het doet.
const pijpSvg = (b: number, p: Pijp) => {
  const marge = 22
  const stap = (b - marge * 2) / (STAPPEN.length - 1)
  const y = 42
  const klaar = p.staat === 'klaar'
  const knopen = STAPPEN.map((naam, i) => {
    const x = marge + i * stap
    const gedaan = klaar || i < p.huidig
    const nu = !klaar && i === p.huidig
    const lijnKleur = gedaan ? GROEN : undefined
    const lijn =
      i < STAPPEN.length - 1
        ? `<line ${lijnKleur ? `stroke="${lijnKleur}"` : 'class="lijn"'} stroke-width="2" x1="${x + 8}" y1="${y}" x2="${x + stap - 8}" y2="${y}"/>`
        : ''
    let knoop = ''
    if (gedaan) {
      knoop = `<circle cx="${x}" cy="${y}" r="7" fill="${GROEN}"/><path d="M${x - 3} ${y} l2.4 2.6 l4.2 -5" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
    } else if (nu) {
      knoop = `<circle cx="${x}" cy="${y}" r="10" fill="${p.kleur}" opacity="0.22"/><circle cx="${x}" cy="${y}" r="6.5" fill="${p.kleur}"/>`
    } else {
      knoop = `<circle class="leeg" cx="${x}" cy="${y}" r="6.5" stroke-width="1.6"/>`
    }
    const label = `<text ${nu ? `fill="${p.kleur}"` : 'class="s"'} x="${x}" y="64" text-anchor="middle" font-family="${LETTERTYPE}" font-size="10" ${nu ? 'font-weight="600"' : ''}>${xml(naam)}</text>`
    return lijn + knoop + label
  }).join('')

  // Wie doet welke stap.
  const onder = (i: number, tekst: string, kleur?: string) =>
    tekst
      ? `<text ${kleur ? `fill="${kleur}"` : 'class="s"'} x="${marge + i * stap}" y="77" text-anchor="middle" font-family="${LETTERTYPE}" font-size="10">${xml(pas(tekst, 10, stap * 2.1))}</text>`
      : ''
  const uitv = p.uitvoerder ? `${uitvoerderNaam(p.uitvoerder)}${p.model && p.model !== 'auto' ? ', ' + (p.model.split('/').pop() ?? p.model) : ''}` : 'nog niet gekozen'
  const sub =
    onder(0, 'Claude') +
    onder(2, uitv, p.uitvoerder ? '#5B8DEF' : undefined) +
    onder(4, p.pr > 0 ? `#${p.pr}${p.exact ? ' exact' : ''}` : '', p.exact ? GROEN : undefined) +
    onder(5, 'Claude')
  const rechts = klaar ? `klaar${p.seconden ? `, ${p.seconden} s` : ''}` : p.statusTekst
  return svg(
    b,
    90,
    `<text class="t" x="2" y="16" font-family="${LETTERTYPE}" font-size="13" font-weight="600">${xml(pas(`#${p.nummer} ${p.titel}`, 13, b - 130))}</text>
<text ${klaar ? `fill="${GROEN}"` : `fill="${p.kleur}"`} x="${b - 2}" y="16" text-anchor="end" font-family="${LETTERTYPE}" font-size="11">${xml(pas(rechts, 11, 128))}</text>
${knopen}${sub}
<line class="ln" x1="0" y1="89.5" x2="${b}" y2="89.5"/>`,
  )
}

// Een rij per getest model: naam, prijsklasse en per taak tijd, kosten en of het goed was.
const benchSvg = (b: number, model: string, rijen: Bench[], bezig: string) => {
  const kort = model.split('/').pop() ?? model
  const gratis = model.endsWith(':free')
  const klaar = rijen.length > 0 && rijen.every(r => r.ok)
  const kleur = bezig ? '#E0A030' : rijen.length === 0 ? '#8A8A85' : klaar ? GROEN : '#E5534B'
  const delen = rijen.map(r => `${r.taak}: ${r.seconden} s, ${r.kosten === 0 ? 'gratis' : '$' + r.kosten.toFixed(3)}, ${r.ok ? 'goed' : 'niet goed'}${r.detail ? ' (' + r.detail + ')' : ''}`)
  if (bezig) delen.push(`taak ${bezig} bezig...`)
  const regel = delen.join('   ')
  return svg(
    b,
    50,
    `<circle cx="8" cy="12" r="4" fill="${kleur}"/>
<text class="t" x="20" y="16" font-family="${LETTERTYPE}" font-size="13" font-weight="600">${xml(pas(kort, 13, b - 110))}</text>
<text class="s" x="${b - 2}" y="16" text-anchor="end" font-family="${LETTERTYPE}" font-size="11">${gratis ? 'gratis model' : 'betaald model'}</text>
<text class="s" x="20" y="34" font-family="${LETTERTYPE}" font-size="11">${xml(pas(regel, 11, b - 24))}</text>
<line class="ln" x1="0" y1="49.5" x2="${b}" y2="49.5"/>`,
  )
}

const kaartSvg = (b: number, k: Kaart) => {
  const links = 46
  const tekstB = b - links - 14
  const klaar = k.staat === 'klaar'
  const vast = k.staat === 'vast'
  const wacht = k.staat === 'wacht'
  const vul = klaar ? tekstB : k.actief && k.voortgang !== null ? Math.round(tekstB * Math.max(0.03, Math.min(1, k.voortgang))) : vast ? Math.round(tekstB * 0.4) : 0
  const onbekend = k.actief && k.voortgang === null && !klaar
  const balkKleur = vast ? '#E5534B' : klaar ? GROEN : k.kleur
  const statusTekst = pas(k.status, 11, tekstB - 90)
  const vinkX = links + tekstB - tekstBreedte(statusTekst, 11) - 12
  const vink = klaar
    ? `<circle cx="${vinkX}" cy="14" r="6" fill="${GROEN}"/><path d="M${vinkX - 2.6} 14 l1.8 2 l3.4 -4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
    : ''
  return svg(
    b,
    70,
    `${krab(2, 14, k.uitrusting, wacht || (!k.actief && !klaar && !vast))}
<text class="t" x="${links}" y="18" font-family="${LETTERTYPE}" font-size="13" font-weight="600" opacity="${wacht ? 0.6 : 1}">${xml(k.naam)}</text>
<text x="${links}" y="34" font-family="${LETTERTYPE}" font-size="11"><tspan fill="${k.kleur}">${xml(k.rol)}</tspan><tspan class="s">  ${xml(pas(k.detail, 11, tekstB - 90))}</tspan></text>
${vink}<text ${vast ? 'fill="#E5534B"' : 'class="s"'} x="${links + tekstB}" y="18" text-anchor="end" font-family="${LETTERTYPE}" font-size="11">${xml(statusTekst)}</text>
<text class="s" x="${links}" y="50" font-family="${LETTERTYPE}" font-size="11">${xml(pas(k.taak, 11, tekstB))}</text>
<rect class="k" x="${links}" y="57" width="${tekstB}" height="4" rx="2"/>
${vul > 0 ? `<rect x="${links}" y="57" width="${vul}" height="4" rx="2" fill="${balkKleur}"/>` : ''}
${onbekend ? `<rect x="${links}" y="57" width="${tekstB}" height="4" rx="2" fill="${k.kleur}" opacity="0.25"/>` : ''}
<line class="ln" x1="0" y1="69.5" x2="${b}" y2="69.5"/>`,
  )
}

// Pure functie: maakt van open en recent afgeronde taken een stroom door de workflow.
function pijplijnen(nu: number, extern: Extern | null, lokaal: Lokaal | null): Pijp[] {
  const runners = lokaal?.runners ?? []
  const historie = lokaal?.geschiedenis ?? []
  const laatsteVoor = (nummer: number): Geschied | undefined => [...historie].reverse().find(h => h.issue === nummer)
  const lijst: Pijp[] = []

  for (const t of extern?.taken ?? []) {
    const f = FASEN[t.fase]
    // Wie voert deze taak nu uit? Eerst de lopende runner, anders de laatste keer uit de geschiedenis.
    const run = runners.find(r => r.status === 'bezig' && r.taak.startsWith(`#${t.nummer} `) && nu - r.bijgewerkt * 1000 <= VERLOOP_MS)
    const hist = laatsteVoor(t.nummer)
    const uitvoerder = run ? run.agent : hist ? hist.uitvoerder : ''
    const model = run ? run.model : hist ? hist.model : ''
    let huidig = 1
    let staat: Pijp['staat'] = 'wacht'
    if (t.fase === 'agent-bezig') {
      staat = 'bezig'
      const fase = run?.fase ?? ''
      huidig = fase.startsWith('controleren') ? 3 : fase.startsWith('pr') ? 4 : 2
    } else if (t.fase === 'agent-review') {
      staat = 'review'
      huidig = 5
    } else if (t.fase === 'agent-terug') {
      staat = 'terug'
      huidig = 2
    } else if (t.fase === 'agent-vast') {
      staat = 'vast'
      huidig = hist ? 3 : 2
    }
    const extra = staat === 'bezig' && run?.fase ? `${run.fase}, ${duurTekst(nu - run.start * 1000)}` : f.tekst
    lijst.push({
      nummer: t.nummer,
      titel: t.titel,
      huidig,
      staat,
      statusTekst: extra,
      kleur: f.kleur,
      uitvoerder,
      model,
      seconden: hist ? hist.seconden : 0,
      pr: t.pr,
      exact: t.exact,
      ontwerp: t.bestanden.some(f => /[.](css|html|svg|webp|png)$/.test(f)),
      bestanden: t.bestanden,
      tokensIn: hist ? hist.tokensIn : 0,
      tokensUit: hist ? hist.tokensUit : 0,
    })
  }

  // Recent afgerond (gemerged): alle stappen groen.
  for (const k of (extern?.klaar ?? []).slice(0, 3)) {
    const hist = laatsteVoor(k.nummer)
    lijst.push({
      nummer: k.nummer,
      titel: k.titel,
      huidig: STAPPEN.length,
      staat: 'klaar',
      statusTekst: 'klaar',
      kleur: GROEN,
      uitvoerder: hist ? hist.uitvoerder : '',
      model: hist ? hist.model : '',
      seconden: hist ? hist.seconden : 0,
      pr: 0,
      exact: false,
      ontwerp: false,
      bestanden: [],
      tokensIn: hist ? hist.tokensIn : 0,
      tokensUit: hist ? hist.tokensUit : 0,
    })
  }
  return lijst
}

// Pure functie: wie werkt aan deze taak en met welke rol? Planner, Builder, Poortwachter en Judge.
function rollenVoor(p: Pijp, nu: number, lokaal: Lokaal | null): Kaart[] {
  const run = (lokaal?.runners ?? []).find(r => r.status === 'bezig' && r.taak.startsWith(`#${p.nummer} `) && nu - r.bijgewerkt * 1000 <= VERLOOP_MS)
  const gestart = (stap: number): Kaart['staat'] => (p.staat === 'vast' && p.huidig === stap ? 'vast' : p.huidig > stap ? 'klaar' : p.huidig === stap && p.staat !== 'wacht' ? 'bezig' : 'wacht')
  const uitv = p.uitvoerder
  const builderNaam = uitv ? uitvoerderNaam(uitv) : 'nog niet gekozen'
  const builderModel = uitv ? (p.model && p.model !== 'auto' ? p.model.split('/').pop() ?? p.model : 'automatisch model') : 'de runner kiest bij de start'
  const builderStaat = gestart(2)
  const poortStaat = gestart(3)
  const judgeStaat: Kaart['staat'] = p.staat === 'klaar' ? 'klaar' : p.huidig === 5 ? 'bezig' : 'wacht'
  const kaartenLijst: Kaart[] = [
    {
      naam: 'Claude',
      rol: 'Planner',
      kleur: KLEI,
      uitrusting: 'bril',
      actief: false,
      staat: 'klaar',
      status: 'klaar',
      taak: 'schreef de taak en koos de bestanden',
      voortgang: null,
      detail: p.bestanden.length > 0 ? `${p.bestanden.length} bestand${p.bestanden.length === 1 ? '' : 'en'}` : '',
    },
    {
      naam: builderNaam,
      rol: p.ontwerp ? 'Builder en designer' : 'Builder',
      kleur: p.ontwerp ? '#C16BD9' : uitvoerderKleur(uitv),
      uitrusting: p.ontwerp ? 'baret' : 'helm',
      actief: builderStaat === 'bezig',
      staat: builderStaat,
      status: builderStaat === 'bezig' ? `${run?.fase || 'bezig'} ${run ? duurTekst(nu - run.start * 1000) : ''}`.trim() : builderStaat === 'klaar' ? (p.seconden ? `klaar, ${p.seconden} s` : 'klaar') : builderStaat === 'vast' ? 'vastgelopen' : 'wacht',
      taak: p.tokensIn + p.tokensUit > 0 ? `${tok(p.tokensIn)} tokens erin, ${tok(p.tokensUit)} eruit` : p.ontwerp ? 'bewerkt de pagina en de stijl' : 'bewerkt de bestanden uit de taak',
      voortgang: builderStaat === 'bezig' ? run?.voortgang ?? 0.3 : null,
      detail: builderModel,
    },
    {
      naam: 'Runner-script',
      rol: 'Poortwachter',
      kleur: '#E0A030',
      uitrusting: 'schild',
      actief: poortStaat === 'bezig',
      staat: poortStaat,
      status: poortStaat === 'bezig' ? 'controleert' : poortStaat === 'klaar' ? 'geslaagd' : poortStaat === 'vast' ? 'afgekeurd' : 'wacht',
      taak: 'bestanden, regels en tests',
      voortgang: poortStaat === 'bezig' ? run?.voortgang ?? 0.65 : null,
      detail: p.exact ? 'exact zoals verwacht' : 'regelcontrole en tests',
    },
    {
      naam: 'Claude',
      rol: 'Judge',
      kleur: KLEI,
      uitrusting: 'jury',
      actief: judgeStaat === 'bezig',
      staat: judgeStaat,
      status: judgeStaat === 'klaar' ? 'gemerged' : judgeStaat === 'bezig' ? 'wacht op oordeel' : 'wacht',
      taak: p.pr > 0 ? `PR #${p.pr}: bekijkt de diff en merget` : 'bekijkt de diff en merget',
      voortgang: null,
      detail: 'laatste woord',
    },
  ]
  return kaartenLijst
}

// Totaal van een uitvoerder over alle taken in de geschiedenis, bijvoorbeeld "4 taken, 312k tokens erin, 4,2k eruit".
function totaalTekst(historie: Geschied[], uitvoerder: string): string {
  const van = historie.filter(h => h.uitvoerder === uitvoerder && h.tokensIn + h.tokensUit > 0)
  if (van.length === 0) return ''
  const erin = van.reduce((som, h) => som + h.tokensIn, 0)
  const eruit = van.reduce((som, h) => som + h.tokensUit, 0)
  return `${van.length} ${van.length === 1 ? 'taak' : 'taken'}: ${tok(erin)} tokens erin, ${tok(eruit)} eruit`
}

// Pure functie: maakt de kaarten voor iedereen die kan werken.
function kaarten(nu: number, claude: ClaudeStatus | null, lokaal: Lokaal | null, extern: Extern | null): Kaart[] {
  const lijst: Kaart[] = []

  // Claude zelf, in deze sessie.
  const claudeActief = !!claude && claude.bezig && nu - claude.bijgewerkt < VERLOOP_MS
  lijst.push({
    naam: 'Claude',
    rol: 'Planner en controleur',
    kleur: '#D97757',
    uitrusting: 'geen',
    actief: claudeActief,
    status: claudeActief && claude ? `bezig ${duurTekst(nu - claude.sinds)}` : 'wacht op jou',
    taak: claudeActief && claude ? `${claude.tool} | ${claude.aantal} acties | ${tok(claude.tokensIn)} tokens erin, ${tok(claude.tokensUit)} eruit` : claude && claude.tokensIn > 0 ? `sessie: ${tok(claude.tokensIn)} tokens erin, ${tok(claude.tokensUit)} eruit` : '',
    voortgang: null,
    detail: 'deze sessie',
  })

  // Subagents van Claude.
  for (const s of lokaal?.subs ?? []) {
    const actief = s.status === 'running' || s.status === 'waiting' || s.status === 'pending'
    if (!actief) continue
    lijst.push({
      naam: 'Subagent',
      rol: 'Claude',
      kleur: GROEN,
      uitrusting: 'helm',
      actief: true,
      status: s.status === 'waiting' ? 'wacht' : 'bezig',
      taak: s.naam,
      voortgang: null,
      detail: '',
    })
  }

  // Het runner-script en de agent die het aanstuurt (Codex-programma, Copilot-programma of Hermes).
  // Een agent is een agent, ook als er meerdere taken tegelijk lopen: een kaart per soort uitvoerder.
  const perAgent = new Map<string, Runner[]>()
  for (const r of lokaal?.runners ?? []) perAgent.set(r.agent, [...(perAgent.get(r.agent) ?? []), r])
  for (const [agent, runs] of perAgent) {
    const lopend = runs.filter(r => r.status === 'bezig' && nu - r.bijgewerkt * 1000 <= VERLOOP_MS)
    const vast = runs.filter(r => r.status === 'bezig' && nu - r.bijgewerkt * 1000 > VERLOOP_MS)
    const nieuwste = [...runs].sort((x, y) => y.bijgewerkt - x.bijgewerkt)[0]
    const r = lopend[0] ?? nieuwste
    const viaHermes = agent === 'hermes'
    const meerdere = lopend.length > 1
    lijst.push({
      naam: viaHermes ? 'Hermes-uitvoerder' : uitvoerderNaam(agent),
      rol: viaHermes ? 'Uitvoerder via Hermes' : 'Uitvoerder',
      kleur: uitvoerderKleur(agent),
      uitrusting: viaHermes ? 'jury' : agent === 'codex' ? 'zwaar' : 'bril',
      actief: lopend.length > 0,
      status:
        lopend.length > 0
          ? meerdere
            ? `${lopend.length} taken tegelijk`
            : `${r.fase || 'bezig'} ${duurTekst(nu - r.start * 1000)}`
          : vast.length > 0
            ? 'mogelijk vastgelopen'
            : 'standby',
      taak:
        lopend.length > 0
          ? (meerdere ? lopend.map(x => x.taak.split(' ')[0]).join(', ') : r.taak)
          : totaalTekst(lokaal?.geschiedenis ?? [], agent) || (r.taak ? `laatste: ${r.taak}` : ''),
      voortgang: lopend.length > 0 ? Math.max(...lopend.map(x => x.voortgang)) : null,
      detail: r.model,
    })
  }

  // Hermes zelf (geplande taak), als die draait.
  if (extern) {
    lijst.push({
      naam: 'Hermes',
      rol: 'Geplande taak',
      kleur: '#9B7BE0',
      uitrusting: 'jury',
      actief: extern.hermesRun,
      status: extern.hermesRun ? `run bezig ${extern.hermesDuur}` : extern.gateway.includes('running') ? 'standby' : 'gestopt',
      taak: '',
      voortgang: null,
      detail: extern.model,
    })
  }
  // Wie bezig is staat bovenaan.
  return [...lijst.filter(k => k.actief), ...lijst.filter(k => !k.actief)]
}

// De paden onder "## Bestanden" in een issue: regels die met "- " en een pad tussen backticks beginnen.
function bestandenUit(body: string): string[] {
  const uit: string[] = []
  let binnen = false
  for (const regel of body.split(NIEUWE_REGEL)) {
    if (regel.startsWith('## ')) {
      binnen = regel.trim() === '## Bestanden'
      continue
    }
    const m = binnen ? regel.match(/^- `([^`]+)`/) : null
    if (m) uit.push(schoon(m[1]))
  }
  return uit
}

function bouwExtern(status: string, runs: string, issues: string, gesloten: string, prs: string, diag: string): Extern {
  const gateway = schoon(status.match(/Gateway:\s+(.+)/)?.[1] ?? 'onbekend')
  const model = schoon(status.match(/Model:\s+(.+)/)?.[1] ?? 'onbekend')
  const eerste = runs.split('\n').find(l => /\s(running|completed|failed)\s+job=/.test(l)) ?? ''
  const runStatus = eerste.match(/\s(running|completed|failed)\s+job=/)?.[1] ?? ''
  const start = eerste.match(/(\d{4}-\d{2}-\d{2}T[\d:.+-]+)/)?.[1] ?? ''
  const hermesRun = runStatus === 'running'

  // Open PR's per issue ("Hoort bij #N" in de beschrijving) met het label agent-exact.
  const prPerIssue = new Map<number, { nummer: number; exact: boolean }>()
  for (const p of (json(prs) ?? []) as { number: number; body: string; labels: { name: string }[] }[]) {
    const m = String(p.body ?? '').match(/#(\d+)/)
    if (m) prPerIssue.set(Number(m[1]), { nummer: p.number, exact: p.labels.some(l => l.name === 'agent-exact') })
  }

  const taken: Taak[] = []
  for (const i of (json(issues) ?? []) as { number: number; title: string; body?: string; labels: { name: string }[] }[]) {
    const labels = i.labels.map(l => l.name)
    const fase = VOLGORDE.find(f => labels.includes(f))
    if (!fase) continue
    const pr = prPerIssue.get(i.number)
    taken.push({ nummer: i.number, titel: schoon(i.title), fase, status: FASEN[fase].tekst, pr: pr?.nummer ?? 0, exact: pr?.exact ?? false, bestanden: bestandenUit(i.body ?? '') })
  }
  const klaar: Klaar[] = []
  for (const i of (json(gesloten) ?? []) as { number: number; title: string }[]) klaar.push({ nummer: i.number, titel: schoon(i.title) })

  const fout = status || issues ? '' : `Hermes en GitHub gaven geen antwoord: ${schoon(diag)}`
  return {
    bijgewerkt: new Date().toLocaleTimeString('nl-NL'),
    gateway,
    model,
    hermesRun,
    hermesDuur: hermesRun && start ? duurTekst(Date.now() - Date.parse(start)) : '',
    taken,
    klaar,
    fout,
  }
}

export const register: Register = on => {
  // Wat Claude zelf doet: een beurt begint, een gereedschap wordt gebruikt, een beurt eindigt.
  on('prompt.submit', async ($, e, next) => {
    const nu = await $.clock.now()
    const { value } = await $.state.get({ plugin: 'agents', key: 'claude' } as const)
    await $.state.set({ plugin: 'agents', key: 'claude' } as const, { bezig: true, tool: 'denkt na', sinds: nu, bijgewerkt: nu, aantal: 0, tokensIn: value?.tokensIn ?? 0, tokensUit: value?.tokensUit ?? 0 })
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const nu = await $.clock.now()
    const { value } = await $.state.get({ plugin: 'agents', key: 'claude' } as const)
    const sinds = value && value.bezig ? value.sinds : nu
    const aantal = value && value.bezig ? value.aantal + 1 : 1
    await $.state.set({ plugin: 'agents', key: 'claude' } as const, { bezig: true, tool: schoon(String(e.tool)), sinds, bijgewerkt: nu, aantal, tokensIn: value?.tokensIn ?? 0, tokensUit: value?.tokensUit ?? 0 })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const nu = await $.clock.now()
    const { value } = await $.state.get({ plugin: 'agents', key: 'claude' } as const)
    // Het gebruik van deze beurt, als het meekomt: invoer telt ook wat uit de cache kwam.
    const u = (e as { usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }).usage
    const erbij = u ? (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) : 0
    const eruitBij = u ? u.output_tokens ?? 0 : 0
    await $.state.set({ plugin: 'agents', key: 'claude' } as const, { bezig: false, tool: '', sinds: nu, bijgewerkt: nu, aantal: 0, tokensIn: (value?.tokensIn ?? 0) + erbij, tokensUit: (value?.tokensUit ?? 0) + eruitBij })
    return next(e)
  })

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'agents-paneel', description: 'Open het Agents-paneel' })
    void $.ui.open({ id: PANE, title: 'Agents SCORE2SOUND', columns: 56 })

    // Verborgen afgeronde taken blijven bewaard tussen sessies.
    const opgeslagen = await $.store.get('verborgen')
    const { value: bestaand } = await $.state.get({ plugin: 'agents', key: 'paneel' } as const)
    const eerderVerborgen = Array.isArray(opgeslagen) ? opgeslagen.map(Number).filter(n => Number.isFinite(n)) : []
    if (!bestaand) await $.state.set({ plugin: 'agents', key: 'paneel' } as const, { dicht: ['klaar', 'test'], verborgen: eerderVerborgen })

    // Snelle ronde: statusbestanden van de runner, de geschiedenis, de modeltest en subagents van Claude.
    const lokaalVernieuwen = async () => {
      const runners: Runner[] = []
      try {
        const bestanden = await $.fs.list(STATUSMAP)
        for (const f of bestanden) {
          if (!f.name.endsWith('.json')) continue
          const gelezen = await $.fs.read(`${STATUSMAP}/${f.name}`)
          const data = json(typeof gelezen === 'string' ? gelezen : String((gelezen as { text?: string }).text ?? ''))
          if (!data) continue
          runners.push({
            agent: schoon(String(data.agent ?? '')),
            status: schoon(String(data.status ?? '')),
            taak: schoon(String(data.taak ?? '')),
            model: schoon(String(data.model ?? '')),
            start: Number(data.start) || 0,
            bijgewerkt: Number(data.bijgewerkt) || 0,
            voortgang: Number.isFinite(Number(data.voortgang)) ? Number(data.voortgang) : 0,
            fase: schoon(String(data.fase ?? '')),
          })
        }
      } catch {
        // De map bestaat nog niet: er heeft nog geen runner gedraaid.
      }
      const geschiedenis: Geschied[] = []
      try {
        const gelezen = await $.fs.read(`${STATUSMAP}/geschiedenis.jsonl`)
        const tekst = typeof gelezen === 'string' ? gelezen : String((gelezen as { text?: string }).text ?? '')
        for (const regel of tekst.split(NIEUWE_REGEL).slice(-40)) {
          const d = json(regel)
          if (!d || !d.issue) continue
          geschiedenis.push({
            tijd: Number(d.tijd) || 0,
            issue: Number(d.issue),
            titel: schoon(String(d.titel ?? '')),
            uitvoerder: schoon(String(d.uitvoerder ?? '')),
            model: schoon(String(d.model ?? '')),
            seconden: Number(d.seconden) || 0,
            resultaat: schoon(String(d.resultaat ?? '')),
            modus: schoon(String(d.modus ?? '')),
            tokensIn: Number(d.tokens_in) || 0,
            tokensUit: Number(d.tokens_uit) || 0,
          })
        }
      } catch {
        // Nog geen geschiedenis.
      }
      const subs: Sub[] = []
      try {
        for (const a of await $.agent.list()) {
          subs.push({ id: String(a.id), naam: schoon(String(a.description || a.type || 'subagent')), status: String(a.status) })
        }
      } catch {
        // Geen subagents beschikbaar.
      }
      const bench: Bench[] = []
      let benchBezig = ''
      try {
        const gelezen = await $.fs.read(`${BENCHMAP}/resultaten.jsonl`)
        const tekst = typeof gelezen === 'string' ? gelezen : String((gelezen as { text?: string }).text ?? '')
        const klaarSleutels = new Set<string>()
        for (const regel of tekst.split(NIEUWE_REGEL)) {
          const d = json(regel)
          if (!d || !d.model) continue
          const ev = d.eval ?? {}
          const nodig = d.taak === 'A' ? ev.exact === true : ev.inhoud_ok === true && ev.regeleinde_ok !== false
          const ok = nodig && ev.tests_ok === true && (ev.extra ?? []).length === 0
          bench.push({
            model: schoon(String(d.model)),
            taak: schoon(String(d.taak)),
            seconden: Number(d.seconden) || 0,
            kosten: Number(d.kosten) || 0,
            ok,
            detail: d.taak === 'B' && typeof ev.gelijkenis === 'number' ? `gelijkenis ${ev.gelijkenis}` : '',
          })
          klaarSleutels.add(`run-${String(d.model).split('/').join('-').split(':').join('-').split('.').join('-')}-${d.taak}`)
        }
        for (const f of await $.fs.list(BENCHMAP)) {
          if (f.name.startsWith('run-') && !klaarSleutels.has(f.name)) benchBezig = schoon(f.name.slice(4))
        }
      } catch {
        // Geen modeltest bezig.
      }
      await $.state.set({ plugin: 'agents', key: 'lokaal' } as const, { bijgewerkt: Date.now(), runners, subs, bench, benchBezig, geschiedenis })
    }

    // Trage ronde: GitHub-issues, open PR's en Hermes.
    const externVernieuwen = async () => {
      const opties = { timeoutMs: 20000 }
      const [status, runs, issues, gesloten, prs] = await Promise.allSettled([
        $.process.run([HERMES, 'status'], opties),
        $.process.run([HERMES, 'cron', 'runs'], opties),
        $.process.run([GH, 'issue', 'list', '-R', REPO, '--state', 'open', '--limit', '30', '--json', 'number,title,labels,body'], opties),
        $.process.run([GH, 'issue', 'list', '-R', REPO, '--state', 'closed', '--label', 'agent-review', '--limit', '3', '--json', 'number,title'], opties),
        $.process.run([GH, 'pr', 'list', '-R', REPO, '--state', 'open', '--json', 'number,body,labels'], opties),
      ])
      const tekst = (r: PromiseSettledResult<{ exitCode: number; stdout: string }>) =>
        r.status === 'fulfilled' && r.value.exitCode === 0 ? String(r.value.stdout) : ''
      const reden = (r: PromiseSettledResult<{ exitCode: number; stdout: string; stderr?: string }>) =>
        r.status === 'rejected'
          ? `fout: ${String(r.reason).slice(0, 160)}`
          : r.value.exitCode !== 0
            ? `exit ${r.value.exitCode}: ${String(r.value.stderr ?? '').slice(0, 160)}`
            : 'ok'
      const diag = [status, issues].map(reden).join(' | ')
      await $.state.set({ plugin: 'agents', key: 'extern' } as const, bouwExtern(tekst(status), tekst(runs), tekst(issues), tekst(gesloten), tekst(prs), diag))
    }

    $.clock.after(300, lokaalVernieuwen)
    $.clock.after(600, externVernieuwen)
    $.clock.every(LOKAAL_MS, lokaalVernieuwen)
    $.clock.every(EXTERN_MS, externVernieuwen)
    return next(e)
  })

  on('command.run', { command: 'agents-paneel' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agents SCORE2SOUND', columns: 56 })
    return { text: 'Agents-paneel geopend.' }
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text, Button } = ui
    const { value: paneel } = await $.state.get({ plugin: 'agents', key: 'paneel' } as const)
    const { value: claude } = await $.state.get({ plugin: 'agents', key: 'claude' } as const)
    const { value: lokaal } = await $.state.get({ plugin: 'agents', key: 'lokaal' } as const)
    const { value: extern } = await $.state.get({ plugin: 'agents', key: 'extern' } as const)
    const nu = Date.now()
    // Claude's eigen tijden komen van de klok van de sessie; die loopt gelijk met deze.
    const lijst = kaarten(nu, claude ?? null, lokaal ?? null, extern ?? null)
    const pijpen = pijplijnen(nu, extern ?? null, lokaal ?? null)
    const bezig = lijst.filter(k => k.actief).length
    // Modeltest: per model de resultaten, en het model dat nu draait (de mapnaam eindigt op -A of -B).
    const perModel = new Map<string, Bench[]>()
    for (const r of lokaal?.bench ?? []) perModel.set(r.model, [...(perModel.get(r.model) ?? []), r])
    const benchBezigNaam = lokaal?.benchBezig ?? ''
    const sleutel = (m: string) => m.split('/').join('-').split(':').join('-').split('.').join('-')
    const benchBezigVoor = (m: string) => (benchBezigNaam && benchBezigNaam.startsWith(sleutel(m) + '-') ? benchBezigNaam.slice(-1) : '')
    const benchModellen: [string, Bench[]][] = [...perModel.entries()]
    const taken = extern?.taken ?? []
    const hermesDraait = !!extern && extern.gateway.includes('running')

    if (e.surface === 'desktop' && 'Svg' in ui) {
      const { Svg } = ui
      const kolommen = Number((e as { props?: { bodyColumns?: number } }).props?.bodyColumns) || 40
      const b = Math.max(280, Math.min(900, kolommen * 8 - 8))
      // Welke secties dicht staan: standaard de afgeronde taken en de modeltest.
      const dicht = paneel?.dicht ?? ['klaar', 'test']
      const isOpen = (naam: string) => !dicht.includes(naam)
      const verborgen = paneel?.verborgen ?? []
      const wissel = (naam: string) =>
        $.state.set({ plugin: 'agents', key: 'paneel' } as const, { dicht: dicht.includes(naam) ? dicht.filter(x => x !== naam) : [...dicht, naam], verborgen })
      const bewaarVerborgen = async (nieuw: number[]) => {
        await $.store.set('verborgen', nieuw)
        await $.state.set({ plugin: 'agents', key: 'paneel' } as const, { dicht, verborgen: nieuw })
      }
      const kop = (naam: string, tekst: string, aantal: number) => (
        <Button key={`kop-${naam}`} label={`${isOpen(naam) ? '▾' : '▸'} ${tekst} · ${aantal}`} plain onPress={() => wissel(naam)} />
      )
      const lopend = pijpen.filter(p => p.staat !== 'klaar')
      const alleKlaar = pijpen.filter(p => p.staat === 'klaar')
      const afgerond = alleKlaar.filter(p => !verborgen.includes(p.nummer))
      const wisKlaar = () => bewaarVerborgen([...new Set([...verborgen, ...alleKlaar.map(p => p.nummer)])])
      return (
        <Box flexDirection="column" gap={1}>
          <Svg source={kopSvg(b, bezig, lijst.length, taken)} alt={`${bezig} van ${lijst.length} agents aan het werk`} width={b} height={90} />
          {extern && extern.fout !== '' && <Text color="red">{extern.fout}</Text>}
          {kop('taken', 'Taken', lopend.length)}
          {isOpen('taken') && (
            <Box flexDirection="column" gap={1}>
              {lopend.length === 0 && <Text dimColor>Geen open taken.</Text>}
              {lopend.map(p => (
                <Box key={`p-${p.nummer}`} flexDirection="column">
                  <Svg source={pijpSvg(b, p)} alt={`#${p.nummer} ${p.titel}: ${p.statusTekst}`} width={b} height={90} />
                  {p.staat !== 'wacht' && (
                    <Box flexDirection="column" paddingLeft={2}>
                      {rollenVoor(p, nu, lokaal ?? null).map((k, i) => (
                        <Svg key={`r-${p.nummer}-${i}`} source={kaartSvg(b - 16, k)} alt={`${k.rol}: ${k.naam}, ${k.status}`} width={b - 16} height={70} />
                      ))}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          )}
          {afgerond.length > 0 && (
            <Box flexDirection="row" gap={2}>
              {kop('klaar', 'Klaar', afgerond.length)}
              <Button key="wis-klaar" label="Wissen" plain onPress={wisKlaar} />
            </Box>
          )}
          {afgerond.length > 0 && isOpen('klaar') && (
            <Box flexDirection="column">
              {afgerond.map(p => (
                <Svg key={`k-${p.nummer}`} source={pijpSvg(b, p)} alt={`#${p.nummer} ${p.titel}: klaar`} width={b} height={90} />
              ))}
            </Box>
          )}
          {kop('agents', 'Alle agents', lijst.length)}
          {isOpen('agents') && (
            <Box flexDirection="column">
              {lijst.map((k, i) => (
                <Svg key={`${k.naam}-${i}`} source={kaartSvg(b, k)} alt={`${k.naam}: ${k.actief ? 'bezig' : 'standby'}`} width={b} height={70} />
              ))}
            </Box>
          )}
          {benchModellen.length > 0 && kop('test', 'Modeltest', benchModellen.length)}
          {benchModellen.length > 0 && isOpen('test') && (
            <Box flexDirection="column">
              {benchModellen.map(([model, rijen]) => (
                <Svg key={model} source={benchSvg(b, model, rijen, benchBezigVoor(model))} alt={`${model}: modeltest`} width={b} height={50} />
              ))}
            </Box>
          )}
        </Box>
      )
    }

    // Zonder tekenvlak (terminal): gewone tekst.
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>Agents: {bezig} aan het werk</Text>
        {pijpen.map(p => (
          <Text>
            #{p.nummer} {p.titel}: {p.statusTekst}
            {p.uitvoerder ? ` (${uitvoerderNaam(p.uitvoerder)})` : ''}
          </Text>
        ))}
        {lijst.map(k => (
          <Text>
            {k.naam}: {k.actief ? `${k.status} ${k.taak}` : 'standby'}
          </Text>
        ))}
      </Box>
    )
  })
}
