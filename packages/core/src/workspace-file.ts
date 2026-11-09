export const workspaceFileName = "ktbhealth.code-workspace";

const searchExclude = {
	"**/node_modules": true,
	"**/dist": true,
	"**/coverage": true,
	"**/.alchemy": true,
	"**/.output": true,
	"**/.vite": true,
} as const;

/**
 * Build the contents of `ktbhealth.code-workspace`: the metarepo root plus
 * one folder per cloned repo under `repos/`.
 */
export const buildWorkspaceFile = (repoNames: ReadonlyArray<string>): string =>
	`${JSON.stringify(
		{
			folders: [
				{ name: "ktbhealth", path: "." },
				...[...repoNames]
					.sort((a, b) => a.localeCompare(b))
					.map((name) => ({
						name,
						path: `repos/${name}`,
					})),
			],
			settings: { "search.exclude": searchExclude },
		},
		null,
		"\t",
	)}\n`;
