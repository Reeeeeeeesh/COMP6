Param(
  [switch]$NoVenv
)

# Starts backend (FastAPI/uvicorn) and frontend (Vite) together for local dev
$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend   = Join-Path $repoRoot 'backend'
$frontend  = Join-Path $repoRoot 'frontend'

Write-Host 'Starting backend on http://localhost:8000 ...'
$backendJob = Start-Job -ScriptBlock {
  Param($backendPath, $useVenv)
  Set-Location $backendPath
  if (-not $useVenv) {
    $venvAct = Join-Path $backendPath 'venv\Scripts\Activate.ps1'
    if (Test-Path $venvAct) { & $venvAct }
  }
  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
} -ArgumentList $backend, $NoVenv

Start-Sleep -Seconds 2

Write-Host 'Starting frontend on http://localhost:3000 ...'
$frontendJob = Start-Job -ScriptBlock {
  Param($frontendPath)
  Set-Location $frontendPath
  npm run dev
} -ArgumentList $frontend

Write-Host 'Both services launching. Press Ctrl+C to stop.'
Receive-Job -Job $backendJob -Keep *> $null
Receive-Job -Job $frontendJob -Keep  *> $null
Wait-Job -Any $backendJob, $frontendJob | Out-Null
