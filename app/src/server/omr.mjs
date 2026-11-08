// Haalt zekerheid, plek en pagina's uit een .omr-bestand van Audiveris (een zip met per blad xml en een afbeelding).
// De MusicXML kent geen zekerheid; daarom koppelen we elke notenkop aan een noot, per maat, notenbalk en lijnpositie.
import { stapelKaart } from '../model/stapels.mjs';
import { leesXmlBoom, kind, kinderen } from '../musicxml/xml.mjs';
import { instrumentBijNaam } from '../model/instrumenten.mjs';
import { systeemOnder, systemenVan } from './letters.mjs';

const STAPPEN = 'CDEFGAB';
const REFERENTIE = { G: ['G', 4], F: ['F', 3], C: ['C', 4] };
const MARGE = 8; // pixels naast een maatstreep die nog bij de maat horen
const RUST_MAX = 0.8; // Audiveris geeft een rust hooguit deze waarde; zonder omrekenen zou elke rust onzeker lijken

const index = (stap, octaaf) => octaaf * 7 + STAPPEN.indexOf(stap);

// Lijnpositie zoals Audiveris hem telt: 0 is de middelste lijn, omhoog is negatief.
export function lijnPositie(toonhoogte, sleutel) {
  const [stap, octaaf] = REFERENTIE[sleutel.teken] ?? REFERENTIE.G;
  const midden = index(stap, octaaf) + (sleutel.octaafVerschuiving ?? 0) * 7 + (3 - sleutel.lijn) * 2;
  return midden - index(toonhoogte.stap, toonhoogte.octaaf);
}

// Per gevraagd nummer het blad uit de bestanden van leesZip; de glyph-index is groot en niet nodig.
export function bladenUitOmr(bestanden, nummers) {
  const bladen = [];
  for (const nummer of nummers) {
    const inhoud = bestanden.get(`sheet#${nummer}/sheet#${nummer}.xml`);
    if (!inhoud) continue;
    const xml = inhoud.toString('utf8').replace(/<glyph-index>[\s\S]*<\/glyph-index>/, '');
    const plaatje = xml.match(/<picture\s+width="(\d+)"\s+height="(\d+)"/);
    bladen.push({
      nummer,
      xml,
      png: bestanden.get(`sheet#${nummer}/BINARY.png`) ?? null,
      breedte: Number(plaatje?.[1] ?? 0),
      hoogte: Number(plaatje?.[2] ?? 0),
    });
  }
  return bladen;
}

// Audiveris maakt een nieuwe partij zodra hij de naam op een pagina anders leest, en vult de rest met rusten.
// book.xml zegt per pagina welke notenbalk bij welke partij hoort; daarmee zetten we de partijen weer op één lijn.
export function voegPaginasSamen(partituur, bookXml, bladen) {
  const boek = leesXmlBoom(bookXml);
  const systemen = bladen.flatMap((blad) => {
    const sheet = kinderen(boek, 'sheet').find((s) => Number(s.attr.number) === blad.nummer);
    const inBlad = kinderen(kind(leesXmlBoom(blad.xml), 'page'), 'system');
    return kinderen(sheet, 'page').flatMap((pagina) => kinderen(pagina, 'system')).map((system, index) => ({
      delen: kinderen(system, 'part').map((deel) => ({ partij: `P${deel.attr['logical-id']}`, naam: deel.attr.name ?? '' })),
      maten: kinderen(inBlad[index], 'stack').length,
    }));
  });
  const aantal = systemen[0]?.delen.length ?? 0;
  const zoek = (id) => partituur.partijen.find((partij) => partij.id === id);
  const klopt = aantal > 0 && aantal < partituur.partijen.length
    && systemen.every((system) => system.delen.length === aantal && system.delen.every((deel) => zoek(deel.partij)));
  if (!klopt) return partituur;

  const partijen = Array.from({ length: aantal }, (_, index) => {
    const namen = systemen.map((system) => system.delen[index].naam).filter(Boolean);
    const maten = [];
    let start = 0;
    for (const system of systemen) {
      const stuk = zoek(system.delen[index].partij).maten.slice(start, start + system.maten);
      for (const maat of stuk) maten.push({ ...maat, index: maten.length });
      start += system.maten;
    }
    const eerste = zoek(systemen[0].delen[index].partij);
    return { ...eerste, id: `P${index + 1}`, naam: namen.find(instrumentBijNaam) ?? namen[0] ?? eerste.naam, maten };
  });
  return { ...partituur, partijen };
}

