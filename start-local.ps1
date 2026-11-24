$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runtime = Join-Path $PSScriptRoot '.tools\node-v22.16.0-win-x64'
if (Test-Path -LiteralPath (Join-Path $runtime 'node.exe')) { $env:Path = "$runtime;$env:Path" }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 22+ is required.' }
if (-not (Test-Path -LiteralPath 'node_modules')) { & npm.cmd install; if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' } }
& npm.cmd run dev -- --port 5173 --strictPort
