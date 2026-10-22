[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Container })]
    [string] $BackendPath,

    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string] $PhpExe,

    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string] $CaddyExe,

    [Parameter(Mandatory = $true)]
    [ValidateScript({ Test-Path -LiteralPath $_ -PathType Leaf })]
    [string] $Caddyfile,

    [string] $FrontendDistPath,

    [string] $MySqlServiceName,

    [switch] $ReplaceExisting
)

$ErrorActionPreference = 'Stop'
$backendTaskName = 'GuroAssist Laravel Server'
$caddyTaskName = 'GuroAssist Caddy Server'
$BackendPath = (Resolve-Path -LiteralPath $BackendPath).Path
$PhpExe = (Resolve-Path -LiteralPath $PhpExe).Path
$CaddyExe = (Resolve-Path -LiteralPath $CaddyExe).Path
$Caddyfile = (Resolve-Path -LiteralPath $Caddyfile).Path

if (-not (Test-Path -LiteralPath (Join-Path $BackendPath 'artisan') -PathType Leaf)) {
    throw "No Laravel artisan file was found in BackendPath: $BackendPath"
}

if ($FrontendDistPath) {
    $FrontendDistPath = [IO.Path]::GetFullPath($FrontendDistPath)
    if (-not (Test-Path -LiteralPath $FrontendDistPath -PathType Container)) {
        throw "Frontend dist directory does not exist: $FrontendDistPath"
    }
    $caddyText = Get-Content -LiteralPath $Caddyfile -Raw
    $caddyComparable = $caddyText.Replace('\', '/')
    $distComparable = $FrontendDistPath.Replace('\', '/').TrimEnd('/')
    if (-not $caddyComparable.Contains($distComparable)) {
        throw "Caddyfile does not appear to reference FrontendDistPath ($FrontendDistPath). Update/verify the Caddyfile or omit -FrontendDistPath."
    }
}

Write-Host "`n=== GuroAssist production startup setup: environment inspection ===" -ForegroundColor Cyan
Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, OsArchitecture | Format-List

foreach ($toolName in @('php', 'composer', 'node', 'npm', 'caddy', 'cloudflared')) {
    $tool = Get-Command $toolName -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($tool) {
        $version = ''
        if ($toolName -in @('php', 'node', 'npm', 'composer', 'caddy', 'cloudflared')) {
            try { $version = (& $tool.Source --version 2>$null | Select-Object -First 1) } catch { }
        }
        [pscustomobject]@{ Tool = $toolName; Path = $tool.Source; Version = [string]$version }
    }
    else {
        [pscustomobject]@{ Tool = $toolName; Path = 'Not found on PATH'; Version = '' }
    }
}

Write-Host "`nRelevant Windows services:" -ForegroundColor Cyan
$services = Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -match 'mysql|maria|caddy|cloudflared|guro'
}
if ($services) { $services | Select-Object Name, Status, StartType | Format-Table -AutoSize }
else { Write-Host 'No matching MySQL, Caddy, cloudflared, or GuroAssist service names found.' }

Write-Host "`nRelevant listening ports (8000, 8080, 2019, 3306):" -ForegroundColor Cyan
$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in @(8000, 8080, 2019, 3306) } |
    Select-Object LocalAddress, LocalPort, OwningProcess
if ($listeners) { $listeners | Format-Table -AutoSize }
else { Write-Host 'No listeners found on those ports.' }

Write-Host "`nTask configuration:" -ForegroundColor Cyan
[pscustomobject]@{
    BackendPath       = $BackendPath
    PhpExe            = $PhpExe
    CaddyExe          = $CaddyExe
    Caddyfile         = $Caddyfile
    FrontendDistPath  = if ($FrontendDistPath) { $FrontendDistPath } else { 'Not supplied; confirm Caddyfile serves the intended dist directory' }
    MySqlServiceName  = if ($MySqlServiceName) { $MySqlServiceName } else { 'Not supplied; MySQL startup will not be changed' }
    RunAs             = 'NT AUTHORITY\SYSTEM (startup without an interactive login)'
} | Format-List

if ($MySqlServiceName) {
    $mysqlService = Get-Service -Name $MySqlServiceName -ErrorAction Stop
    Write-Host "MySQL service selected: $($mysqlService.Name) ($($mysqlService.Status))."
}

Write-Host "`nValidating Caddy configuration..." -ForegroundColor Cyan
& $CaddyExe validate --config $Caddyfile
if ($LASTEXITCODE -ne 0) { throw "Caddy config validation failed with exit code $LASTEXITCODE" }

