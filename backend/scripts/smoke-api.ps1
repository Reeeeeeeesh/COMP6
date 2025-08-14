Param(
  [string]$BaseUrl = 'http://localhost:8000'
)

$ErrorActionPreference = 'Stop'

function Invoke-Json {
  Param(
    [Parameter(Mandatory=$true)][string]$Method,
    [Parameter(Mandatory=$true)][string]$Url,
    [hashtable]$Body
  )
  if ($Body) {
    $json = ($Body | ConvertTo-Json -Depth 10)
    return Invoke-RestMethod -Method $Method -Uri $Url -Body $json -ContentType 'application/json'
  } else {
    return Invoke-RestMethod -Method $Method -Uri $Url
  }
}

function Assert($cond, $msg) {
  if (-not $cond) { throw "SMOKE FAIL: $msg" }
}

try {
  Write-Host "SMOKE: GET teams"
  $teamsPayload = Invoke-Json -Method GET -Url "$BaseUrl/api/v1/revenue-banding/teams"
  Assert $teamsPayload.success "GET teams did not return success"

  Write-Host "SMOKE: GET configs"
  $configsPayload = Invoke-Json -Method GET -Url "$BaseUrl/api/v1/revenue-banding/configs"
  Assert $configsPayload.success "GET configs did not return success"
  $configId = $null
  if ($configsPayload.data -and $configsPayload.data.Count -gt 0) { $configId = $configsPayload.data[0].id }

  $suffix = -join ((65..90) | Get-Random -Count 6 | ForEach-Object {[char]$_})
  $teamName = "Smoke Team $suffix"

  Write-Host "SMOKE: POST team $teamName"
  $createTeam = Invoke-Json -Method POST -Url "$BaseUrl/api/v1/revenue-banding/teams" -Body @{ name=$teamName; division='QA'; peer_group='Smoke' }
  Assert $createTeam.success "POST team failed"
  $teamId = $createTeam.data.id

  Write-Host "SMOKE: PUT team division update"
  $updateTeam = Invoke-Json -Method PUT -Url "$BaseUrl/api/v1/revenue-banding/teams/$teamId" -Body @{ division='QA-Updated' }
  Assert $updateTeam.success "PUT team failed"

  Write-Host "SMOKE: GET preview"
  $previewUrl = "$BaseUrl/api/v1/revenue-banding/preview?team_id=$teamId"
  if ($configId) { $previewUrl = "$previewUrl&config_id=$configId" }
  $preview = Invoke-Json -Method GET -Url $previewUrl
  Assert $preview.success "Preview failed"
  Assert ($preview.data.band -and $preview.data.multiplier -ne $null) "Preview missing band or multiplier"

  Write-Host "SMOKE: DELETE team"
  $del = Invoke-Json -Method DELETE -Url "$BaseUrl/api/v1/revenue-banding/teams/$teamId"
  Assert $del.success "DELETE team failed"

  Write-Host "SMOKE: SUCCESS"
  exit 0
} catch {
  Write-Error $_
  exit 1
}


