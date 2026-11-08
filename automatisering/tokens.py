"""Bepaalt hoeveel tokens een run heeft gebruikt, voor het runner-script.

Gebruik:
  python tokens.py codex <uitvoerbestand>
      Leest de JSON-regels van het Codex-programma (codex exec --json) en telt het "usage" van elke beurt op.
  python tokens.py copilot <uitvoerbestand>
      Leest de samenvatting van het Copilot-programma (regel "Tokens" met een pijl omhoog en omlaag).
  python tokens.py hermes <logbestand> <starttijd in seconden> <model>
      Telt de aanroepen van dat model in het logboek van Hermes vanaf de starttijd bij elkaar op.

Schrijft twee getallen, gescheiden door een spatie: tokens erin en tokens eruit. Bij een fout: "0 0".
"""
import json
import re
import sys
import time

OMHOOG = chr(0x2191)
OMLAAG = chr(0x2193)
EENHEDEN = {"": 1, "k": 1000, "m": 1000000}


def getal(waarde, eenheid):
    return int(float(waarde) * EENHEDEN[eenheid.lower()])


def codex(pad):
    erin = 0
    eruit = 0
    for regel in open(pad, encoding="utf-8", errors="replace"):
        try:
            d = json.loads(regel)
        except ValueError:
            continue
        gebruik = d.get("usage") if isinstance(d, dict) else None
        if d.get("type") == "turn.completed" and isinstance(gebruik, dict):
            erin += int(gebruik.get("input_tokens", 0))
            eruit += int(gebruik.get("output_tokens", 0))
    return erin, eruit


def copilot(pad):
    tekst = open(pad, encoding="utf-8", errors="replace").read()
    erin = re.search(OMHOOG + r"\s*([\d.]+)\s*([kKmM]?)", tekst)
    eruit = re.search(OMLAAG + r"\s*([\d.]+)\s*([kKmM]?)", tekst)
    return (getal(*erin.groups()) if erin else 0, getal(*eruit.groups()) if eruit else 0)


def hermes(pad, start, model):
    erin = 0
    eruit = 0
    patroon = re.compile(r"model=(\S+).*? in=(\d+) out=(\d+)")
    for regel in open(pad, encoding="utf-8", errors="replace"):
        if "API call #" not in regel:
            continue
        try:
            tijd = time.mktime(time.strptime(regel[:19], "%Y-%m-%d %H:%M:%S"))
        except ValueError:
            continue
        if tijd < start - 1:
            continue
        m = patroon.search(regel)
        if m and m.group(1) == model:
            erin += int(m.group(2))
            eruit += int(m.group(3))
    return erin, eruit


try:
    if sys.argv[1] == "codex":
        a, b = codex(sys.argv[2])
    elif sys.argv[1] == "copilot":
        a, b = copilot(sys.argv[2])
    else:
        a, b = hermes(sys.argv[2], float(sys.argv[3]), sys.argv[4])
except Exception:
    a, b = 0, 0
print(a, b)
