import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "client/dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: [
        "server/game.ts",
        "client/src/components/game/helpers.ts",
        "client/src/components/game/seatPositions.ts",
        "shared/routes.ts",
        "client/src/components/animations/types.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
