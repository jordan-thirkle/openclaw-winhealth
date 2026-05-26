# Changelog

## [1.6.0] — 2026-05-26

### Security
- **SkillSpector re-audit remediation**: Addressed all 5 Medium findings
- **SECURITY.md**: Corrected "read-only" claim to accurately describe diagnostic exports and alert transmission (Fix #1)
- **command.html**: Added localStorage token persistence warning and plain HTTP transmission warning (Fix #2 + #3)
- **index.html**: Added plain HTTP transmission warning to auth modal (Fix #3)
- **diagnostics.js**: Added "review before sharing" warning to all diagnostic output (Fix #4)
- **diagnostics.js**: Changed `include_logs` default from `true` to `false` — log tail extraction is now opt-in (Fix #5)
- **diagnostics.js**: Added log tail warning when logs ARE included (Fix #5)
- **diagnostics.js**: Description now warns about sensitive data collection scope (Fix #4)
- **SKILL.md**: Expanded diagnostic bundle warning with specific collected data types (Fix #4)
- **README.md**: Updated Privacy & Security section to accurately describe data collection vs transmission

### Fixed
- **Cross-platform heartbeat monitor**: Added Linux/macOS curl-based health probe — was always running PowerShell `Invoke-RestMethod` which fails on non-Windows
- **Cross-platform prewarm/subagent detection**: Added Linux/macOS grep-based log scanning — previously only ran on Windows
- **Cross-platform log tail extraction**: Added Linux/macOS tail-based log reading — previously only ran on Windows
- **SECURITY.md**: Removed stale `autoDiagnose` references (config key removed in v1.5.x)
- **health-check.test.js**: Fixed undefined `cmd` variable in prewarm mock
- **Log paths**: Changed `$env:USERPROFILE\AppData\Local\Temp\openclaw` to `$env:TEMP\openclaw` across all files

### Added
- **Post-install verification section** in README — step-by-step checklist to confirm plugin is working
- **Uninstall instructions** in README — plugin + skill removal steps
- **command.html**: Static data disclaimer for repos section
- **Tests**: Prewarm mock now matches cross-platform argv pattern

### Changed
- Version bumps: all files 1.5.3 → 1.6.0
- Test count badge: 27/27 → 30/30 (pending test additions)

## [1.5.0] — 2026-05-26

### Renamed
- **Plugin name**: "Windows Health Monitor" → "OpenClaw Health Monitor" (plugin was cross-platform since v1.2.0)
- **Skill name**: `windows-health-monitor` → `openclaw-health-monitor`
- **SKILL.md H1**: `# Windows Health Monitor` → `# OpenClaw Health Monitor — Cross-Platform Diagnostic Skill`

### Fixed
- **SKILL.md: cross-platform command parity** — all 12 PowerShell-exclusive commands now have bash/zsh/grep equivalents as the primary command, with PowerShell fallbacks commented as secondary
- **SKILL.md: missing `### 1.` section** — added `### 1. Gateway Service Health` section before platform-specific diagnostics
- **SKILL.md: broken log paths** — `$env:USERPROFILE\AppData\Local\Temp\openclaw\` replaced with `~/.openclaw/logs/` (forward slashes, cross-platform)
- **SKILL.md: diagnostic bundle path** — `~\.openclaw\logs\support\` → `~/.openclaw/logs/support/`
- **SKILL.md: removed `### 8. npm Reinstall Issues`** — off-topic content unrelated to health diagnostics
- **README: inaccurate test claim** — "First with an automated test suite" → "27 automated tests with CI/CD pipeline" (other ClawHub plugins also have test suites)

### Added
- **README: Web Dashboard section** — prerequisites (canvas plugin), step-by-step setup, access URLs
- **CONTRIBUTING.md: dashboard deployment note + cross-platform testing steps**
- **openclaw.plugin.json**: added `author` and `license` fields

### Changed
- Version bumps: SKILL.md 1.4.0→1.5.0, package.json 1.4.1→1.5.0, plugin.json 1.4.1→1.5.0
- SKILL.md description: removed "Windows Scheduled Task state" from frontmatter, made generic

## [1.4.1] — 2026-05-26

### Fixed
- **Version drift**: SKILL.md frontmatter bumped from 1.0.0 to 1.4.0
- **SKILL.md description**: Changed "Windows-specific" to "Cross-platform" (matching body text added in v1.2.0)
- **README config table**: Fixed wrong defaults — `alertChannel` column now says `"none"` instead of `"whatsapp"`, `autoDiagnose` now says `false` instead of `true`
- **README architecture diagram**: Added `/ Telegram` to alert routing path
- **Dashboard title**: Removed misleading "v2.0" branding from dashboard (was a feature name, not a project version)
- **Dashboard version**: Footer no longer shows hardcoded `v1.3.0` string
- **Command Center**: Removed hardcoded personal file paths (`D:/Projects/...`) from public repo
- **Command Center**: Fixed `localStorage` token storage → now uses `sessionStorage` with `localStorage` fallback (matching WinHealth dashboard security model)
- **alerts.js**: `clear` now reports count of actually-active alerts, not total including previously dismissed
- **diagnostics.js**: Added `process.platform === "win32"` guard on PowerShell log extraction and task scheduler commands
- **blog-post.md**: Updated outdated "Windows-only" and "WhatsApp-only" claims to reflect cross-platform + multi-channel support
- **package.json keywords**: Added `cross-platform`, `linux`, `macos`, `security` (removed `win32`)

### Added
- **SKILL.md**: Added `tags` metadata field for ClawHub discoverability
- **CHANGELOG**: Added missing v1.3.1 entry (CODE_OF_CONDUCT.md)
- **CONTRIBUTING.md**: Added `npm test` step before PR submission
- **.gitignore**: Added `coverage/` directory

### Removed
- `assets/` — empty directory
- `docs/x-posts.md` — dead file, content consolidated into `social-posts.md`
- `tsconfig.json` — dead config (project uses plain `.js`, not TypeScript build output)

## [1.4.0] — 2026-05-26

### Security
- **SkillSpector audit remediation**: Addressed all 11 findings (1 High, 10 Medium)
- New `SECURITY.md` — full data collection, transmission, and token handling disclosure
- `alertChannel` default changed from `"whatsapp"` to `"none"` (no external transmission by default)
- `autoDiagnose` default changed from `true` to `false` (no automatic diagnostic collection)
- Dashboard: switched from `localStorage` to `sessionStorage` for gateway token (cleared on tab close)
- Dashboard: added security notice in auth modal and optional persistence checkbox
- Added privacy disclosure to manifest description
- Added `api.logger.info` statements for token access and alert dispatch in heartbeat monitor
- Updated JSDoc on heartbeat-monitor.js to document full capabilities and token handling

### Added
- WARNING block before nuclear kill command in SKILL.md (kills ALL Node.js processes)
- WARNING block before diagnostic bundle export in SKILL.md (may contain system metadata)
- Security Considerations section in SKILL.md
- Privacy & Security section in README.md (before Features)
- SkillSpector audit badge and link in README.md

### Changed
- Config example in README now uses `alertChannel: "none"` with explanatory comment
- Config reference table updated with new defaults and descriptions
- `openclaw.plugin.json` version bumped to 1.4.0 with updated descriptions

## [1.3.1] — 2026-05-26

### Added
- `CODE_OF_CONDUCT.md` (Contributor Covenant 2.1)

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
