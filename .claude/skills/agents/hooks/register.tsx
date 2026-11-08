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

const KLEI = '#D97757'
const INKT = '#1F1E1D'
const GROEN = '#3FB68B'
const ROOD = '#E5534B'
const BLAUW = '#4C8DF6'
const AMBER = '#E0A030'
const PAARS = '#C16BD9'
const GRIJS = '#8A8A85'
const LETTERTYPE = "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif"

// Fase per label op een issue: kleur en korte tekst.
const FASEN: Record<string, { tekst: string; kleur: string }> = {
  'agent-ready': { tekst: 'in de wachtrij', kleur: GRIJS },
  'agent-bezig': { tekst: 'wordt uitgevoerd', kleur: AMBER },
  'agent-review': { tekst: 'wacht op review', kleur: BLAUW },
  'agent-terug': { tekst: 'terug naar de uitvoerder', kleur: PAARS },
  'agent-vast': { tekst: 'vastgelopen', kleur: ROOD },
}
const VOLGORDE = ['agent-vast', 'agent-terug', 'agent-bezig', 'agent-review', 'agent-ready']

// De stappen van de workflow, van links naar rechts.
const STAPPEN = ['Plan', 'Wachtrij', 'Uitvoeren', 'Controle', 'PR', 'Review']

type Uitrusting = 'bril' | 'helm' | 'zwaar' | 'jury' | 'schild' | 'baret' | 'geen'

// De uitvoerders in vaste volgorde, met een eigen kleur en uitrusting voor de krab.
// De volgorde van het label kiezen is die van werkpakket.sh: codex, copilot, gemini, hermes, claude.
const UITVOERDERS = ['claude', 'gemini', 'hermes', 'codex', 'copilot']
const LABEL_VOLGORDE = ['codex', 'copilot', 'gemini', 'hermes', 'claude']
const INFO: Record<string, { naam: string; kleur: string; uitrusting: Uitrusting; soort: string }> = {
  claude: { naam: 'Claude-uitvoerder', kleur: '#C8673F', uitrusting: 'baret', soort: 'tweede account' },
  gemini: { naam: 'Gemini', kleur: '#E0A23B', uitrusting: 'helm', soort: 'API-sleutel' },
  hermes: { naam: 'Hermes', kleur: '#9B7BE0', uitrusting: 'jury', soort: 'gratis, kleine taken' },
  codex: { naam: 'Codex', kleur: '#2E9E83', uitrusting: 'zwaar', soort: 'ChatGPT-account' },
  copilot: { naam: 'Copilot', kleur: '#5B8DEF', uitrusting: 'bril', soort: 'studentenabonnement' },
}
const info = (u: string) => INFO[u] ?? { naam: u || 'standaard (Codex)', kleur: GRIJS, uitrusting: 'geen' as Uitrusting, soort: '' }

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
  tokensIn: number
  tokensUit: number
}
// Iets wat aandacht vraagt: een vastgelopen of afgekeurde taak, of een PR die op review wacht.
type Actie = { nummer: number; titel: string; label: string; kleur: string; regel: string }
// Een rij in het overzicht van wie er kan werken.
type Rij = {
  sleutel: string
  naam: string
  detail: string
  kleur: string
  uitrusting: Uitrusting
  actief: boolean
  status: string
  statusKleur?: string
  regel: string
  punten: string[]
  voortgang: number | null
}

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
  if (min < 1) return `${Math.floor(ms / 1000)} s`
  if (min < 120) return `${min} min`
  return `${Math.floor(min / 60)} uur`
}

