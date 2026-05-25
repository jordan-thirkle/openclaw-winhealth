import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["index.js", "tools/**/*.js", "hooks/**/*.js"],
    },
  },
});
