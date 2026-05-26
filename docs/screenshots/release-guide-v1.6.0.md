# v1.6.0 Release Guide — OpenClaw Health Monitor

## Overview

This release addresses 5 Medium-severity SkillSpector audit findings, fixes cross-platform gaps in the heartbeat monitor, adds post-install verification, and improves security disclosures.

### What's Fixed

| # | Finding | Change |
|---|---------|--------|
| 1 | Intent-Code Divergence | SECURITY.md corrected "read-only" claim; accurately describes diagnostic exports + alert transmission |
| 2 | Missing localStorage warning | command.html now warns about localStorage token persistence |
| 3 | Missing plain HTTP warning | Both dashboards warn about plain HTTP loopback transmission |
| 4 | Missing collection scope warning | diagnostics tool output + description warn about sensitive data; SKILL.md expanded |
| 5 | Missing log tail warning | include_logs default changed to false; warning added when logs ARE included |

### Cross-Platform Fixes

- **heartbeat-monitor.js**: Now uses curl on Linux/macOS instead of always running PowerShell
- **health-check.js**: Prewarm + subagent detection now works on Linux/macOS via grep
- **diagnostics.js**: Log tail extraction works on Linux/macOS via tail
- **Log paths**: All `$env:USERPROFILE\AppData\Local\Temp` → `$env:TEMP\openclaw`

---

## Pre-Release Checklist

### Step 1: Run the Test Suite

```bash
cd D:\Projects\openclaw-winhealth
npm test
```

**Expected output:**
```
> 30 passed (30)
```

### Step 2: Verify Version Consistency

Check all files are at `1.6.0`:

| File | Field | Expected |
|------|-------|----------|
| `package.json` | `version` | `1.6.0` |
| `openclaw.plugin.json` | `version` | `1.6.0` |
| `SKILL.md` | frontmatter `version` | `1.6.0` |

### Step 3: Verify Config Schema (No Dead Keys)

```bash
openclaw plugins inspect winhealth --runtime --json | Select-String "configJsonSchema" -Context 0,25
```

**Check for:**
- ✅ No `memoryThresholdMB` property
- ✅ No `autoDiagnose` property
- ✅ `alertChannel` default is `"none"`
- ✅ `additionalProperties: false`

### Step 4: Verify Post-Install Flow

```bash
# Install from local
openclaw plugins uninstall winhealth --force
Remove-Item -Recurse -Force "$env:USERPROFILE\.openclaw\extensions\winhealth"
openclaw plugins install D:\Projects\openclaw-winhealth

# Add to allowlist (if needed)
openclaw config set plugins.allow winhealth --append

# Enable
openclaw plugins enable winhealth

# Restart gateway
openclaw gateway restart

# Verify startup
openclaw status --all | Select-String "winhealth"
```

**Expected:** `[plugins] winhealth: started, polling every 5m`

### Step 5: Dashboard Verification

1. Open browser to `http://127.0.0.1:18789/__openclaw__/canvas/winhealth/` (requires canvas plugin)
2. **Screenshot 1:** Auth modal showing both warnings:
   - localStorage persistence warning (yellow)
   - Plain HTTP transmission warning (yellow)
3. Enter gateway token and connect
4. **Screenshot 2:** Dashboard live with gauges, metrics, agents, channel status

### Step 6: ClawHub Dry-Run Publish

```bash
npm run publish:clawhub:dry
```

**Check for:**
- ✅ Correct file list (no node_modules, .git, etc.)
- ✅ Version `1.6.0`
- ✅ Author: `Jordan Thirkle`
- ✅ License: `MIT`

### Step 7: Publish to ClawHub

```bash
npm run publish:clawhub
```

Then on https://clawhub.ai:
- **Screenshot 3:** Package page showing v1.6.0, MIT license, clean config schema
- **Screenshot 4:** Skill page (if applicable) showing updated metadata

### Step 8: GitHub Release

```bash
git tag v1.6.0
git push origin v1.6.0
```

Create release on GitHub with release notes from CHANGELOG.md:
- **Screenshot 5:** GitHub release page with v1.6.0 tag and notes

---

## Screenshot Gallery

| # | Subject | Capture Method |
|---|---------|---------------|
| 1 | Dashboard auth modal with warnings | Browser → DevTools → Full node screenshot |
| 2 | Dashboard live with data | Browser → Full page screenshot |
| 3 | ClawHub package page | Browser → Package page |
| 4 | Test suite passing | Terminal → `npm test` output |
| 5 | GitHub release | Browser → Releases page |

---

## Post-Release Verification

1. **Re-scan on ClawHub**: Trigger a new SkillSpector audit from the ClawHub UI
2. **Verify re-audit passes**: Check that all 5 Medium findings are marked as resolved
3. **Update the audit history**: Add the re-audit entry to SECURITY.md
4. **Update badge**: README badge should show 30/30 tests

---

## Rollback Plan

If v1.6.0 has issues:

```bash
# Uninstall
openclaw plugins uninstall winhealth --force

# Revert to 1.5.3
openclaw plugins install clawhub:@jordan-thirkle/openclaw-winhealth@1.5.3
openclaw gateway restart

# Revert GitHub
git revert v1.6.0
git push origin main
```
