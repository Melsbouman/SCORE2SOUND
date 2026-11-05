# Wordt elk uur door de Windows-taak "SCORE2SOUND-hartslag" gestart. Schrijft de uitkomst naar ~/.aiflow-status/hartslag.log
$log = Join-Path $env:USERPROFILE '.aiflow-status\hartslag.log'
$uit = & 'C:\Program Files\Git\bin\bash.exe' -c 'cd /c/SCORE2SOUND && bash hermes/hartslag.sh' 2>&1 | Out-String
Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format 'HH:mm:ss'), $uit.Trim())
