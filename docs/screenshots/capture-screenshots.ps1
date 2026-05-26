# Professional Screenshot Capture Script
# Captures screenshots for the OpenClaw Health Monitor showcase
# Output: Multiple PNG files in docs/screenshots/

param(
    [string]$OutputDir = $PSScriptRoot
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$screenshots = @{
    "dashboard-auth"   = "Auth modal with security warnings"
    "dashboard-live"   = "Live gauges and metrics"
    "test-suite"       = "30/30 tests passing"
    "clawhub-plugin"   = "ClawHub plugin page"
    "code-showcase"    = "Code + architecture"
}

function Take-Screenshot {
    param([string]$Filename, [string]$Description)
    
    $path = Join-Path $OutputDir "$Filename.png"
    Write-Host "Capturing: $Description"
    
    # Capture full screen
    $screen = [System.Windows.Forms.Screen]::PrimaryScreen
    $bounds = $screen.Bounds
    $bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "  Saved: $path"
    return $path
}

Write-Host "========================================"
Write-Host "  OpenClaw Health Monitor Screenshots"
Write-Host "========================================"
Write-Host ""

$token = $env:OPENCLAW_GATEWAY_TOKEN
if (-not $token) {
    Write-Host "WARNING: OPENCLAW_GATEWAY_TOKEN not set."
    Write-Host "Dashboard screenshots may show auth error."
}

# --- Screenshot 1: Dashboard Auth Modal ---
Write-Host ""
Write-Host "[1/5] Dashboard Auth Modal"
Write-Host "Opening browser to dashboard..."
Start-Process "http://127.0.0.1:18789/__openclaw__/canvas/winhealth/"
Start-Sleep -Seconds 4
Take-Screenshot "dashboard-auth" "Auth modal with localStorage + plain HTTP warnings"

# --- Screenshot 2: ClawHub Plugin Page ---
Write-Host ""
Write-Host "[2/5] ClawHub Plugin Page"
Write-Host "Opening browser to ClawHub..."
Start-Process "https://clawhub.ai/plugins/@jordan-thirkle/openclaw-winhealth"
Start-Sleep -Seconds 5
Take-Screenshot "clawhub-plugin" "ClawHub plugin listing page"

# --- Screenshot 3: Test Suite ---
Write-Host ""
Write-Host "[3/5] Test Suite"
Write-Host "Running npm test..."
$testOutput = & npm --prefix "D:\Projects\openclaw-winhealth" test 2>&1 | Out-String
$testOutputPath = Join-Path $OutputDir "test-output-v1.6.0.txt"
$testOutput | Out-File -FilePath $testOutputPath -Encoding UTF8
Write-Host "Test output saved to: $testOutputPath"
Write-Host ""
Write-Host "Make sure your terminal is visible showing the test results..."
Write-Host "Press ENTER when terminal shows test output..."
Read-Host
Take-Screenshot "test-suite" "30/30 tests passing in terminal"

# --- Screenshot 4: Dashboard Live ---
Write-Host ""
Write-Host "[4/5] Dashboard Live (requires connected dashboard)"
Write-Host "1. Open the dashboard"
Write-Host "2. Enter your gateway token"
Write-Host "3. Wait for metrics to load"
Write-Host "Press ENTER when dashboard is showing live data..."
Read-Host
Take-Screenshot "dashboard-live" "Live dashboard with gauges and metrics"

# --- Screenshot 5: Code + Architecture ---
Write-Host ""
Write-Host "[5/5] Code + Architecture"
Write-Host "Opening VS Code or file explorer to show project structure..."
# Just take a desktop screenshot - user arranges windows
Write-Host "Arrange VS Code with README.md + openclaw.plugin.json visible"
Write-Host "Press ENTER when ready..."
Read-Host
Take-Screenshot "code-showcase" "Project structure and configuration"

Write-Host ""
Write-Host "========================================"
Write-Host "  ALL SCREENSHOTS CAPTURED!"
Write-Host "  Directory: $OutputDir"
Write-Host "========================================"
Get-ChildItem $OutputDir -Filter "*.png" | ForEach-Object {
    Write-Host "  $($_.Name) ($([math]::Round($_.Length/1KB,1)) KB)"
}