// "3 min geleden", "5 uur geleden", "2 dagen geleden"; tijd in seconden.
const geleden = (nu: number, tijd: number) => {
  if (!tijd) return ''
  const min = Math.floor((nu - tijd * 1000) / 60000)
  if (min < 1) return 'net'
  if (min < 60) return `${min} min geleden`
  const uur = Math.floor(min / 60)
  if (uur < 24) return `${uur} uur geleden`
  const dagen = Math.floor(uur / 24)
  return dagen === 1 ? 'gisteren' : `${dagen} dagen geleden`
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

const kortModel = (m: string) => (m && m !== 'auto' && m !== 'standaard' ? m.split('/').pop() ?? m : '')

// Waarom een taak vastliep, in een paar woorden, uit de melding van het runner-script.
const oorzaak = (reden: string) => {
  const r = reden.toLowerCase()
  if (!r) return 'vastgelopen'
  if (/usage limit|quota|credits|rate limit|limit reached/.test(r)) return 'tegoed op'
  if (/no such file|command not found|not recognized/.test(r)) return 'programma niet gevonden'
  if (/argument list too long/.test(r)) return 'opdracht te lang'
  if (/regels|diffgrens|te groot/.test(r)) return 'wijziging te groot'
  if (/action|test/.test(r)) return 'controle faalt'
  if (/niets gewijzigd/.test(r)) return 'niets gewijzigd'
  return 'vastgelopen'
}
const zonderAanloop = (reden: string) => reden.replace(/^het model heeft niets gewijzigd\.\s*Laatste woorden:\s*/i, '').replace(/^timeout:\s*/i, '')

// Kleuren voor licht en donker; het paneel volgt het thema van de app.
const STIJL = `<style>
.t{fill:#1f1f1f}.s{fill:#6b6b68}.k{fill:#ecebe8}.ln{stroke:#e4e4e1}.tegel{fill:#f4f3f0}.lijn{stroke:#d7d6d2}.leeg{fill:none;stroke:#c3c2be}
@media (prefers-color-scheme: dark){.t{fill:#ececec}.s{fill:#a8a8a4}.k{fill:#2c2c2b}.ln{stroke:#333331}.tegel{fill:#262625}.lijn{stroke:#3a3a38}.leeg{fill:none;stroke:#555552}}
</style>`
const svg = (b: number, h: number, inhoud: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${h}" viewBox="0 0 ${b} ${h}">${STIJL}${inhoud}</svg>`
const tekst = (x: number, y: number, maat: number, inhoud: string, extra = '') =>
  `<text x="${x}" y="${y}" font-family="${LETTERTYPE}" font-size="${maat}" ${extra}>${xml(inhoud)}</text>`
const kleurAttr = (kleur: string | undefined, klasse = 's') => (kleur ? `fill="${kleur}"` : `class="${klasse}"`)

// Een pixelkrab op een raster van 20 bij 16, met per agent andere uitrusting.
const krab = (x: number, y: number, uitrusting: Uitrusting, gedimd: boolean) => {
  const u = 1.6
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
  if (uitrusting === 'schild') d += r(0, 7, 3, 6, BLAUW) + r(1, 8, 1, 4, '#CFE0FF')
  if (uitrusting === 'baret') d += r(5, 3, 10, 2, '#D9534F') + r(8, 2, 4, 1, '#D9534F') + r(13, 4, 4, 1, '#D9534F')
  return `<g opacity="${gedimd ? 0.45 : 1}">${d}</g>`
}

// Kop: naam, een pil met de algemene stand en vier tegels.
const kopSvg = (b: number, t: { bezig: number; wachtrij: number; vast: number; review: number }) => {
  const gap = 6
  const tw = (b - gap * 3) / 4
  const stil = t.wachtrij > 0 && t.bezig === 0
  const pil = t.vast > 0 ? { tekst: 'Actie nodig', kleur: ROOD } : t.bezig > 0 ? { tekst: 'Bezig', kleur: GROEN } : stil ? { tekst: 'Wachtrij staat stil', kleur: AMBER } : { tekst: 'Rust', kleur: GRIJS }
  const pilB = 24 + tekstBreedte(pil.tekst, 12) + 6
  const tegel = (i: number, naam: string, waarde: number, kleur: string | undefined) =>
    `<rect class="tegel" x="${i * (tw + gap)}" y="30" width="${tw}" height="44" rx="8"/>` +
    tekst(i * (tw + gap) + 10, 46, 11, naam, 'class="s"') +
    tekst(i * (tw + gap) + 10, 66, 17, String(waarde), `${kleurAttr(waarde > 0 ? kleur : undefined, 't')} font-weight="600"`)
  return svg(
    b,
    78,
    tekst(1, 18, 15, 'SCORE2SOUND', 'class="t" font-weight="700"') +
      tekst(126, 18, 12, 'agents', 'class="s"') +
      `<rect x="${b - pilB}" y="3" width="${pilB}" height="22" rx="11" fill="${pil.kleur}" opacity="0.16"/>` +
      `<circle cx="${b - pilB + 12}" cy="14" r="4" fill="${pil.kleur}"/>` +
      tekst(b - pilB + 22, 18, 12, pil.tekst, `fill="${pil.kleur}" font-weight="600"`) +
      tegel(0, 'Bezig', t.bezig, GROEN) +
      tegel(1, 'Wachtrij', t.wachtrij, undefined) +
      tegel(2, 'Vast', t.vast, ROOD) +
      tegel(3, 'Review', t.review, BLAUW),
  )
}

// Een taak die aandacht vraagt: nummer en titel, het soort actie, en waarom.
const actieSvg = (b: number, a: Actie) =>
  svg(
    b,
    46,
    `<circle cx="7" cy="13" r="4.5" fill="${a.kleur}"/>` +
      tekst(20, 17, 13, pas(`#${a.nummer} ${a.titel}`, 13, b - 90), 'class="t" font-weight="600"') +
      tekst(b - 2, 17, 11, a.label, `fill="${a.kleur}" text-anchor="end" font-weight="600"`) +
      tekst(20, 35, 11, pas(a.regel, 11, b - 24), 'class="s"') +
      `<line class="ln" x1="0" y1="45.5" x2="${b}" y2="45.5"/>`,
  )

// Eén taak als stroom: Plan, Wachtrij, Uitvoeren, Controle, PR, Review; daaronder wie het doet.
const pijpSvg = (b: number, p: Pijp, nu: number, laatst: number) => {
  const marge = 18
  const stap = (b - marge * 2) / (STAPPEN.length - 1)
  const y = 36
  const klaar = p.staat === 'klaar'
  const knopen = STAPPEN.map((naam, i) => {
    const x = marge + i * stap
    const gedaan = klaar || i < p.huidig
    const hier = !klaar && i === p.huidig
    const lijn =
      i < STAPPEN.length - 1
        ? `<line ${gedaan ? `stroke="${GROEN}"` : 'class="lijn"'} stroke-width="2" x1="${x + 8}" y1="${y}" x2="${x + stap - 8}" y2="${y}"/>`
        : ''
    const knoop = gedaan
      ? `<circle cx="${x}" cy="${y}" r="6.5" fill="${GROEN}"/><path d="M${x - 3} ${y} l2.3 2.5 l4 -4.8" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>`
      : hier
        ? `<circle cx="${x}" cy="${y}" r="9.5" fill="${p.kleur}" opacity="0.22"/><circle cx="${x}" cy="${y}" r="6" fill="${p.kleur}"/>`
        : `<circle class="leeg" cx="${x}" cy="${y}" r="6" stroke-width="1.6"/>`
    return lijn + knoop + tekst(x, 56, 10, naam, `${hier ? `fill="${p.kleur}" font-weight="600"` : 'class="s"'} text-anchor="middle"`)
  }).join('')
  const wie = p.uitvoerder ? info(p.uitvoerder).naam : 'uitvoerder nog niet gekozen'
  const delen = [
    [wie, kortModel(p.model)].filter(Boolean).join(', '),
    p.seconden ? duurTekst(p.seconden * 1000) : '',
    p.tokensIn + p.tokensUit > 0 ? `${tok(p.tokensIn + p.tokensUit)} tokens` : '',
    p.pr > 0 ? `PR #${p.pr}${p.exact ? ' exact' : ''}` : '',
    klaar && laatst ? geleden(nu, laatst) : '',
  ].filter(Boolean)
  const rechts = klaar ? 'gemerged' : p.statusTekst
  return svg(
    b,
    80,
    tekst(2, 15, 13, pas(`#${p.nummer} ${p.titel}`, 13, b - 140), 'class="t" font-weight="600"') +
      tekst(b - 2, 15, 11, pas(rechts, 11, 136), `fill="${klaar ? GROEN : p.kleur}" text-anchor="end"`) +
      knopen +
      tekst(2, 72, 11, pas(delen.join(' · '), 11, b - 4), `${kleurAttr(p.uitvoerder && !klaar ? info(p.uitvoerder).kleur : undefined)}`) +
      `<line class="ln" x1="0" y1="79.5" x2="${b}" y2="79.5"/>`,
  )
}

// Een taak in de wachtrij: één regel met de uitvoerder die hem krijgt.
const wachtSvg = (b: number, p: Pijp) => {
  const i = info(p.uitvoerder)
  return svg(
    b,
    24,
    `<circle class="leeg" cx="7" cy="12" r="4" stroke-width="1.5"/>` +
      tekst(20, 16, 12, pas(`#${p.nummer} ${p.titel}`, 12, b - 150), 'class="t"') +
      tekst(b - 2, 16, 11, i.naam, `fill="${i.kleur}" text-anchor="end"`),
  )
}

// Een uitvoerder (of Claude zelf): krab, naam, model, stand, en de laatste uitslagen als stippen.
const rijSvg = (b: number, r: Rij) => {
  const links = 44
  const tekstB = b - links - 2
  const statusT = pas(r.status, 11, 170)
  const naamB = tekstBreedte(r.naam, 13) * 1.12
  const ruimteDetail = tekstB - naamB - 10 - tekstBreedte(statusT, 11) - 12
  const puntB = r.punten.length * 10
  const balk =
    r.voortgang !== null
      ? `<rect class="k" x="${links}" y="45" width="${tekstB}" height="3" rx="1.5"/><rect x="${links}" y="45" width="${Math.round(tekstB * Math.max(0.04, Math.min(1, r.voortgang)))}" height="3" rx="1.5" fill="${r.kleur}"/>`
      : ''
  return svg(
    b,
    54,
    krab(2, 12, r.uitrusting, !r.actief) +
      tekst(links, 18, 13, r.naam, `class="t" font-weight="600" opacity="${r.actief ? 1 : 0.8}"`) +
      (ruimteDetail > 30 ? tekst(links + naamB + 10, 18, 11, pas(r.detail, 11, ruimteDetail), 'class="s"') : '') +
      tekst(b - 2, 18, 11, statusT, `${kleurAttr(r.statusKleur)} text-anchor="end" ${r.actief ? 'font-weight="600"' : ''}`) +
      r.punten.map((k, i) => `<circle cx="${links + 4 + i * 10}" cy="32" r="3.5" fill="${k}"/>`).join('') +
      tekst(links + (puntB ? puntB + 4 : 0), 36, 11, pas(r.regel, 11, tekstB - puntB - 4), 'class="s"') +
      balk +
      `<line class="ln" x1="0" y1="53.5" x2="${b}" y2="53.5"/>`,
  )
}

// Een rij per getest model: naam, prijsklasse en per taak tijd, kosten en of het goed was.
const benchSvg = (b: number, model: string, rijen: Bench[], bezig: string) => {
  const kort = model.split('/').pop() ?? model
  const gratis = model.endsWith(':free')
  const goed = rijen.length > 0 && rijen.every(r => r.ok)
  const kleur = bezig ? AMBER : rijen.length === 0 ? GRIJS : goed ? GROEN : ROOD
  const delen = rijen.map(r => `${r.taak}: ${r.seconden} s, ${r.kosten === 0 ? 'gratis' : '$' + r.kosten.toFixed(3)}, ${r.ok ? 'goed' : 'niet goed'}${r.detail ? ' (' + r.detail + ')' : ''}`)
  if (bezig) delen.push(`taak ${bezig} bezig...`)
  return svg(
    b,
    50,
    `<circle cx="8" cy="12" r="4" fill="${kleur}"/>` +
      tekst(20, 16, 13, pas(kort, 13, b - 110), 'class="t" font-weight="600"') +
      tekst(b - 2, 16, 11, gratis ? 'gratis model' : 'betaald model', 'class="s" text-anchor="end"') +
      tekst(20, 34, 11, pas(delen.join('   '), 11, b - 24), 'class="s"') +
      `<line class="ln" x1="0" y1="49.5" x2="${b}" y2="49.5"/>`,
  )
}

const laatsteVoor = (historie: Geschied[], nummer: number): Geschied | undefined => {
  for (let i = historie.length - 1; i >= 0; i--) {
    const h = historie[i]
    if (h && h.issue === nummer) return h
  }
  return undefined
}
const loopt = (r: Runner, nu: number) => r.status === 'bezig' && nu - r.bijgewerkt * 1000 <= VERLOOP_MS

// Pure functie: maakt van open en recent afgeronde taken een stroom door de workflow.
function pijplijnen(nu: number, extern: Extern | null, lokaal: Lokaal | null): Pijp[] {
  const runners = lokaal?.runners ?? []
  const historie = lokaal?.geschiedenis ?? []
  const lijst: Pijp[] = []

  for (const t of extern?.taken ?? []) {
    const f = FASEN[t.fase] ?? { tekst: t.status, kleur: GRIJS }
    // Wie voert deze taak uit? Eerst de lopende runner, dan de laatste keer uit de geschiedenis, dan het label.
    const run = runners.find(r => loopt(r, nu) && r.taak.startsWith(`#${t.nummer} `))
    const hist = laatsteVoor(historie, t.nummer)
    const uitvoerder = run ? run.agent : t.fase === 'agent-ready' ? t.uitvoerder ?? '' : hist ? hist.uitvoerder : t.uitvoerder ?? ''
    const model = run ? run.model : hist && t.fase !== 'agent-ready' ? hist.model : ''
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
    lijst.push({
      nummer: t.nummer,
      titel: t.titel,
      huidig,
      staat,
      statusTekst: staat === 'bezig' && run?.fase ? `${run.fase}, ${duurTekst(nu - run.start * 1000)}` : f.tekst,
      kleur: f.kleur,
      uitvoerder,
      model,
      seconden: staat === 'bezig' && run ? 0 : hist ? hist.seconden : 0,
      pr: t.pr,
      exact: t.exact,
      tokensIn: hist ? hist.tokensIn : 0,
      tokensUit: hist ? hist.tokensUit : 0,
    })
  }

  // Recent afgerond (gemerged): alle stappen groen.
  for (const k of (extern?.klaar ?? []).slice(0, 3)) {
    const hist = laatsteVoor(historie, k.nummer)
    lijst.push({
      nummer: k.nummer,
      titel: k.titel,
      huidig: STAPPEN.length,
      staat: 'klaar',
      statusTekst: 'gemerged',
      kleur: GROEN,
      uitvoerder: hist ? hist.uitvoerder : '',
      model: hist ? hist.model : '',
      seconden: hist ? hist.seconden : 0,
      pr: 0,
      exact: false,
      tokensIn: hist ? hist.tokensIn : 0,
      tokensUit: hist ? hist.tokensUit : 0,
    })
  }
  return lijst
}

// Pure functie: wat er nu aandacht vraagt, met de reden uit de geschiedenis van het runner-script.
function acties(pijpen: Pijp[], lokaal: Lokaal | null): Actie[] {
  const historie = lokaal?.geschiedenis ?? []
  const uit: Actie[] = []
  for (const p of pijpen) {
    if (p.staat === 'vast') {
      const hist = laatsteVoor(historie, p.nummer)
      const reden = hist?.resultaat === 'vast' ? hist.reden ?? '' : ''
      const wie = info(hist?.uitvoerder || p.uitvoerder).naam
      uit.push({
        nummer: p.nummer,
        titel: p.titel,
        label: 'vast',
        kleur: ROOD,
        regel: reden ? `${wie}: ${oorzaak(reden)} · ${zonderAanloop(reden)}` : `${wie}: de reden staat als commentaar op het issue`,
      })
    } else if (p.staat === 'terug') {
      uit.push({ nummer: p.nummer, titel: p.titel, label: 'afgekeurd', kleur: PAARS, regel: `${info(p.uitvoerder).naam} past de PR aan` })
    } else if (p.staat === 'review') {
      uit.push({ nummer: p.nummer, titel: p.titel, label: 'review', kleur: BLAUW, regel: p.pr > 0 ? `PR #${p.pr}${p.exact ? ', precies zoals verwacht' : ''}: bekijk de diff en merge` : 'PR nog niet gevonden' })
    }
  }
  return uit
}

// Pure functie: een rij voor Claude, actieve subagents en elke uitvoerder.
function rijen(nu: number, claude: ClaudeStatus | null, lokaal: Lokaal | null, extern: Extern | null): Rij[] {
  const lijst: Rij[] = []
  const historie = lokaal?.geschiedenis ?? []

  const claudeActief = !!claude && claude.bezig && nu - claude.bijgewerkt < VERLOOP_MS
  lijst.push({
    sleutel: 'planner',
    naam: 'Claude',
    detail: 'planner en controleur, deze chat',
    kleur: KLEI,
    uitrusting: 'geen',
    actief: claudeActief,
    status: claudeActief && claude ? `bezig ${duurTekst(nu - claude.sinds)}` : 'wacht op jou',
    statusKleur: claudeActief ? KLEI : undefined,
    regel: claudeActief && claude ? `${claude.tool} · ${claude.aantal} acties · ${tok(claude.tokensIn)} tokens erin` : claude && claude.tokensIn > 0 ? `deze chat: ${tok(claude.tokensIn)} tokens erin, ${tok(claude.tokensUit)} eruit` : '',
    punten: [],
    voortgang: null,
  })

  for (const s of lokaal?.subs ?? []) {
    if (!['running', 'waiting', 'pending'].includes(s.status)) continue
    lijst.push({ sleutel: `sub-${s.id}`, naam: 'Subagent', detail: 'van Claude', kleur: GROEN, uitrusting: 'helm', actief: true, status: s.status === 'waiting' ? 'wacht' : 'bezig', statusKleur: GROEN, regel: s.naam, punten: [], voortgang: null })
  }

  const runners = lokaal?.runners ?? []
  for (const u of UITVOERDERS) {
    const i = info(u)
    const runs = runners.filter(r => r.agent === u)
    const lopend = runs.filter(r => loopt(r, nu))
    const hangt = runs.some(r => r.status === 'bezig' && !loopt(r, nu))
    const van = historie.filter(h => h.uitvoerder === u)
    const laatste = van[van.length - 1]
    const goed = van.filter(h => h.resultaat === 'klaar').length
    const tokens = van.reduce((som, h) => som + h.tokensIn + h.tokensUit, 0)
    const model = kortModel(lopend[0]?.model ?? laatste?.model ?? '')
    let status = 'standby'
    let statusKleur: string | undefined
    let regel = laatste ? `${goed} van ${van.length} klaar · ${tok(tokens)} tokens · laatst ${geleden(nu, laatste.tijd)}` : 'nog geen taken in de geschiedenis'
    const r = lopend[0]
    if (r) {
      status = lopend.length > 1 ? `${lopend.length} taken tegelijk` : `${r.fase || 'bezig'} ${duurTekst(nu - r.start * 1000)}`
      statusKleur = i.kleur
      regel = lopend.length > 1 ? lopend.map(x => x.taak.split(' ')[0]).join(', ') : r.taak
    } else if (hangt) {
      status = 'mogelijk vastgelopen'
      statusKleur = ROOD
    } else if (laatste && laatste.resultaat === 'vast') {
      regel = `laatste taak: ${oorzaak(laatste.reden ?? '')} · ${regel}`
    }
    const extra = u === 'hermes' && extern?.hermesRun ? `geplande run ${extern.hermesDuur}` : ''
    lijst.push({
      sleutel: u,
      naam: i.naam,
      detail: [model, i.soort, extra].filter(Boolean).join(' · '),
      kleur: i.kleur,
      uitrusting: i.uitrusting,
      actief: lopend.length > 0,
      status,
      statusKleur,
      regel,
      punten: van.slice(-8).map(h => (h.resultaat === 'klaar' ? GROEN : h.resultaat === 'vast' ? ROOD : AMBER)),
      voortgang: lopend.length > 0 ? Math.max(...lopend.map(x => x.voortgang)) : null,
    })
  }
  // Wie bezig is staat bovenaan.
  return [...lijst.filter(r => r.actief), ...lijst.filter(r => !r.actief)]
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
    if (m && m[1]) uit.push(schoon(m[1]))
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
    taken.push({
      nummer: i.number,
      titel: schoon(i.title),
      fase,
      status: FASEN[fase]?.tekst ?? fase,
      pr: pr?.nummer ?? 0,
      exact: pr?.exact ?? false,
      bestanden: bestandenUit(i.body ?? ''),
      uitvoerder: LABEL_VOLGORDE.find(u => labels.includes(`agent-${u}`)) ?? '',
    })
  }
  const klaar: Klaar[] = []
  for (const i of (json(gesloten) ?? []) as { number: number; title: string }[]) klaar.push({ nummer: i.number, titel: schoon(i.title) })

  const fout = issues ? '' : `GitHub gaf geen antwoord: ${schoon(diag)}`
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
        const inhoud = typeof gelezen === 'string' ? gelezen : String((gelezen as { text?: string }).text ?? '')
        for (const regel of inhoud.split(NIEUWE_REGEL).slice(-80)) {
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
            reden: schoon(String(d.reden ?? '')),
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
        const inhoud = typeof gelezen === 'string' ? gelezen : String((gelezen as { text?: string }).text ?? '')
        const klaarSleutels = new Set<string>()
        for (const regel of inhoud.split(NIEUWE_REGEL)) {
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

    // Trage ronde: GitHub-issues, open PR's en de geplande taak van Hermes.
    const externVernieuwen = async () => {
      const opties = { timeoutMs: 20000 }
      const [status, runs, issues, gesloten, prs] = await Promise.allSettled([
        $.process.run([HERMES, 'status'], opties),
        $.process.run([HERMES, 'cron', 'runs'], opties),
        $.process.run([GH, 'issue', 'list', '-R', REPO, '--state', 'open', '--limit', '40', '--json', 'number,title,labels,body'], opties),
        $.process.run([GH, 'issue', 'list', '-R', REPO, '--state', 'closed', '--label', 'agent-review', '--limit', '3', '--json', 'number,title'], opties),
        $.process.run([GH, 'pr', 'list', '-R', REPO, '--state', 'open', '--json', 'number,body,labels'], opties),
      ])
      const uitvoer = (r: PromiseSettledResult<{ exitCode: number; stdout: string }>) =>
        r.status === 'fulfilled' && r.value.exitCode === 0 ? String(r.value.stdout) : ''
      const reden = (r: PromiseSettledResult<{ exitCode: number; stdout: string; stderr?: string }>) =>
        r.status === 'rejected'
          ? `fout: ${String(r.reason).slice(0, 160)}`
          : r.value.exitCode !== 0
            ? `exit ${r.value.exitCode}: ${String(r.value.stderr ?? '').slice(0, 160)}`
            : 'ok'
      await $.state.set({ plugin: 'agents', key: 'extern' } as const, bouwExtern(uitvoer(status), uitvoer(runs), uitvoer(issues), uitvoer(gesloten), uitvoer(prs), reden(issues)))
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
    const historie = lokaal?.geschiedenis ?? []
    const pijpen = pijplijnen(nu, extern ?? null, lokaal ?? null)
    const actieLijst = acties(pijpen, lokaal ?? null)
    const bezigPijpen = pijpen.filter(p => p.staat === 'bezig')
    const wachtPijpen = pijpen.filter(p => p.staat === 'wacht')
    const alleKlaar = pijpen.filter(p => p.staat === 'klaar')
    const lijst = rijen(nu, claude ?? null, lokaal ?? null, extern ?? null)
    const tellers = {
      bezig: lijst.filter(r => r.actief && INFO[r.sleutel]).length,
      wachtrij: wachtPijpen.length,
      vast: pijpen.filter(p => p.staat === 'vast').length,
      review: pijpen.filter(p => p.staat === 'review').length,
    }
    // Modeltest: per model de resultaten, en het model dat nu draait (de mapnaam eindigt op -A of -B).
    const perModel = new Map<string, Bench[]>()
    for (const r of lokaal?.bench ?? []) perModel.set(r.model, [...(perModel.get(r.model) ?? []), r])
    const benchBezigNaam = lokaal?.benchBezig ?? ''
    const sleutel = (m: string) => m.split('/').join('-').split(':').join('-').split('.').join('-')
    const benchBezigVoor = (m: string) => (benchBezigNaam && benchBezigNaam.startsWith(sleutel(m) + '-') ? benchBezigNaam.slice(-1) : '')
    const benchModellen: [string, Bench[]][] = [...perModel.entries()]

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
      const kop = (naam: string, titel: string, aantal: number) => (
        <Button key={`kop-${naam}`} label={`${isOpen(naam) ? '▾' : '▸'} ${titel} · ${aantal}`} plain onPress={() => wissel(naam)} />
      )
      const afgerond = alleKlaar.filter(p => !verborgen.includes(p.nummer))
      const wisKlaar = () => bewaarVerborgen([...new Set([...verborgen, ...alleKlaar.map(p => p.nummer)])])
      const openTaken = bezigPijpen.length + wachtPijpen.length
      return (
        <Box flexDirection="column" gap={1}>
          <Svg source={kopSvg(b, tellers)} alt={`${tellers.bezig} bezig, ${tellers.wachtrij} in de wachtrij, ${tellers.vast} vast, ${tellers.review} wachten op review`} width={b} height={78} />
          {extern && extern.fout !== '' && <Text color="red">{extern.fout}</Text>}
          {actieLijst.length > 0 && kop('actie', 'Actie nodig', actieLijst.length)}
          {actieLijst.length > 0 && isOpen('actie') && (
            <Box flexDirection="column">
              {actieLijst.map(a => (
                <Svg key={`a-${a.nummer}`} source={actieSvg(b, a)} alt={`#${a.nummer} ${a.titel}: ${a.label}, ${a.regel}`} width={b} height={46} />
              ))}
            </Box>
          )}
          {kop('taken', 'Taken', openTaken)}
          {isOpen('taken') && (
            <Box flexDirection="column">
              {openTaken === 0 && <Text dimColor>Geen taken bezig of in de wachtrij.</Text>}
              {bezigPijpen.map(p => (
                <Svg key={`p-${p.nummer}`} source={pijpSvg(b, p, nu, 0)} alt={`#${p.nummer} ${p.titel}: ${p.statusTekst}`} width={b} height={80} />
              ))}
              {wachtPijpen.map(p => (
                <Svg key={`w-${p.nummer}`} source={wachtSvg(b, p)} alt={`#${p.nummer} ${p.titel}: in de wachtrij voor ${info(p.uitvoerder).naam}`} width={b} height={24} />
              ))}
            </Box>
          )}
          {kop('agents', 'Uitvoerders', lijst.length)}
          {isOpen('agents') && (
            <Box flexDirection="column">
              {lijst.map(r => (
                <Svg key={`r-${r.sleutel}`} source={rijSvg(b, r)} alt={`${r.naam}: ${r.status}. ${r.regel}`} width={b} height={54} />
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
                <Svg key={`k-${p.nummer}`} source={pijpSvg(b, p, nu, laatsteVoor(historie, p.nummer)?.tijd ?? 0)} alt={`#${p.nummer} ${p.titel}: gemerged`} width={b} height={80} />
              ))}
            </Box>
          )}
          {benchModellen.length > 0 && kop('test', 'Modeltest', benchModellen.length)}
          {benchModellen.length > 0 && isOpen('test') && (
            <Box flexDirection="column">
              {benchModellen.map(([model, rij]) => (
                <Svg key={model} source={benchSvg(b, model, rij, benchBezigVoor(model))} alt={`${model}: modeltest`} width={b} height={50} />
              ))}
            </Box>
          )}
          <Text dimColor>{extern ? `GitHub bijgewerkt om ${extern.bijgewerkt}` : 'GitHub wordt opgehaald...'}</Text>
        </Box>
      )
    }

    // Zonder tekenvlak (terminal): gewone tekst.
    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>
          Agents: {tellers.bezig} bezig, {tellers.wachtrij} in de wachtrij, {tellers.vast} vast, {tellers.review} review
        </Text>
        {actieLijst.map(a => (
          <Text color="red">
            #{a.nummer} {a.titel}: {a.label}, {a.regel}
          </Text>
        ))}
        {[...bezigPijpen, ...wachtPijpen].map(p => (
          <Text>
            #{p.nummer} {p.titel}: {p.statusTekst} ({info(p.uitvoerder).naam})
          </Text>
        ))}
        {lijst.map(r => (
          <Text dimColor={!r.actief}>
            {r.naam}: {r.status}. {r.regel}
          </Text>
        ))}
      </Box>
    )
  })
}
