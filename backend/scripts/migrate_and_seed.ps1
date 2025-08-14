Param(
  [switch]$VerboseOutput
)

$ErrorActionPreference = 'Stop'

Push-Location $PSScriptRoot\..
try {
  Write-Host "Running Alembic migrations..."
  $python = Join-Path $PWD ".\venv\Scripts\python.exe"
  & $python -m alembic upgrade head | Out-Host

  Write-Host "Seeding revenue banding data..."
  & $python .\seed_revenue_banding.py | Out-Host

  Write-Host "Done."
} catch {
  Write-Error $_
  exit 1
} finally {
  Pop-Location
}


