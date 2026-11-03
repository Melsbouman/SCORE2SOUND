#!/usr/bin/env bash
set -euo pipefail

cd app

if audit_json=$(npm audit --omit=dev --json 2>&1); then
  :
fi

printf '%s' "${audit_json:-}" | node -e '
let report;
try {
  report = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
} catch {
  console.log("Kon de lijst met kwetsbaarheden niet ophalen");
  process.exit(0);
}

if (report.error || !report.metadata?.vulnerabilities) {
  console.log("Kon de lijst met kwetsbaarheden niet ophalen");
  process.exit(0);
}

const counts = report.metadata.vulnerabilities;
const labels = [["low", "laag"], ["moderate", "matig"], ["high", "hoog"], ["critical", "kritiek"]];
const total = labels.reduce((sum, [severity]) => sum + (counts[severity] || 0), 0);

if (total === 0) {
  console.log("Geen bekende kwetsbaarheden");
  process.exit(0);
}

console.log(labels.map(([severity, label]) => `${label}: ${counts[severity] || 0}`).join(", "));
const packages = Object.entries(report.vulnerabilities || {})
  .filter(([, vulnerability]) => vulnerability.severity === "high" || vulnerability.severity === "critical")
  .map(([name]) => name);
console.log(`Pakketten met hoge of kritieke kwetsbaarheden: ${packages.length ? packages.join(", ") : "geen"}`);
'
