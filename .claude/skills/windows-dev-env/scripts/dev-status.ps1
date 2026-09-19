# dev-status.ps1 - Diagnostico del entorno de desarrollo (RutaCognitiva, Windows)
# Compatible con Windows PowerShell 5.1. Archivo en ASCII a proposito (sin acentos).
#
# Uso:
#   powershell -ExecutionPolicy Bypass -File .claude\skills\windows-dev-env\scripts\dev-status.ps1
#   powershell -ExecutionPolicy Bypass -File .claude\skills\windows-dev-env\scripts\dev-status.ps1 -Kill
#
# -Kill solo termina procesos cuya CommandLine contiene la ruta raiz del repo.

param(
    [int[]]$Ports = @(1420, 1421),
    [switch]$Kill
)

$ErrorActionPreference = 'Stop'

# --- Raiz del repo -----------------------------------------------------------
$repoRoot = $null
try { $repoRoot = (git -C $PSScriptRoot rev-parse --show-toplevel 2>$null) } catch {}
if (-not $repoRoot) { $repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path }
$repoNorm = ($repoRoot -replace '/', '\').TrimEnd('\').ToLower()
Write-Host "Repo: $repoRoot" -ForegroundColor Cyan

function Get-ProcInfo([int]$ProcId) {
    $p = Get-CimInstance Win32_Process -Filter "ProcessId=$ProcId" -ErrorAction SilentlyContinue
    if (-not $p) { return $null }
    $cmd = [string]$p.CommandLine
    $isOwn = $false
    if ($cmd) { $isOwn = (($cmd -replace '/', '\').ToLower()).Contains($repoNorm) }
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($p.ParentProcessId)" -ErrorAction SilentlyContinue
    $parentName = '(sin padre vivo)'
    if ($parent) { $parentName = $parent.Name }
    $class = 'AJENO'
    if ($isOwn) { $class = 'PROPIO' }
    $short = $cmd
    if ($short.Length -gt 110) { $short = $short.Substring(0, 110) + '...' }
    [pscustomobject]@{
        PID       = $p.ProcessId
        Nombre    = $p.Name
        PadrePID  = $p.ParentProcessId
        Padre     = $parentName
        Clase     = $class
        Comando   = $short
    }
}

# --- 1. Puertos --------------------------------------------------------------
Write-Host "`n[1] Puertos en escucha: $($Ports -join ', ')" -ForegroundColor Cyan
$portRows = @()
foreach ($port in $Ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $conns) { Write-Host "  $port libre" -ForegroundColor Green; continue }
    foreach ($c in ($conns | Select-Object -Unique OwningProcess)) {
        $info = Get-ProcInfo $c.OwningProcess
        if ($info) {
            $info | Add-Member -NotePropertyName Puerto -NotePropertyValue $port
            $portRows += $info
        }
    }
}
if ($portRows.Count -gt 0) { $portRows | Format-Table Puerto, PID, Nombre, Clase, Padre, PadrePID, Comando -AutoSize -Wrap }

# --- 2. Procesos del repo vivos (aunque no ocupen puerto) --------------------
Write-Host "[2] Procesos cuya linea de comandos contiene el repo" -ForegroundColor Cyan
$names = @('node.exe', 'cargo.exe', 'rustc.exe', 'rutacognitiva.exe', 'esbuild.exe')
$ownProcs = @()
foreach ($p in (Get-CimInstance Win32_Process | Where-Object { $names -contains $_.Name.ToLower() })) {
    $info = Get-ProcInfo $p.ProcessId
    if ($info -and $info.Clase -eq 'PROPIO') { $ownProcs += $info }
}
if ($ownProcs.Count -eq 0) { Write-Host '  Ninguno' -ForegroundColor Green }
else { $ownProcs | Format-Table PID, Nombre, Padre, PadrePID, Comando -AutoSize -Wrap }

# --- 3. Toolchain ------------------------------------------------------------
Write-Host "[3] Resolucion de 'link' en el PATH (el primero gana)" -ForegroundColor Cyan
$links = @(Get-Command link -All -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source)
if ($links.Count -eq 0) { Write-Host "  No se encontro 'link' en PATH (normal si no estas en Developer PowerShell; cargo localiza MSVC por su cuenta)" }
else {
    $links | ForEach-Object { Write-Host "  $_" }
    if ($links[0] -match '\\usr\\bin\\') {
        Write-Host "  ALERTA: el primer 'link' es de Git/MSYS. En Git Bash, cargo puede fallar con 'link: extra operand'. Compila desde PowerShell." -ForegroundColor Yellow
    }
}
foreach ($tool in @('cargo', 'rustc', 'node', 'npm')) {
    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
    if ($cmd) { Write-Host ("  {0,-6} {1}" -f $tool, $cmd.Source) } else { Write-Host "  $tool NO encontrado" -ForegroundColor Yellow }
}

# --- 4. Kill opcional --------------------------------------------------------
if ($Kill) {
    Write-Host "`n[4] -Kill: terminando solo procesos PROPIOS" -ForegroundColor Cyan
    $targets = @($portRows + $ownProcs | Where-Object { $_.Clase -eq 'PROPIO' } | Select-Object -ExpandProperty PID -Unique)
    $foreign = @($portRows | Where-Object { $_.Clase -eq 'AJENO' })
    if ($foreign.Count -gt 0) {
        Write-Host "  Hay procesos AJENOS en los puertos; NO se tocan. Revisalos manualmente." -ForegroundColor Yellow
    }
    if ($targets.Count -eq 0) { Write-Host '  Nada que terminar.' }
    foreach ($procId in $targets) {
        Write-Host "  taskkill /PID $procId /T /F"
        & taskkill.exe /PID $procId /T /F | Out-Null
    }
    Start-Sleep -Seconds 1
    foreach ($port in $Ports) {
        $still = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($still) { Write-Host "  $port SIGUE ocupado (PID $($still[0].OwningProcess))" -ForegroundColor Red }
        else { Write-Host "  $port libre" -ForegroundColor Green }
    }
}