function leesSymbool(knoop) {
  const vak = kind(knoop, 'bounds').attr;
  const [x, y, breedte, hoogte] = [vak.x, vak.y, vak.w, vak.h].map(Number);
  return {
    staff: Number(knoop.attr.staff),
    pitch: Number(knoop.attr.pitch),
    zekerheid: Number(knoop.attr['ctx-grade'] ?? knoop.attr.grade),
    x, y, breedte, hoogte,
    gebruikt: false,
  };
}

function neemLinkste(symbolen, past) {
  const kandidaten = symbolen.filter((s) => !s.gebruikt && past(s)).sort((a, b) => a.x - b.x);
  if (kandidaten[0]) kandidaten[0].gebruikt = true;
  return kandidaten[0] ?? null;
}

function woorden(waarde) {
  return String(waarde ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
}

function leesTekstplek(woord) {
  const bounds = kind(woord, 'bounds')?.attr;
  if (!bounds) return null;
  const [x, y, breedte, hoogte] = [bounds.x, bounds.y, bounds.w, bounds.h].map(Number);
  return { waarde: woord.attr?.value ?? kind(woord, 'value')?.tekst ?? '', x, y, breedte, hoogte };
}

function koppelMaat(maat, balken, stack, koppen, rusten, nummer) {
  const links = Number(stack.attr.left) - MARGE;
  const rechts = Number(stack.attr.right) + MARGE;
  const inStack = (s) => s.x + s.breedte / 2 >= links && s.x + s.breedte / 2 <= rechts;
  const zet = (element, symbool) => {
    element.zekerheid = symbool.zekerheid;
    element.plek = { blad: nummer, x: symbool.x, y: symbool.y, breedte: symbool.breedte, hoogte: symbool.hoogte };
  };
  let nietGekoppeld = 0;
  const redenen = { geenKopInMaat: 0, andereToonhoogte: 0, alGebruikt: 0 };
  for (const element of maat.elementen) {
    const staff = balken[(element.notenbalk ?? 1) - 1];
    if (element.soort === 'noot') {
      const sleutel = maat.sleutels.find((s) => s.notenbalk === element.notenbalk) ?? maat.sleutels[0];
      const positie = lijnPositie(element.toonhoogte, sleutel);
      const kop = neemLinkste(koppen, (s) => s.staff === staff && s.pitch === positie && inStack(s));
      if (kop) zet(element, kop);
      else {
        nietGekoppeld += 1;
        const koppenInMaat = koppen.filter((s) => s.staff === staff && inStack(s));
        if (koppenInMaat.length === 0) redenen.geenKopInMaat += 1;
        else if (koppenInMaat.some((s) => s.pitch === positie)) redenen.alGebruikt += 1;
        else redenen.andereToonhoogte += 1;
      }
    } else if (element.soort === 'rust') {
      const rust = neemLinkste(rusten, (s) => s.staff === staff && inStack(s));
      if (rust) {
        zet(element, rust);
        element.zekerheid = Math.min(1, Math.round((rust.zekerheid / RUST_MAX) * 1000) / 1000);
      }
    }
  }
  return { nietGekoppeld, redenen };
}

// De hokjes 1. en 2. bij een herhaling leest Audiveris wel als tekst (1. en 2_) maar niet altijd als hokje: bouw ze uit die woorden.
// Een 1. met direct daarna een 2. (hoogstens vier maten verder) geeft het eerste hokje (tot het tweede) en het tweede hokje (één maat).
export function zetHokjes(partituur, kaarten, kandidaten) {
  const gesorteerd = [...kandidaten].sort((a, b) => a.stapel - b.stapel);
  for (let i = 0; i < gesorteerd.length - 1; i += 1) {
    const een = gesorteerd[i];
    const twee = gesorteerd[i + 1];
    if (een.nummer !== 1 || twee.nummer !== 2 || twee.stapel <= een.stapel || twee.stapel - een.stapel > 4) continue;
    partituur.partijen.forEach((partij, partijIndex) => {
      const kaart = kaarten[partijIndex];
      const eerste = kaart[een.stapel];
      const tweede = kaart[twee.stapel];
      if (eerste === undefined || tweede === undefined || partij.maten.slice(eerste, tweede + 1).some((maat) => maat.volta)) return;
      const bereik = [[1, eerste, tweede - 1], [2, tweede, Math.max(tweede, (kaart[twee.stapel + 1] ?? tweede + 1) - 1)]];
      for (const [nummer, van, tot] of bereik) {
        for (let index = van; index <= tot && partij.maten[index]; index += 1) {
          partij.maten[index].volta = { nummers: [nummer], begin: index === van, eind: index === tot };
        }
      }
      // Het eerste hokje sluit af met de herhalingsstreep, ook als Audiveris die miste.
      let begin = eerste - 1;
      while (begin >= 0 && !partij.maten[begin].herhaling?.begin) begin -= 1;
      const dichtbij = partij.maten.slice(Math.max(begin, 0), tweede).some((maat) => maat.herhaling?.eind);
      if (begin >= 0 && !dichtbij) partij.maten[tweede - 1].herhaling = { ...partij.maten[tweede - 1].herhaling, eind: true, keer: 2 };
    });
  }
}

// Een maat op een pagina die niet aan het blad gekoppeld kon worden: de zekerheid is onbekend, dus hooguit 0,5 (rood in de editor).
export function maakOnzeker(maat) {
  for (const element of maat?.elementen ?? []) {
    if (element.soort === 'noot' || element.soort === 'rust') element.zekerheid = Math.min(element.zekerheid ?? 1, 0.5);
  }
}

export function koppelOmr(partituur, bladen) {
  const uit = structuredClone(partituur);
  uit.bron = { herkenning: null, bladen: bladen.map(({ nummer, breedte, hoogte }) => ({ nummer, breedte, hoogte })) };
  const overgeslagen = [];
  let nietGekoppeld = 0;
  const redenen = { geenKopInMaat: 0, andereToonhoogte: 0, alGebruikt: 0 };
  const voltaKandidaten = [];
  let maatStart = 0;
  const kaarten = uit.partijen.map((partij) => stapelKaart(partij.maten));
  const maatBij = (partijIndex, stapel) => uit.partijen[partijIndex].maten[kaarten[partijIndex][stapel]];

  for (const blad of bladen) {
    const systemen = kinderen(kind(leesXmlBoom(blad.xml), 'page'), 'system');
    const systeemplekken = systemenVan(blad.xml);
    const bladMaatStart = maatStart;
    const aantalBladMaten = systemen.reduce((aantal, system) => aantal + kinderen(system, 'stack').length, 0);
    const matenOpBlad = Array.from({ length: aantalBladMaten }, (_, index) => maatBij(0, bladMaatStart + index)).filter(Boolean);
    for (const maat of matenOpBlad) {
      for (const element of maat.elementen) if (element.soort === 'aanwijzing' && element.type === 'tekst') delete element.plek;
    }
    const tekstplekken = systemen.flatMap((system, bronSysteem) => {
      const inters = kind(kind(system, 'sig'), 'inters');
      return kinderen(inters, 'word').map(leesTekstplek).filter(Boolean).map((woord) => {
        const gevondenSysteem = systeemOnder(systeemplekken, woord.y + woord.hoogte);
        return { ...woord, systeem: gevondenSysteem >= 0 ? gevondenSysteem : bronSysteem };
      });
    });
    for (const [systemIndex, system] of systemen.entries()) {
      const stacks = kinderen(system, 'stack');
      const delen = kinderen(system, 'part');
      if (delen.length !== uit.partijen.length) {
        if (!overgeslagen.includes(blad.nummer)) overgeslagen.push(blad.nummer);
        for (let stapel = 0; stapel < stacks.length; stapel += 1) {
          uit.partijen.forEach((_, partijIndex) => maakOnzeker(maatBij(partijIndex, maatStart + stapel)));
        }
        maatStart += stacks.length;
        continue;
      }
      const inters = kind(kind(system, 'sig'), 'inters');
      const koppen = kinderen(inters, 'head').map(leesSymbool);
      const rusten = kinderen(inters, 'rest').map(leesSymbool);
      delen.forEach((deel, partijIndex) => {
        const balken = kinderen(deel, 'staff').map((staff) => Number(staff.attr.id));
        const eersteMaat = maatBij(partijIndex, maatStart);
        if (stacks.length && eersteMaat) {
          eersteMaat.regelbegin = true;
          if (systemIndex === 0) eersteMaat.paginabegin = true;
        }
        stacks.forEach((stack, stackIndex) => {
          const maat = maatBij(partijIndex, maatStart + stackIndex);
          if (maat) {
            const resultaat = koppelMaat(maat, balken, stack, koppen, rusten, blad.nummer);
            nietGekoppeld += resultaat.nietGekoppeld;
            for (const reden of Object.keys(redenen)) redenen[reden] += resultaat.redenen[reden];
            if (partijIndex === 0) {
              const links = Number(stack.attr.left) - MARGE;
              const rechts = Number(stack.attr.right) + MARGE;
              const inStack = (woord) => woord.x + woord.breedte / 2 >= links && woord.x + woord.breedte / 2 <= rechts;
              const woordenInMaat = tekstplekken.filter((woord) => woord.systeem === systemIndex && inStack(woord)).sort((a, b) => a.x - b.x);
              for (const woord of woordenInMaat) {
                const hokje = /^([12])\s*[._,:;-]?$/.exec(woord.waarde.trim());
                if (hokje) voltaKandidaten.push({ nummer: Number(hokje[1]), stapel: maatStart + stackIndex });
              }
              for (const woord of woordenInMaat) {
                const bron = matenOpBlad.find((bronMaat) => bronMaat.elementen.some((element) => {
                  if (element.soort !== 'aanwijzing' || element.type !== 'tekst' || element.plek) return false;
                  const aanwijzingWoorden = woorden(element.waarde);
                  const woordTokens = woorden(woord.waarde);
                  return woordTokens.length > 0 && woordTokens.every((token, index) => token === aanwijzingWoorden[index]);
                }));
                const element = bron?.elementen.find((kandidaat) => kandidaat.soort === 'aanwijzing' && kandidaat.type === 'tekst' && !kandidaat.plek
                  && woorden(woord.waarde).every((token, index) => token === woorden(kandidaat.waarde)[index]));
                if (!element) continue;
                if (bron !== maat) {
                  bron.elementen.splice(bron.elementen.indexOf(element), 1);
                  maat.elementen.push(element);
                }
                element.plek = { blad: blad.nummer, x: woord.x, y: woord.y, breedte: woord.breedte, hoogte: woord.hoogte };
              }
            }
          }
        });
      });
      maatStart += stacks.length;
    }
  }
  zetHokjes(uit, kaarten, voltaKandidaten);
  return { partituur: uit, nietGekoppeld, redenen, overgeslagen };
}
