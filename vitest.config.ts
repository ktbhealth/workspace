import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		projects: ["packages/*"],
		coverage: {
			provider: "v8",
			enabled: true,
			reporter: ["text", "html"],
			include: ["packages/*/src/**"],
			exclude: ["**/*.test.*", "**/*.d.ts"],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
});
