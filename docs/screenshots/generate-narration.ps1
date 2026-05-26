# AI Voice Narration Generator
# Uses Windows built-in TTS to generate professional narration audio
# Output: docs/screenshots/narration.wav

$scriptDir = Split-Path -Parent $PSCommandPath
$narrationFile = Join-Path $scriptDir "narration.txt"
$outputWav = Join-Path $scriptDir "narration.wav"

Write-Host "=== AI Voice Narration Generator ==="

# Build the full text from the script (split into phrases for natural pacing)
$narration = Get-Content $narrationFile -Raw

# Use System.Speech for TTS
Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# List available voices for reference
Write-Host "--- Available voices ---"
$synth.GetInstalledVoices() | ForEach-Object {
    Write-Host "  $($_.VoiceInfo.Name) ($($_.VoiceInfo.Culture) - $($_.VoiceInfo.Gender))"
}

# Select the most natural voice
$voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like "*Mark*" } | Select-Object -First 1
if (-not $voice) {
    $voice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Name -like "*David*" } | Select-Object -First 1
}
if ($voice) {
    $synth.SelectVoice($voice.VoiceInfo.Name)
    Write-Host "--- Using voice: $($voice.VoiceInfo.Name) ---"
} else {
    Write-Host "--- Using default voice ---"
}

# Set speech rate (0 = normal, -2 to +2)
$synth.Rate = 0
$synth.Volume = 100

# Generate WAV
Write-Host "Generating narration audio..."
$synth.SetOutputToWaveFile($outputWav)

# Split narration into paragraphs for natural pauses
$paragraphs = $narration -split "`n`n" | Where-Object { $_.Trim() -ne "" }
foreach ($p in $paragraphs) {
    $synth.Speak($p.Trim())
    Start-Sleep -Milliseconds 400
}

$synth.SetOutputToDefaultAudioDevice()
$synth.Dispose()

$fileInfo = Get-Item $outputWav
$duration = [math]::Round($fileInfo.Length / 44100.0 / 2.0, 1) # Estimate for 16-bit mono 44.1kHz
Write-Host "Narration saved: $outputWav ($([math]::Round($fileInfo.Length/1KB,1)) KB, ~${duration}s)"
