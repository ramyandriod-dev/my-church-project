import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Next.js sets tsconfig `jsx: preserve` (for its own SWC pipeline), which
  // Vite's oxc transform would otherwise honor and leave JSX untouched.
  oxc: {
    jsx: { runtime: "automatic", development: false },
    include: /\.(m?[jt]sx?)$/,
    exclude: /\.js$/,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "realtime-worker/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
    setupFiles: ["./tests/setup.ts"],
    // The login tests cover the pilot demo aliases and demo password fallback,
    // which are off in production (DEMO_LOGIN_ENABLED is unset there).
    env: { DEMO_LOGIN_ENABLED: "true" },
  },
});
