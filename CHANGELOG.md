# Changelog

## [1.3.0] — 2026-05-25

### Fixed
- Updated prerequisites to cross-platform (Windows, Linux, macOS)
- Renamed "Known Windows Issues" → "Known Issues" for accuracy
- Added Telegram to alert descriptions in README
- Removed closed PR #86245 from Related Projects
- Fixed SKILL.md section numbering and removed Windows-only language
- Professional health dashboard with live data (dashboard/index.html)

## [1.2.0] — 2026-05-25

### Added
- Cross-platform support: Linux and macOS in addition to Windows
- OS detection for platform-specific probes (Windows Task Scheduler, log search)
- Cross-platform skill — works on all operating systems

### Changed
- Removed `os: ["win32"]` gate from SKILL.md
- Platform-aware command execution in health-check and heartbeat-monitor
- Updated descriptions, README, and badge to reflect cross-platform support

## [1.1.0] — 2026-05-25

### Added
- Comprehensive test suite: 27 tests across 3 tool files (0/100 ClawHub plugins have tests)
- CI/CD pipeline via GitHub Actions (Node 22/24/25 matrix)
- Code coverage support via v8 provider
- Mock SDK helpers for future contributors

### Fixed
- Fixed prewarm detection mock in health-check test (PowerShell command pattern matching)

## [1.0.0] — 2026-05-25

### Added
- Initial release: Windows Health Monitor for OpenClaw
- `winhealth_check` tool — quick health snapshot
- `winhealth_diagnostics` tool — full diagnostic bundle
- `winhealth_alerts` tool — alert management
- Background health polling via `gateway_start` hook
- WhatsApp alert integration
- Windows Scheduled Task health checks
- Provider auth prewarm detection (2026.5.22+)
- Stuck background subagent detection
- Event loop degradation monitoring
- Companion skill (`windows-health-monitor`) published on ClawHub
- Comprehensive README with config reference
- Blog post documenting the creation story
