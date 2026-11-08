#!/usr/bin/env bash
set -euo pipefail

python - "$@" <<'PY'
import json
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path


def usage():
    raise SystemExit("Gebruik: rapport.sh [begintijd] [--schrijf <pad>]")


start = None
output_path = None
args = iter(sys.argv[1:])
for arg in args:
    if arg == "--schrijf":
        if output_path is not None:
            usage()
        output_path = next(args, None)
        if output_path is None:
            usage()
    elif start is None:
        start = arg
    else:
        usage()

now = datetime.now().astimezone()
if start is None:
    since = (now - timedelta(hours=24)).date().isoformat()
else:
    try:
        since = datetime.fromisoformat(start.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        usage()


def gh_json(*args):
    result = subprocess.run(
        ["gh", *args],
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return json.loads(result.stdout)


# gh pr list retourneert de gemergde pull requests.
merged = gh_json(
    "pr", "list", "--state", "merged", "--search", f"merged:>={since}",
    "--json", "title,number,mergedAt", "--limit", "150",
)
stuck = gh_json(
    "issue", "list", "--state", "open", "--label", "agent-vast",
    "--json", "number,title", "--limit", "1000",
)
opened = gh_json(
    "issue", "list", "--state", "open", "--json", "number,title", "--limit", "1000",
)

merged.sort(key=lambda pr: pr.get("mergedAt") or "")
lines = [
    f"# GitHub-rapport — {now.date().isoformat()}",
    "",
    f"## Gemerged ({len(merged)})",
]
if merged:
    lines.extend(f"- #{pr['number']} {pr['title']}" for pr in merged)
else:
    lines.append("- Geen gemergde pull requests sinds deze datum.")

lines.extend(["", f"## Vastgelopen ({len(stuck)})"])
if stuck:
    lines.extend(f"- #{issue['number']} {issue['title']}" for issue in stuck)
else:
    lines.append("- Geen open issues met label `agent-vast`.")

lines.extend(["", f"## Open ({len(opened)})"])
if opened:
    lines.extend(f"- #{issue['number']} {issue['title']}" for issue in opened[:15])
    if len(opened) > 15:
        lines.append(f"- … en {len(opened) - 15} meer")
else:
    lines.append("- Geen open taken.")

lines.extend(["", f"Totaal: {len(merged)} gemerged, {len(opened)} open."])
report = "\n".join(lines) + "\n"

if output_path is None:
    sys.stdout.write(report)
else:
    Path(output_path).write_text(report, encoding="utf-8")
PY
