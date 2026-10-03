# Exécute un fichier SQL sur le projet Supabase via l'API Management.
# Usage : $env:SBT='<token>'; ./dev/run-sql.ps1 -File supabase/schema.sql [-Pre "drop ..."]
param([string]$File, [string]$Pre = "", [string]$Ref = "gsucuwsrsabiflwebxbo")
$sql = $Pre + "`n" + [IO.File]::ReadAllText((Resolve-Path $File), [Text.Encoding]::UTF8)
$body = @{ query = $sql } | ConvertTo-Json -Compress
$h = @{ Authorization = "Bearer $env:SBT"; "Content-Type" = "application/json" }
try {
  $r = Invoke-RestMethod -Method Post -Uri "https://api.supabase.com/v1/projects/$Ref/database/query" -Headers $h -Body ([Text.Encoding]::UTF8.GetBytes($body)) -TimeoutSec 180
  "OK"; $r | ConvertTo-Json -Depth 4 -Compress
} catch {
  "ERREUR: " + $_.Exception.Message
  if ($_.ErrorDetails) { $_.ErrorDetails.Message }
}
