$ErrorActionPreference = 'Stop'
$taskRoot = (Resolve-Path -LiteralPath (Split-Path -Parent $PSScriptRoot)).Path
$taskPidFile = Join-Path $taskRoot '.local\server.pid'
if (-not (Test-Path -LiteralPath $taskPidFile)) { return }
$taskProcessId = [int](Get-Content -LiteralPath $taskPidFile)
$taskProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$taskProcessId"
$taskEntry = Join-Path $taskRoot 'dist\src\main.js'
$taskNode = (Get-Command node).Source
if ($taskProcess -and $taskProcess.ExecutablePath -eq $taskNode -and $taskProcess.CommandLine.Contains($taskEntry)) {
    Stop-Process -Id $taskProcessId
    Remove-Item -LiteralPath $taskPidFile
    Write-Output "Stopped project NestJS web process $taskProcessId"
} elseif ($taskProcess) {
    Write-Warning "PID $taskProcessId no longer belongs to this project; left untouched."
}
