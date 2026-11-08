# Logt het tweede Claude-account (Pro) in voor de uitvoerder agent-claude.
# De inlog komt in een eigen map (C:\Users\<naam>\.claude-uitvoerder), los van het Max-account van de Claude-app.
# Gebruik: powershell -NoProfile -ExecutionPolicy Bypass -File automatisering\claude-inloggen.ps1 -Account naam@voorbeeld.nl
# Opnieuw nodig als werkpakket.sh meldt dat agent-claude niet is ingelogd.
param([string]$Account = "")

# Variabelen van de Claude-app eruit, anders praat het programma via het Max-account.
Get-ChildItem env: | Where-Object Name -match '^(CLAUDE|ANTHROPIC)' | ForEach-Object { Remove-Item "env:$($_.Name)" }
$env:CLAUDE_CONFIG_DIR = "$env:USERPROFILE\.claude-uitvoerder"
$claude = "$env:APPDATA\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe"

Write-Host ""
Write-Host "Log in met je TWEEDE account (Pro) $Account, niet met het Max-account." -ForegroundColor Yellow
Write-Host "De browser gebruikt het account dat op claude.ai openstaat: log daar eerst uit of wissel van account."
Write-Host ""
$extra = @()
if ($Account) { $extra = @('--email', $Account) }
& $claude auth login --claudeai @extra
Write-Host ""
$stand = (& $claude auth status --text) -join "`n"
Write-Host $stand
if ($Account -and $stand -notmatch [regex]::Escape($Account)) {
  Write-Host ""
  Write-Host "LET OP: ingelogd met een ander account dan $Account. Log uit op claude.ai en draai dit script opnieuw." -ForegroundColor Red
} else {
  Write-Host ""
  Write-Host "Klaar. Je kunt op claude.ai weer met je Max-account inloggen." -ForegroundColor Green
}