$existingTasks = @()
foreach ($taskName in @($backendTaskName, $caddyTaskName)) {
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) { $existingTasks += $taskName }
}
if ($existingTasks.Count -gt 0 -and -not $ReplaceExisting) {
    throw "Task(s) already exist: $($existingTasks -join ', '). Review them first, or rerun with -ReplaceExisting to replace these named tasks."
}

$busyAppPorts = $listeners | Where-Object { $_.LocalPort -in @(8000, 8080, 2019) }
if ($busyAppPorts) {
    $busyList = ($busyAppPorts | ForEach-Object { "$($_.LocalAddress):$($_.LocalPort) (PID $($_.OwningProcess))" }) -join ', '
    throw "An application/Caddy port is already in use: $busyList. Identify the owning process and existing startup method before creating another server task."
}

$backendAction = New-ScheduledTaskAction `
    -Execute $PhpExe `
    -Argument 'artisan serve --host=127.0.0.1 --port=8000' `
    -WorkingDirectory $BackendPath
$caddyAction = New-ScheduledTaskAction `
    -Execute $CaddyExe `
    -Argument "run --config `"$Caddyfile`"" `
    -WorkingDirectory (Split-Path -Parent $CaddyExe)
$startupTrigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

if ($PSCmdlet.ShouldProcess($backendTaskName, 'Register startup task for Laravel')) {
    Register-ScheduledTask -TaskName $backendTaskName -Action $backendAction -Trigger $startupTrigger `
        -Principal $principal -Settings $settings -Description 'Runs the GuroAssist Laravel app on loopback port 8000.' `
        -Force:$ReplaceExisting | Out-Null
}

if ($PSCmdlet.ShouldProcess($caddyTaskName, 'Register startup task for Caddy')) {
    Register-ScheduledTask -TaskName $caddyTaskName -Action $caddyAction -Trigger $startupTrigger `
        -Principal $principal -Settings $settings -Description 'Serves GuroAssist frontend and proxies Laravel through Caddy on port 8080.' `
        -Force:$ReplaceExisting | Out-Null
}

if ($MySqlServiceName -and $PSCmdlet.ShouldProcess($MySqlServiceName, 'Set MySQL service to Automatic and start it')) {
    Set-Service -Name $MySqlServiceName -StartupType Automatic
    if ((Get-Service -Name $MySqlServiceName).Status -ne 'Running') {
        Start-Service -Name $MySqlServiceName
    }
}

Write-Host "`nChecking for an existing Cloudflare Tunnel service..." -ForegroundColor Cyan
$tunnelServices = Get-Service -ErrorAction SilentlyContinue | Where-Object { $_.Name -match 'cloudflared' }
if ($tunnelServices) {
    $tunnelServices | Select-Object Name, Status, StartType | Format-Table -AutoSize
    foreach ($service in $tunnelServices) {
        if ($PSCmdlet.ShouldProcess($service.Name, 'Set Cloudflare Tunnel service to Automatic and start it')) {
            Set-Service -Name $service.Name -StartupType Automatic
            if ((Get-Service -Name $service.Name).Status -ne 'Running') {
                Start-Service -Name $service.Name
            }
        }
    }
    Write-Host 'Existing tunnel service(s) set to start automatically. Confirm they use the intended tunnel and hostname.'
}
else {
    Write-Host 'No cloudflared service was found. Install the named tunnel as a Windows service using Cloudflare instructions; keep its token private.' -ForegroundColor Yellow
}

Write-Host "`nRegistered task status:" -ForegroundColor Cyan
Get-ScheduledTask -TaskName $backendTaskName, $caddyTaskName -ErrorAction SilentlyContinue |
    Select-Object TaskName, State | Format-Table -AutoSize

Write-Host @'

Next steps:
1. Confirm the Caddyfile's static root points to the intended frontend dist folder.
2. Confirm Laravel's production .env and MySQL permissions without printing secrets.
3. Start/test the tasks, then check http://127.0.0.1:8000/up and http://127.0.0.1:8080/.
4. Confirm the Cloudflare Tunnel service is running and routes app.pgsytems.asia to http://localhost:8080.

These tasks run as Windows SYSTEM so they start before user login. Verify SYSTEM has the needed read/write access to the project, Laravel storage, and bootstrap\cache. For a hardened installation, use a dedicated Windows service account with only the required permissions.
'@ -ForegroundColor Green
