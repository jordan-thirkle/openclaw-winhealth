# Showcase Video Recording Script
# Uses FFmpeg to record a professional demo of the OpenClaw Health Monitor
#
# Prerequisites:
#   - FFmpeg 8.1+ (installed via winget)
#   - OBS Studio (optional, for GUI-based recording)
#
# Usage:
#   1. Open a terminal and run: npm test
#   2. Open browser to http://127.0.0.1:18789/__openclaw__/canvas/winhealth/
#   3. Open ClawHub page in another tab
#   4. Run this script to record
#   5. Press 'q' to stop recording
#
# This script records the primary monitor.

$outputDir = Split-Path -Parent $PSCommandPath
$dateStamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputVideo = "$outputDir\showcase-$dateStamp.mp4"

Write-Host "=== OpenClaw Health Monitor Showcase Recorder ==="
Write-Host "Output: $outputVideo"
Write-Host ""
Write-Host "Before recording, prepare:"
Write-Host "  1. Terminal 1: cd D:\Projects\openclaw-winhealth"
Write-Host "  2. Terminal 2: openclaw status --all"
Write-Host "  3. Browser tab 1: http://127.0.0.1:18789/__openclaw__/canvas/winhealth/"
Write-Host "  4. Browser tab 2: https://clawhub.ai/plugins/@jordan-thirkle/openclaw-winhealth"
Write-Host ""
Write-Host "Recording in 5 seconds..."
Start-Sleep -Seconds 5

# Record the primary screen at 1080p, 30fps, with mic audio
ffmpeg -f gdigrab -framerate 30 -i desktop `
       -f dshow -i audio="Microphone (Realtek Audio)" `
       -c:v libx264 -preset ultrafast -crf 28 `
       -c:a aac -b:a 128k `
       -t 120 `
       "$outputVideo"

Write-Host "Recording saved to: $outputVideo"
Write-Host "Upload this to GitHub Releases or YouTube for embedding in README."
