# Professional Showcase Recording Script
# Records screen + system audio in sync for a professional demo video
# 
# Usage:
#   1. Prepare your windows:
#      - Terminal 1 (left): Run "npm test" in D:\Projects\openclaw-winhealth
#      - Browser 1 (top right): http://127.0.0.1:18789/__openclaw__/canvas/winhealth/
#      - Browser 2 (bottom right): https://clawhub.ai/plugins/@jordan-thirkle/openclaw-winhealth
#   2. Run this script
#   3. Press 'q' to stop recording
#
# Output: showcase-v1.6.0-professional.mp4

param(
    [int]$DurationSeconds = 180,
    [string]$OutputDir = $PSScriptRoot
)

$dateStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$narrationAudio = Join-Path $OutputDir "narration.mp3"
$rawVideo = Join-Path $OutputDir "screen-raw-$dateStamp.mp4"
$finalVideo = Join-Path $OutputDir "showcase-v1.6.0-professional.mp4"

$ffmpeg = "C:\Users\jorda\AppData\Local\Microsoft\WinGet\Links\ffmpeg.exe"

Write-Host "================================================"
Write-Host "  OpenClaw Health Monitor v1.6.0 Showcase"
Write-Host "  Professional Recording"
Write-Host "================================================"
Write-Host ""
Write-Host "Recording duration: $DurationSeconds seconds"
Write-Host "Narration: $narrationAudio"
Write-Host "Raw capture: $rawVideo"
Write-Host "Final output: $finalVideo"
Write-Host ""

# Check narration exists
if (-not (Test-Path $narrationAudio)) {
    Write-Host "ERROR: Narration file not found at $narrationAudio"
    Write-Host "Run generate-narration.ps1 first."
    exit 1
}

Write-Host "--- PREPARE YOUR SCREEN NOW ---"
Write-Host ""
Write-Host "Arrange windows left to right:"
Write-Host "  [Terminal: npm test] [Dashboard: auth modal]"
Write-Host "                       [ClawHub: package page]"
Write-Host ""
Write-Host "Make sure to:"
Write-Host "  1. Have terminal ready with 'npm test' waiting to run"
Write-Host "  2. Browser 1 open to dashboard auth page"
Write-Host "  3. Browser 2 open to ClawHub plugin page"
Write-Host ""
Write-Host "Press ENTER when ready, or type 'skip' to record without narration..."
$ready = Read-Host

# Play narration audio in background while recording
$narrationJob = $null
if ($ready -ne "skip") {
    Write-Host "Starting narration playback..."
    # Play narration in background using Windows Media Player (COM) or SoundPlayer
    $player = New-Object System.Media.SoundPlayer
    $player.SoundLocation = $narrationAudio
    # SoundPlayer doesn't support MP3. Use ffplay instead.
    $narrationJob = Start-Process -FilePath "C:\Users\jorda\AppData\Local\Microsoft\WinGet\Links\ffplay.exe" `
        -ArgumentList "-nodisp -autoexit `"$narrationAudio`"" `
        -NoNewWindow -PassThru
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "RECORDING STARTING in 3 seconds..."
Start-Sleep -Seconds 3
Write-Host "RECORDING NOW - Press 'q' in the FFmpeg window to stop early"

# Record screen with FFmpeg (gdigrab = Windows desktop capture)
$recordArgs = @(
    "-f", "gdigrab",
    "-framerate", "30",
    "-i", "desktop",
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "23",
    "-pix_fmt", "yuv420p",
    "-t", [string]$DurationSeconds,
    "-y",
    $rawVideo
)

& $ffmpeg @recordArgs 2>&1

Write-Host ""
Write-Host "Screen capture saved to: $rawVideo"

# Combine video with narration audio
if ((Test-Path $rawVideo) -and (Test-Path $narrationAudio)) {
    Write-Host ""
    Write-Host "Combining video with narration..."
    
    $combineArgs = @(
        "-i", $rawVideo,
        "-i", $narrationAudio,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "22",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        "-movflags", "+faststart",
        "-y",
        $finalVideo
    )
    
    & $ffmpeg @combineArgs 2>&1
    
    if (Test-Path $finalVideo) {
        $info = Get-Item $finalVideo
        Write-Host "FINAL VIDEO: $finalVideo"
        Write-Host "Size: $([math]::Round($info.Length/1MB,1)) MB"
        Write-Host "Ready for YouTube / GitHub upload!"
    }
}

# Cleanup background player
if ($narrationJob) {
    $narrationJob | Stop-Process -Force -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "================================================"
Write-Host "  Recording complete!"
Write-Host "  Upload: $finalVideo"
Write-Host "================================================"
