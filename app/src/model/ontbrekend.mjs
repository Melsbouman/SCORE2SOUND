import { aantalUitSamengesteldeRust } from './stapels.mjs';

// Het aantal maten tussen twee plekken zoals op het blad: een meermaatsrust zonder verborgen maten erachter telt voor zijn volle
// aantal. Zonder dit ziet een tweede ronde (vulBeginRust roept deze functie ook aan) het gat opnieuw en vult hem dubbel.
function matenOpBlad(maten, van, tot) {
  let aantal = 0;
  for (let index = van; index < tot; index += 1) {
    const maat = maten[index];
    aantal += maat.maatrust > 1 && !maten[index + 1]?.verborgen ? maat.maatrust : 1;
  }
  return aantal;
}

const isCijfer = (element) => element.soort === 'aanwijzing' && element.type === 'letter'
  && /^\d+$/.test(String(element.waarde ?? '').trim());

// Repetitiecijfers die maatnummers zijn (22, 26, 30, 38 ... zoals in Distant Land): minstens drie getallen, oplopend, en een
// ervan boven de 40 (zo lang is een meermaatsrust nooit). Dan is een cijfer op een rustmaat het nummer van die maat en niet het
// aantal maten van een meermaatsrust.
function cijfersZijnMaatnummers(partij) {
  const getallen = partij.maten.flatMap((maat) => maat.elementen.filter(isCijfer).map((element) => Number(String(element.waarde).trim())));
  return getallen.length >= 3 && Math.max(...getallen) > 40 && getallen.every((getal, index) => index === 0 || getal >= getallen[index - 1]);
}

const cijferWaarde = (element) => Number(String(element.waarde).trim());

// Audiveris hangt een repetitiecijfer dat boven het begin van een maat staat vaak aan de maat ervoor: het kader 30 van Distant
// Land komt op de rust van 4 maten (26 tot 29), het kader 41 van Sand and Stars op de rust van 6 maten ervoor. Bij cijfers die
// maatnummers zijn gaat zo'n cijfer naar de volgende maat als het op een meermaatsrust staat en het aantal maten sinds het vorige
// cijfer (of sinds het begin) alleen dan klopt. Bij een gewone maat kan dat ook een ontbrekende maat zijn; die blijft staan.
// Staan er twee cijfers in één maat, dan gaat het hoogste naar de volgende maat.
function zetCijfersOpHunMaat(partij) {
  const maten = partij.maten;
  const volgendeZichtbare = (index) => {
    let volgende = index + 1;
    while (maten[volgende]?.verborgen) volgende += 1;
    return volgende < maten.length ? volgende : null;
  };
  let vorige = { index: maten[0]?.opmaat ? 1 : 0, nummer: 1 };
  for (let index = 0; index < maten.length; index += 1) {
    const cijfers = maten[index].elementen.filter(isCijfer).sort((a, b) => cijferWaarde(a) - cijferWaarde(b));
    if (cijfers.length === 0) continue;
    const naIndex = volgendeZichtbare(index);
    const verplaats = (cijfer) => {
      maten[index].elementen = maten[index].elementen.filter((element) => element !== cijfer);
      maten[naIndex].elementen.unshift(cijfer);
    };
    if (naIndex !== null) cijfers.slice(1).forEach(verplaats);
    const nummer = cijferWaarde(cijfers[0]);
    const verschil = nummer - vorige.nummer;
    if (naIndex !== null && index >= vorige.index && matenOpBlad(maten, index, naIndex) >= 2
      && verschil !== matenOpBlad(maten, vorige.index, index)
      && verschil === matenOpBlad(maten, vorige.index, naIndex)) {
      verplaats(cijfers[0]);
      vorige = { index: naIndex, nummer };
    } else {
      vorige = { index, nummer };
    }
  }
}

// Een maat met alleen een rust (geen noten), die nog geen meermaatsrust is.
function alleenEenRust(maten, index) {
  const maat = maten[index];
  return Boolean(maat) && !maat.verborgen && !(maat.maatrust > 1) && !maten[index + 1]?.verborgen
    && maat.elementen.some((element) => element.soort === 'rust') && !maat.elementen.some((element) => element.soort === 'noot');
}

