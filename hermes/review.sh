#!/bin/bash
# Overzicht voor Claude: wat moet er nog beoordeeld worden, en hoeveel werk is dat?
# Het script heeft de bestanden, de regels, de syntax en de tests al gecontroleerd en zelf herstelrondes gedaan.
# Claude hoeft dat niet over te doen; dit overzicht zegt per PR wat er nog overblijft.
#
# Gebruik: bash hermes/review.sh
export PYTHONUTF8=1
GH="${GH:-/c/Program Files/GitHub CLI/gh.exe}"
R="${AIFLOW_REPO:-Melsbouman/SCORE2SOUND}"
WERK="$(mktemp -d)"

"$GH" pr list -R "$R" --state open --json number,title,body,labels,additions,deletions,statusCheckRollup > "$WERK/prs.json" || { echo "PR's lezen mislukt"; exit 1; }
"$GH" issue list -R "$R" --state open --label agent-vast --json number,title,comments > "$WERK/vast.json" 2>/dev/null || echo '[]' > "$WERK/vast.json"

python -I -X utf8 - "$WERK/prs.json" "$WERK/vast.json" <<'EOF'
import json, re, sys
prs = json.load(open(sys.argv[1], encoding='utf-8'))
vast = json.load(open(sys.argv[2], encoding='utf-8'))

def action(p):
    staten = [(c.get('conclusion') or c.get('state') or c.get('status') or '').upper() for c in p.get('statusCheckRollup') or []]
    if not staten: return 'geen'
    if any(s in ('FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT') for s in staten): return 'faalt'
    if all(s in ('SUCCESS', 'NEUTRAL', 'SKIPPED') for s in staten): return 'groen'
    return 'loopt'

rijen = []
for p in prs:
    body = p.get('body') or ''
    m = re.search(r'Hoort bij #(\d+)', body)
    if not m: continue  # geen PR van het runner-script
    labels = {l['name'] for l in p['labels']}
    let_op = [r[len('Let op: '):] for r in body.splitlines() if r.startswith('Let op: ')]
    terug = 'Teruggedraaid' in body
    herstel = re.search(r'Herstelrondes door het script: (\d+)', body)
    a = action(p)
    grootte = p['additions'] + p['deletions']
    if a == 'faalt': wat = 'Action faalt: lees alleen de foutmelding (gh pr checks), daarna agent-terug'
    elif a in ('loopt', 'geen'): wat = 'wacht op de Action'
    elif 'agent-exact' in labels and not let_op and not terug: wat = 'precies zoals de taak: mergen zonder de diff te lezen'
    elif grootte <= 20 and not let_op and not terug: wat = f'klein ({grootte} regels): diff vluchtig lezen'
    else: wat = f'diff lezen ({grootte} regels)'
    rijen.append((p['number'], m.group(1), p['title'], wat, let_op, terug, herstel.group(1) if herstel else '0'))

if not rijen and not vast:
    print('Niets te beoordelen.')
for nr, issue, titel, wat, let_op, terug, herstel in rijen:
    print(f'PR #{nr} (issue #{issue}) {titel}')
    print(f'  {wat}' + (f'; {herstel} herstelronde(s) door het script' if herstel != '0' else ''))
    for w in let_op: print(f'  let op: {w}')
    if terug: print('  let op: het script draaide bestanden terug die niet in de taak stonden')
for i in vast:
    reden = next((c['body'] for c in reversed(i.get('comments') or []) if c['body'].startswith('De runner liep vast:')), '')
    print(f'VAST issue #{i["number"]} {i["title"]}')
    if reden: print(f'  {reden[:300]}')
    print('  verbeter de taak (kleiner, preciezer) en zet agent-ready terug, of doe hem zelf')
if rijen:
    print()
    print('Mergen: gh pr merge <nr> --merge --delete-branch, daarna het issue sluiten.')
EOF
