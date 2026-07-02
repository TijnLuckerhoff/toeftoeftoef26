param(
	[ValidateSet('start', 'stop', 'status')]
	[string]$Action = 'start'
)

$ErrorActionPreference = 'Stop'

$Root = $PSScriptRoot
$BackendRoot = Resolve-Path (Join-Path $Root '..\backend')
$PidFile = Join-Path $Root '.dev-pids.json'
$LogDir = Join-Path $Root '.dev-logs'

function Test-ProcessRunning {
	param([int]$ProcessId)

	try {
		$process = Get-Process -Id $ProcessId -ErrorAction Stop
		return -not $process.HasExited
	} catch {
		return $false
	}
}

function Get-ChildProcessIds {
	param([int]$ParentProcessId)

	$children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ParentProcessId"
	foreach ($child in $children) {
		Get-ChildProcessIds -ParentProcessId $child.ProcessId
		[int]$child.ProcessId
	}
}

function Get-ListeningProcessId {
	param([int]$Port)

	try {
		$connection = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
			Select-Object -First 1

		if ($null -ne $connection) {
			return [int]$connection.OwningProcess
		}
	} catch {
		return $null
	}

	return $null
}

function Stop-ProcessTree {
	param([int]$ProcessId)

	if (-not (Test-ProcessRunning -ProcessId $ProcessId)) {
		return
	}

	$processIds = @(Get-ChildProcessIds -ParentProcessId $ProcessId) + $ProcessId
	foreach ($id in $processIds | Select-Object -Unique) {
		if (Test-ProcessRunning -ProcessId $id) {
			Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
		}
	}
}

function Get-SavedProcesses {
	if (-not (Test-Path $PidFile)) {
		return $null
	}

	try {
		return Get-Content $PidFile -Raw | ConvertFrom-Json
	} catch {
		return $null
	}
}

function Show-Status {
	$saved = Get-SavedProcesses
	if ($null -eq $saved) {
		Write-Host 'No saved dev server processes found.'
		return
	}

	$backendRunning = $null -ne $saved.backend -and (Test-ProcessRunning -ProcessId ([int]$saved.backend))
	$frontendRunning = $null -ne $saved.frontend -and (Test-ProcessRunning -ProcessId ([int]$saved.frontend))

	Write-Host "Backend:  PID $($saved.backend)  Running: $backendRunning"
	Write-Host "Frontend: PID $($saved.frontend)  Running: $frontendRunning"
}

function Stop-DevServers {
	$saved = Get-SavedProcesses
	if ($null -eq $saved) {
		Write-Host 'No saved dev server processes found.'
		return
	}

	Write-Host 'Stopping frontend and backend...'

	if (($null -eq $saved.ownedFrontend) -or $saved.ownedFrontend) {
		Stop-ProcessTree -ProcessId ([int]$saved.frontend)
	}

	if (($null -eq $saved.ownedBackend) -or $saved.ownedBackend) {
		Stop-ProcessTree -ProcessId ([int]$saved.backend)
	} else {
		Write-Host "Backend PID $($saved.backend) was already running, so it was left alone."
	}

	if (Test-Path $PidFile) {
		Remove-Item -LiteralPath $PidFile -Force
	}

	Write-Host 'Stopped.'
}

function Wait-ForDevServers {
	param(
		[int]$BackendProcessId,
		[int]$FrontendProcessId,
		[bool]$OwnedBackend
	)

	Write-Host ''
	Write-Host 'Press Ctrl+C to stop frontend and backend.'

	try {
		while ($true) {
			Start-Sleep -Seconds 2

			if ($OwnedBackend -and -not (Test-ProcessRunning -ProcessId $BackendProcessId)) {
				throw 'Backend stopped unexpectedly. Check .dev-logs\backend.err.log'
			}

			if (-not (Test-ProcessRunning -ProcessId $FrontendProcessId)) {
				throw 'Frontend stopped unexpectedly. Check .dev-logs\frontend.err.log'
			}
		}
	} catch [System.Management.Automation.PipelineStoppedException] {
		# Ctrl+C stops the wait loop. The finally block below does the cleanup.
	} catch [System.OperationCanceledException] {
		# Some terminals surface Ctrl+C this way.
	} catch {
		Write-Host $_.Exception.Message
	} finally {
		Stop-DevServers
	}
}

function Start-DevServers {
	$saved = Get-SavedProcesses
	if ($null -ne $saved) {
		$backendRunning = Test-ProcessRunning -ProcessId ([int]$saved.backend)
		$frontendRunning = Test-ProcessRunning -ProcessId ([int]$saved.frontend)

		if ($backendRunning -or $frontendRunning) {
			Write-Host 'Dev servers already appear to be running:'
			Show-Status
			Wait-ForDevServers `
				-BackendProcessId ([int]$saved.backend) `
				-FrontendProcessId ([int]$saved.frontend) `
				-OwnedBackend (($null -eq $saved.ownedBackend) -or $saved.ownedBackend)
			return
		}
	}

	New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

	$backendOut = Join-Path $LogDir 'backend.log'
	$backendErr = Join-Path $LogDir 'backend.err.log'
	$frontendOut = Join-Path $LogDir 'frontend.log'
	$frontendErr = Join-Path $LogDir 'frontend.err.log'

	$ownedBackend = $true
	$existingBackendPid = Get-ListeningProcessId -Port 3010
	if ($null -ne $existingBackendPid) {
		Write-Host "Backend already running on port 3010 (PID $existingBackendPid). Reusing it."
		$backend = Get-Process -Id $existingBackendPid
		$ownedBackend = $false
	} else {
		Write-Host 'Starting backend...'
		$backend = Start-Process -FilePath 'npm.cmd' `
			-ArgumentList @('run', 'dev') `
			-WorkingDirectory $BackendRoot `
			-RedirectStandardOutput $backendOut `
			-RedirectStandardError $backendErr `
			-WindowStyle Hidden `
			-PassThru
	}

	Write-Host 'Starting frontend...'
	$frontend = Start-Process -FilePath 'npm.cmd' `
		-ArgumentList @('run', 'dev', '--', '--host', '127.0.0.1') `
		-WorkingDirectory $Root `
		-RedirectStandardOutput $frontendOut `
		-RedirectStandardError $frontendErr `
		-WindowStyle Hidden `
		-PassThru

	@{
		backend = $backend.Id
		frontend = $frontend.Id
		ownedBackend = $ownedBackend
		ownedFrontend = $true
	} | ConvertTo-Json | Set-Content -Path $PidFile

	Write-Host ''
	Write-Host 'Backend:  http://localhost:3010'
	Write-Host 'Frontend: http://localhost:5173 of de volgende vrije Vite-poort'
	Write-Host "Logs:     $LogDir"

	Wait-ForDevServers `
		-BackendProcessId $backend.Id `
		-FrontendProcessId $frontend.Id `
		-OwnedBackend $ownedBackend
}

switch ($Action) {
	'start' { Start-DevServers }
	'stop' { Stop-DevServers }
	'status' { Show-Status }
}
