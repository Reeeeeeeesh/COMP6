Param(
  [switch]$VerboseOutput
)

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot\..
try {
  Write-Host "Running backend tests..."
  ..\venv\Scripts\python -m pytest -q | Out-Host
} catch {
  Write-Error $_
  exit 1
} finally {
  Pop-Location
}


