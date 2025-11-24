import { defineConfig } from "vitest/config";
import path from "path";

const workspaceRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: path.resolve(workspaceRoot, "client"),
  resolve: {
    alias: {
      "@": path.resolve(workspaceRoot, "client", "src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
