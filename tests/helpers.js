/**
 * Mock OpenClaw SDK helpers for testing
 * Simulates the plugin SDK runtime without requiring the full OpenClaw gateway.
 */

let mockLogger = { info() {}, warn() {}, error() {}, debug() {} };
let mockRuntime = {};
let mockOnHandlers = {};
let registeredTools = {};

export function createMockApi(overrides = {}) {
  registeredTools = {};
  mockOnHandlers = {};
  mockLogger = { info() {}, warn() {}, error() {}, debug() {}, ...overrides.logger };
  mockRuntime = {
    system: {
      runCommandWithTimeout: async (argv, opts) => ({ stdout: "", stderr: "" }),
      ...overrides.system,
    },
  };

  return {
    id: "winhealth",
    name: "OpenClaw Health Monitor",
    logger: mockLogger,
    pluginConfig: overrides.config ?? {},
    runtime: mockRuntime,
    on(event, handler) {
      mockOnHandlers[event] = handler;
    },
    registerTool({ name, execute }) {
      registeredTools[name] = execute;
    },
  };
}

export function getRegisteredTools() {
  return Object.keys(registeredTools);
}

export function getToolExecutor(name) {
  return registeredTools[name];
}

export function getOnHandler(event) {
  return mockOnHandlers[event];
}

export function createMockHealthResponse(overrides = {}) {
  return {
    ok: true,
    durationMs: 100,
    eventLoop: {
      degraded: false,
      delayP99Ms: 50,
      delayMaxMs: 120,
      utilization: 0.05,
      reasons: [],
    },
    channels: {
      whatsapp: "linked, running, connected, healthy",
    },
    agents: ["main", "code", "local"],
    ...overrides,
  };
}

export function createMockSystemOutput(stdout = "", stderr = "") {
  return { stdout, stderr };
}
