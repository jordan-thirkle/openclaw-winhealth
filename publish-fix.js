// Patch: ensure npm.cmd is found by spawnSync
const { spawnSync } = require("child_process");
const origSpawn = require("child_process").spawn;
const origSpawnSync = require("child_process").spawnSync;

// Monkey-patch spawnSync for npm
const fs = require("fs");
const npmCmd = "C:\\Program Files\\nodejs\\npm.cmd";
if (fs.existsSync(npmCmd)) {
  const _spawn = require("child_process").spawnSync;
  require("child_process").spawnSync = function(cmd, args, opts) {
    if (cmd === "npm" || cmd === "npm.cmd") {
      cmd = npmCmd;
    }
    if (!opts) opts = {};
    opts.shell = true;
    return _spawn(cmd, args || [], opts);
  };
}

// Now load clawhub
require("clawhub");
