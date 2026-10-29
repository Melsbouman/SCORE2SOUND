export type Taak = { nummer: number; titel: string; fase: string; status: string; pr: number; exact: boolean; bestanden: string[] }
export type Paneel = { dicht: string[]; verborgen: number[] }
export type Klaar = { nummer: number; titel: string }
export type ClaudeStatus = { bezig: boolean; tool: string; sinds: number; bijgewerkt: number; aantal: number; tokensIn: number; tokensUit: number }
export type Sub = { id: string; naam: string; status: string }
export type Runner = { agent: string; status: string; taak: string; model: string; start: number; bijgewerkt: number; voortgang: number; fase: string }
export type Bench = { model: string; taak: string; seconden: number; kosten: number; ok: boolean; detail: string }
export type Geschied = { tijd: number; issue: number; titel: string; uitvoerder: string; model: string; seconden: number; resultaat: string; modus: string; tokensIn: number; tokensUit: number }
export type Lokaal = { bijgewerkt: number; runners: Runner[]; subs: Sub[]; bench: Bench[]; benchBezig: string; geschiedenis: Geschied[] }
export type Extern = {
  bijgewerkt: string
  gateway: string
  model: string
  hermesRun: boolean
  hermesDuur: string
  taken: Taak[]
  klaar: Klaar[]
  fout: string
}

declare module 'claude-code' {
  interface PluginState {
    agents: { claude: ClaudeStatus | null; lokaal: Lokaal | null; extern: Extern | null; paneel: Paneel | null }
  }
}
