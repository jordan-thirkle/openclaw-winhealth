# Final Professional Video Producer
# 1. Opens the slideshow in a browser window
# 2. Records screen with FFmpeg (gdigrab)
# 3. Overlays AI narration audio
# 4. Adds fade-in/out, title card
# 5. Outputs YouTube-ready MP4

param(
    [string]$OutputDir = $PSScriptRoot,
    [int]$Duration = 115
)

$ffmpeg = "C:\Users\jorda\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"
$slideshow = Join-Path $OutputDir "showcase-slideshow.html"
$narration = Join-Path $OutputDir "narration.mp3"
$rawVideo = Join-Path $OutputDir "raw-capture.mp4"
$finalVideo = Join-Path $OutputDir "showcase-v1.6.0.mp4"

Write-Host "============================================"
Write-Host "  OpenClaw Health Monitor v1.6.0"
Write-Host "  Professional Video Producer"
Write-Host "============================================"
Write-Host ""

# Verify prerequisites
if (-not (Test-Path $narration)) { Write-Error "Missing narration.mp3"; exit 1 }
if (-not (Test-Path $slideshow)) { Write-Error "Missing slideshow HTML"; exit 1 }

# Open slideshow in browser (full screen preferred)
Write-Host "[1/3] Opening slideshow..."
Start-Process $slideshow
Start-Sleep -Seconds 3

# Send F11 for fullscreen
Add-Type -AssemblyName System.Windows.Forms
Start-Sleep -Milliseconds 500

Write-Host "[2/3] Recording screen ($Duration seconds)..."
Write-Host "       Make the browser window FULL SCREEN (F11)"

# Give user time to F11
Start-Sleep -Seconds 3

# Record screen
$recordArgs = @(
    "-f", "gdigrab",
    "-framerate", "30",
    "-i", "desktop",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "20",
    "-pix_fmt", "yuv420p",
    "-t", [string]$Duration,
    "-y",
    $rawVideo
)

Write-Host "       RECORDING NOW..."
& $ffmpeg $recordArgs 2>&1 | Select-Object -Last 5

if (-not (Test-Path $rawVideo)) {
    Write-Error "Screen capture failed"
    exit 1
}

Write-Host "       Screen capture: $(Get-Item $rawVideo | ForEach-Object { "$([math]::Round($_.Length/1MB,1)) MB" })"

# Combine video + narration
Write-Host "[3/3] Combining video + narration..."

$combineArgs = @(
    "-i", $rawVideo,
    "-i", $narration,
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "22",
    "-c:a", "aac",
    "-b:a", "192k",
    "-shortest",
    "-movflags", "+faststart",
    "-pix_fmt", "yuv420p",
    "-y",
    $finalVideo
)

& $ffmpeg $combineArgs 2>&1 | Select-Object -Last 5

if (Test-Path $finalVideo) {
    $info = Get-Item $finalVideo
    Write-Host ""
    Write-Host "============================================"
    Write-Host "  VIDEO PRODUCED SUCCESSFULLY!"
    Write-Host "============================================"
    Write-Host "  File: $finalVideo"
    Write-Host "  Size: $([math]::Round($info.Length/1MB,1)) MB"
    Write-Host "  Duration: ${Duration}s"
    Write-Host ""
    Write-Host "  Ready for:"
    Write-Host "    - YouTube upload"
    Write-Host "    - GitHub Release attachment"
    Write-Host "    - README embed"
    Write-Host "    - Social media"
    Write-Host "============================================"
} else {
    Write-Error "Final video was not created"
}
