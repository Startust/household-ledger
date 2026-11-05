param([switch]$Demo)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Push-Location $taskRoot
try {
    if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Install Node.js 24.22.1 LTS first.' }
    node -e "const v=process.versions.node.split('.').map(Number); if(v[0]!==24 || v[1]<22 || (v[1]===22 && v[2]<1)) process.exit(1)"
    if ($LASTEXITCODE -ne 0) { throw 'Node.js >=24.22.1 <25 is required.' }
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
    node scripts/init-local.mjs
    if ($LASTEXITCODE -ne 0) { throw 'Local configuration generation failed.' }
    docker compose up -d --wait postgres
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL startup failed. Start Docker Desktop and retry.' }
    npm run db:migrate
    if ($LASTEXITCODE -ne 0) { throw 'Migration failed.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
    if ($Demo) {
        npm run seed:demo
        if ($LASTEXITCODE -ne 0) { throw 'Demo seed failed; -Demo requires an empty database.' }
    }
    Write-Output 'Ready. Web: npm start | Worker (another terminal): npm run worker'
    Write-Output 'Home Ledger: http://127.0.0.1:8765/'
    Write-Output 'Swagger: http://127.0.0.1:8765/api/docs'
} finally {
    Pop-Location
}
