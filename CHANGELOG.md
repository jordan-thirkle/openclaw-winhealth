# Changelog

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
