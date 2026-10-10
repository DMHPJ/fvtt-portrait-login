param(
    [ValidateSet('install','restore','check')][string]$Mode = 'install',
    [string]$AppDirectory = '',
    [switch]$NoPause
)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding

try {
    if (-not $AppDirectory) {
        $candidates = @("$env:ProgramFiles\Foundry Virtual Tabletop", "$env:LOCALAPPDATA\Programs\Foundry Virtual Tabletop")
        $found = @($candidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'Foundry Virtual Tabletop.exe') })
        if ($found.Count -eq 1) { $AppDirectory = $found[0] }
        else {
            Add-Type -AssemblyName System.Windows.Forms
            $picker = New-Object System.Windows.Forms.FolderBrowserDialog
            $picker.Description = '请选择含 Foundry Virtual Tabletop.exe 的程序文件夹（不是 Data 文件夹）'
            if ($picker.ShowDialog() -ne 'OK') { throw '已取消，未修改任何文件。' }
            $AppDirectory = $picker.SelectedPath
            $picker.Dispose()
        }
    }
    $AppDirectory = (Resolve-Path -LiteralPath $AppDirectory).Path
    $exe = Join-Path $AppDirectory 'Foundry Virtual Tabletop.exe'
    $app = Join-Path $AppDirectory 'resources\app'
    $installer = Join-Path $PSScriptRoot 'install.mjs'
    if (-not (Test-Path -LiteralPath $exe)) { throw '此文件夹内没有 Foundry Virtual Tabletop.exe。请重新选择程序安装位置。' }
    $pkg = Get-Content -LiteralPath (Join-Path $app 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($pkg.name -ne 'foundryvtt' -or $pkg.release.generation -ne 13 -or $pkg.release.build -ne 351) { throw '仅支持 Foundry VTT 13.351，未修改程序。' }

    if ($Mode -ne 'check') {
        $running = @(Get-CimInstance Win32_Process | Where-Object {
            $_.ExecutablePath -eq $exe -or
            ($_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine.IndexOf($app, [StringComparison]::OrdinalIgnoreCase) -ge 0)
        })
        if ($running.Count) { throw '请先完全关闭 Foundry，再双击安装或还原。工具不会自动结束您的游戏。' }
        $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
        if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
            $scriptLiteral = $PSCommandPath.Replace("'", "''")
            $appLiteral = $AppDirectory.Replace("'", "''")
            $command = "& '$scriptLiteral' -Mode '$Mode' -AppDirectory '$appLiteral'"
            $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
            $child = Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -EncodedCommand $encoded" -Wait -PassThru
            exit $child.ExitCode
        }
    }

    Write-Host '正在使用 Foundry 自带的运行环境，无需安装 Node.js。'
    $oldRunAsNode = $env:ELECTRON_RUN_AS_NODE
    try {
        $env:ELECTRON_RUN_AS_NODE = '1'
        $result = & $exe $installer --app $app "--$Mode" 2>&1 | Out-String
        $resultCode = $LASTEXITCODE
        $result | Out-Host
        if ($resultCode -ne 0) { throw "接入工具执行失败（代码 $resultCode）。请保留此窗口的提示。" }
        # Check the actual files instead of interpreting a GUI process exit as success.
        $stateText = & $exe $installer --app $app --check 2>&1 | Out-String
        if ($LASTEXITCODE -ne 0) { throw '无法核对接入状态，不能确认操作成功。' }
        $state = ($stateText -join "`n") | ConvertFrom-Json
        if ($Mode -eq 'install' -and -not $state.installed) { throw '核对未通过，接入尚未完成。' }
        if ($Mode -eq 'restore' -and @($state.files | Where-Object { $_.installed }).Count) { throw '核对未通过，接入尚未完全移除。' }
    }
    finally { $env:ELECTRON_RUN_AS_NODE = $oldRunAsNode }
    if ($Mode -eq 'install') { Write-Host '安装完成！启动 Foundry，在目标世界启用模组，由 GM 保存并发布配置。' -ForegroundColor Green }
    elseif ($Mode -eq 'restore') { Write-Host '还原完成！可以重新启动 Foundry。角色配置已保留。' -ForegroundColor Green }
    else { Write-Host '检查完成，未修改文件。' -ForegroundColor Green }
    $resultCode = 0
}
catch {
    Write-Host ("操作未完成：" + $_.Exception.Message) -ForegroundColor Red
    $resultCode = 1
}
if (-not $NoPause) { [void](Read-Host '按回车关闭窗口') }
exit $resultCode