export function vulOntbrekendeMaten(partituur) {
  const kopie = structuredClone(partituur);
  const eerstePartij = kopie.partijen?.[0];
  if (!eerstePartij) return kopie;

  const maatnummers = cijfersZijnMaatnummers(eerstePartij);
  if (maatnummers) kopie.partijen.forEach(zetCijfersOpHunMaat);
  const samengesteldeRusten = maatnummers ? [] : eerstePartij.maten.flatMap((maat, index) => {
    const aantal = aantalUitSamengesteldeRust(maat);
    return aantal === null ? [] : [{ index, aantal }];
  });
  for (const partij of kopie.partijen) {
    for (const { index, aantal } of samengesteldeRusten.toReversed()) {
      const maat = partij.maten[index];
      if (!maat) continue;
      maat.maatrust = aantal;
      maat.elementen = maat.elementen.filter((element) => !(
        element.soort === 'aanwijzing'
        && element.type === 'letter'
        && String(element.waarde ?? '').trim() === String(aantal)
      ));
      const nummer = Number(maat.nummer);
      // Een verborgen maat krijgt alleen de rust: een repetitiecijfer of tekst op de rustmaat hoort maar één keer in het stuk.
      const verborgenMaten = Array.from({ length: aantal - 1 }, (_, positie) => {
        const verborgen = {
          ...structuredClone(maat),
          ...(Number.isInteger(nummer) ? { nummer: String(nummer + positie + 1) } : {}),
          verborgen: true,
          regelbegin: false,
          paginabegin: false,
          tempo: null,
          elementen: maat.elementen.filter((element) => element.soort === 'rust').map((rust) => ({ ...structuredClone(rust), zekerheid: 1 })),
        };
        for (const veld of ['maatrust', 'vak', 'herhaling', 'volta', 'sprong', 'maatstreep']) delete verborgen[veld];
        return verborgen;
      });
      partij.maten.splice(index + 1, 0, ...verborgenMaten);
      if (Number.isInteger(nummer)) {
        for (const volgende of partij.maten.slice(index + aantal)) {
          const volgendNummer = Number(volgende.nummer);
          if (Number.isInteger(volgendNummer)) volgende.nummer = String(volgendNummer + aantal - 1);
        }
      }
    }
    partij.maten.forEach((maat, index) => {
      maat.index = index;
    });
  }

  // Gedrukte maatnummers tellen alleen als de partij geen genummerde repetitiecijfers heeft: die zijn betrouwbaarder (een kader
  // tegenover een klein getal dat de tekstherkenning soms verkeerd leest).
  const metCijfers = eerstePartij.maten.some((maat) => maat.elementen.some(isCijfer));
  let laatsteGedrukt = -Infinity;
  const cijfers = eerstePartij.maten.flatMap((maat, index) => {
    const aanwijzing = maat.elementen.find((element) => (
      element.soort === 'aanwijzing'
      && element.type === 'letter'
      && /^\d+$/.test(String(element.waarde ?? '').trim())
    ));
    if (aanwijzing) return [{ index, nummer: Number(String(aanwijzing.waarde).trim()) }];
    // Het gedrukte maatnummer aan het begin van een regel (zetGedrukteNummers) telt ook als anker.
    // Strikt oplopend: hetzelfde of een lager nummer is verkeerd gelezen of hoort niet bij een regelbegin.
    if (metCijfers || !Number.isInteger(maat.gedruktNummer) || maat.gedruktNummer <= laatsteGedrukt) return [];
    laatsteGedrukt = maat.gedruktNummer;
    return [{ index, nummer: maat.gedruktNummer, gedrukt: true }];
  });
  const gaten = [];
  for (let index = 1; index < cijfers.length; index += 1) {
    const vorige = cijfers[index - 1];
    const huidige = cijfers[index];
    const verwacht = huidige.nummer - vorige.nummer;
    const werkelijk = matenOpBlad(eerstePartij.maten, vorige.index, huidige.index);
    const aantal = verwacht - werkelijk;
    // Een gedrukt nummer kan verkeerd gelezen zijn (106 als 166): alleen aanvullen als het volgende anker het bevestigt, dus als er
    // daarna niet te veel maten zouden staan.
    const volgende = cijfers[index + 1];
    // Ook het laatste gedrukte nummer: zonder volgend nummer geen bevestiging, dus niet aanvullen.
    const bevestigd = !(vorige.gedrukt || huidige.gedrukt)
      || (volgende && volgende.nummer - huidige.nummer >= matenOpBlad(eerstePartij.maten, huidige.index, volgende.index));
    if (verwacht > 0 && aantal > 0 && aantal <= 40 && bevestigd) {
      const leeg = [];
      const rustmaten = [];
      for (let maatIndex = vorige.index; maatIndex < huidige.index; maatIndex += 1) {
        const maat = eerstePartij.maten[maatIndex];
        // Leeg in alle partijen: anders zou de rust de noten van een andere partij wissen.
        const leegInAlle = kopie.partijen.every((partij) => {
          const kandidaat = partij.maten[maatIndex];
          // Een partij zonder maat op die plek (korter, of een andere partij na het splitsen) houdt het niet tegen.
          return !kandidaat || !kandidaat.elementen.some((element) => ['noot', 'rust'].includes(element.soort));
        });
        if (maat && !maat.verborgen && leegInAlle) {
          leeg.push(maatIndex);
        } else if (kopie.partijen.every((partij) => (partij === eerstePartij || partij.maten[maatIndex]) ? alleenEenRust(partij.maten, maatIndex) : true)) {
          rustmaten.push(maatIndex);
        }
      }
      // Geen lege maat, wel precies één rustmaat in het gat: dat is meestal een meermaatsrust waarvan het cijfer niet gelezen
      // is (Devils Galop maat 53, een rust van 3 maten). Die krijgt het ontbrekende aantal, in plaats van nieuwe maten vlak voor
      // het volgende cijfer.
      gaten.push({ index: huidige.index, aantal, leeg: leeg.length > 0 ? leeg : rustmaten.length === 1 ? rustmaten : [] });
    }
  }

  for (const partij of kopie.partijen) {
    const origineleIndex = new Map(partij.maten.map((maat, index) => [maat, index]));
    const ingevoegdeMaten = new Map();
    for (const gat of gaten.toReversed()) {
      if (gat.leeg.length > 0) {
        const perMaat = 1 + Math.floor(gat.aantal / gat.leeg.length);
        const extra = gat.aantal % gat.leeg.length;
        gat.leeg.forEach((maatIndex, index) => {
          const maat = partij.maten[maatIndex];
          if (!maat) return;
          const maatrust = perMaat + (index < extra ? 1 : 0);
          maat.maatrust = maatrust;
          // Een repetitiecijfer of tekst op de maat blijft staan.
          maat.elementen = [{
            soort: 'rust',
            start: 0,
            duur: Math.round(maat.maatsoort.teller * 1920 / maat.maatsoort.noemer),
            stem: 1,
            notenbalk: 1,
            heleMaat: true,
            zekerheid: 0.3,
          }, ...maat.elementen.filter((element) => element.soort !== 'noot' && element.soort !== 'rust')];
        });
        continue;
      }

      const volgende = partij.maten[gat.index];
      if (!volgende) continue;
      const nummerVolgende = Number(volgende.nummer);
      const eerderIngevoegd = extraVoorIndex(gaten, gat.index);
      const nieuweMaten = Array.from({ length: gat.aantal }, (_, index) => {
        const maatsoort = structuredClone(volgende.maatsoort);
        const nieuweMaat = {
          nummer: Number.isInteger(nummerVolgende)
            ? String(nummerVolgende + eerderIngevoegd + index)
            : volgende.nummer,
          index: gat.index + index,
          ingevoegd: true,
          opmaat: false,
          maatsoort,
          toonsoort: structuredClone(volgende.toonsoort ?? partij.maten[gat.index - 1]?.toonsoort),
          sleutels: [],
          tempo: null,
          herhaling: { begin: false, eind: false, keer: 2 },
          elementen: [{
            soort: 'rust',
            start: 0,
            duur: Math.round(maatsoort.teller * 1920 / maatsoort.noemer),
            stem: 1,
            notenbalk: 1,
            heleMaat: true,
            zekerheid: 0.3,
          }],
        };
        ingevoegdeMaten.set(nieuweMaat, true);
        return nieuweMaat;
      });
      partij.maten.splice(gat.index, 0, ...nieuweMaten);
    }

    partij.maten.forEach((maat, index) => {
      maat.index = index;
      if (!ingevoegdeMaten.has(maat)) {
        const oorspronkelijkNummer = Number(maat.nummer);
        if (Number.isInteger(oorspronkelijkNummer)) {
          const oorspronkelijkeIndex = origineleIndex.get(maat);
          maat.nummer = String(oorspronkelijkNummer + extraVoorIndex(gaten, oorspronkelijkeIndex, true));
        }
      }
    });
  }
  kopie.partijen.forEach(vouwRustenUit);
  return kopie;
}

