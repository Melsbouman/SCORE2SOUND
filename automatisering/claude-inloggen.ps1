# Logt het tweede Claude-account (Pro) in voor de uitvoerder agent-claude.
# De inlog komt in een eigen map (C:\Users\<naam>\.claude-uitvoerder), los van het Max-account van de Claude-app.
# Gebruik: powershell -NoProfile -ExecutionPolicy Bypass -File automatisering\claude-inloggen.ps1
# Opnieuw nodig als werkpakket.sh meldt dat agent-claude niet is ingelogd.

# Variabelen van de Claude-app eruit, anders praat het programma via het Max-account.
Get-ChildItem env: | Where-Object Name -match '^(CLAUDE|ANTHROPIC)' | ForEach-Object { Remove-Item "env:$($_.Name)" }
$env:CLAUDE_CONFIG_DIR = "$env:USERPROFILE\.claude-uitvoerder"
$claude = "$env:APPDATA\npm\node_modules\@anthropic-ai\claude-code\bin\claude.exe"

Write-Host ""
Write-Host "Log in met je TWEEDE account (Pro), niet met het Max-account." -ForegroundColor Yellow
Write-Host "Is je browser al met Max ingelogd? Kopieer dan de inloglink naar een incognitovenster."
Write-Host ""
& $claude auth login --claudeai
Write-Host ""
Write-Host "Ingelogd als:" -ForegroundColor Green
& $claude auth status --text
