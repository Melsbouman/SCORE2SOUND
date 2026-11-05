# Leest tekst uit een afbeelding met de ingebouwde tekstherkenning van Windows (lokaal, zonder installatie).
# Gebruik: powershell -NoProfile -File ocr-windows.ps1 <afbeelding.png>
# Uitvoer: JSON met per regel de tekst en de woorden met hun vak in pixels van de afbeelding.
param([Parameter(Mandatory = $true)][string]$Pad)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]

$alsTaak = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Wacht($operatie, $type) {
  $taak = $alsTaak.MakeGenericMethod($type).Invoke($null, @($operatie))
  $taak.Wait(-1) | Out-Null
  $taak.Result
}

$motor = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $motor) { [Console]::Error.WriteLine('Geen tekstherkenning beschikbaar'); exit 3 }

$volledig = (Resolve-Path -LiteralPath $Pad).Path
$bestand = Wacht ([Windows.Storage.StorageFile]::GetFileFromPathAsync($volledig)) ([Windows.Storage.StorageFile])
$stroom = Wacht ($bestand.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Wacht ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stroom)) ([Windows.Graphics.Imaging.BitmapDecoder])
$beeld = Wacht ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$resultaat = Wacht ($motor.RecognizeAsync($beeld)) ([Windows.Media.Ocr.OcrResult])

$regels = foreach ($regel in $resultaat.Lines) {
  [pscustomobject]@{
    tekst = $regel.Text
    woorden = @(foreach ($woord in $regel.Words) {
      [pscustomobject]@{
        tekst = $woord.Text
        x = [math]::Round($woord.BoundingRect.X)
        y = [math]::Round($woord.BoundingRect.Y)
        breedte = [math]::Round($woord.BoundingRect.Width)
        hoogte = [math]::Round($woord.BoundingRect.Height)
      }
    })
  }
}
@{ breedte = $beeld.PixelWidth; hoogte = $beeld.PixelHeight; regels = @($regels) } | ConvertTo-Json -Depth 5 -Compress