// Een meermaatsrust zonder verborgen maten erachter (de vorm die het aanvullen hierboven maakt) krijgt ze alsnog: de weergave en het
// afspelen rekenen op maatrust N met N-1 verborgen maten (docs/model.md). De nummers van de maten erna tellen de rust al mee.
function vouwRustenUit(partij) {
  const uit = [];
  partij.maten.forEach((maat, index) => {
    uit.push(maat);
    if (!(maat.maatrust > 1) || maat.verborgen || partij.maten[index + 1]?.verborgen) return;
    const nummer = Number(maat.nummer);
    for (let plek = 1; plek < maat.maatrust; plek += 1) {
      const verborgen = {
        ...structuredClone(maat),
        ...(Number.isInteger(nummer) ? { nummer: String(nummer + plek) } : {}),
        verborgen: true,
        regelbegin: false,
        paginabegin: false,
        tempo: null,
        elementen: maat.elementen.filter((element) => element.soort === 'rust').map((rust) => ({ ...structuredClone(rust), zekerheid: 1 })),
      };
      verborgen.herhaling = { begin: false, eind: false, keer: 2 };
      for (const veld of ['maatrust', 'vak', 'volta', 'sprong', 'ingevoegd', 'maatstreep']) delete verborgen[veld];
      uit.push(verborgen);
    }
  });
  partij.maten = uit;
  partij.maten.forEach((maat, index) => {
    maat.index = index;
  });
}

function extraVoorIndex(gaten, index, invoegingOpIndexTeltMee = false) {
  return gaten.reduce((totaal, gat) => {
    if (gat.leeg.length === 0) {
      return totaal + (gat.index < index || (invoegingOpIndexTeltMee && gat.index === index) ? gat.aantal : 0);
    }
    return totaal + gat.leeg.reduce((extra, maatIndex, maatPositie) => (
      extra + (maatIndex < index
        ? Math.floor(gat.aantal / gat.leeg.length) + (maatPositie < gat.aantal % gat.leeg.length ? 1 : 0)
        : 0)
    ), 0);
  }, 0);
}
