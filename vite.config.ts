import { defineConfig } from "vite-plus";

export default defineConfig({
	defaultPackage: "./packages/cli",

	fmt: {
		useTabs: true,
		ignorePatterns: ["**/coverage/**", "**/dist/**", "**/*.code-workspace"],
	},

	lint: {
		plugins: ["typescript", "import"],
		options: {
			typeAware: true,
			typeCheck: true,
		},
	},
});
