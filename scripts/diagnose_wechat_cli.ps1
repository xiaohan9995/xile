param(
  [int]$Port = 9435,
  [ValidateSet("open", "auto")]
  [string]$Command = "open",
  [switch]$DisableGpu,
  [switch]$Cleanup
)

$ErrorActionPreference = "Continue"
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$CliPath = Get-ChildItem -Path "${env:ProgramFiles(x86)}\Tencent" -Recurse -Filter "cli.bat" -ErrorAction SilentlyContinue |
  Select-Object -First 1 -ExpandProperty FullName
$Stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$VisualQaDir = Join-Path $ProjectRoot "docss\visual-qa"
$OutLog = Join-Path $VisualQaDir "wechat-$Command-$Port-$Stamp.log"
$ErrLog = Join-Path $VisualQaDir "wechat-$Command-$Port-$Stamp.err.log"

if (!$CliPath -or !(Test-Path $CliPath)) {
  Write-Error "WeChat DevTools CLI not found under ${env:ProgramFiles(x86)}\Tencent"
  exit 1
}

if (!(Test-Path $VisualQaDir)) {
  New-Item -ItemType Directory -Path $VisualQaDir | Out-Null
}

$args = @($Command, "--project", $ProjectRoot.Path, "--port", "$Port", "--lang", "zh", "--debug")
if ($Command -eq "auto") {
  $args += "--trust-project"
}
if ($DisableGpu) {
  $args += "--disable-gpu"
}

Write-Output "CLI: $CliPath"
Write-Output "Project: $($ProjectRoot.Path)"
Write-Output "Command: $Command"
Write-Output "Port: $Port"
Write-Output "DisableGpu: $DisableGpu"
Write-Output "Stdout: $OutLog"
Write-Output "Stderr: $ErrLog"

& $CliPath @args > $OutLog 2> $ErrLog
$ExitCode = $LASTEXITCODE
Write-Output "CLI exit code: $ExitCode"

Write-Output ""
Write-Output "Port files:"
$UserDataDir = $null
$OutText = if (Test-Path $OutLog) { Get-Content -Raw $OutLog } else { "" }
if ($OutText -match "userDirPath\s+(.+)") {
  $UserDataDir = $Matches[1].Trim()
}

foreach ($name in ".ide", ".cli", ".ide-status") {
  $file = if ($UserDataDir) { Join-Path $UserDataDir $name } else { $null }
  if ($file -and (Test-Path $file)) {
    $value = Get-Content -Raw $file
    Write-Output "$name=$value"
  } else {
    Write-Output "$name=<missing>"
  }
}

Write-Output ""
Write-Output "TCP listeners:"
Get-NetTCPConnection -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $Port, 3799 } |
  Select-Object LocalAddress, LocalPort, State, OwningProcess |
  Format-Table -AutoSize

Write-Output ""
Write-Output "DevTools processes:"
Get-Process |
  Where-Object { $_.ProcessName -like "*微信*" -or $_.ProcessName -like "*wechat*" -or $_.ProcessName -like "*WeChat*" } |
  Select-Object ProcessName, Id, Path |
  Format-Table -AutoSize

if ($Cleanup) {
  Write-Output ""
  Write-Output "Cleaning up WeChat DevTools processes..."
  Get-Process |
    Where-Object { $_.ProcessName -like "*微信*" -or $_.ProcessName -like "*wechat*" -or $_.ProcessName -like "*WeChat*" } |
    Stop-Process -Force
}

if (!$UserDataDir -or !(Test-Path (Join-Path $UserDataDir ".ide"))) {
  Write-Output ""
  Write-Output "Diagnosis: IDE HTTP port file .ide was not created. The failure is before project compilation."
  exit 2
}

exit $ExitCode
