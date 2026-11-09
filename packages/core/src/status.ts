export interface GitStatus {
	readonly branch: string;
	readonly upstream: boolean;
	readonly ahead: number;
	readonly behind: number;
	readonly dirty: number;
}

const BRANCH_HEAD = "# branch.head ";
const BRANCH_AB = "# branch.ab ";
const AB_PATTERN = /\+(\d+) -(\d+)/;

/**
 * Parse `git status --porcelain=v2 --branch` output into a {@link GitStatus}.
 */
export const parseGitStatus = (porcelain: string): GitStatus => {
	let branch = "(detached)";
	let upstream = false;
	let ahead = 0;
	let behind = 0;
	let dirty = 0;
	for (const line of porcelain.split("\n")) {
		if (line.startsWith(BRANCH_HEAD)) {
			branch = line.slice(BRANCH_HEAD.length);
		} else if (line.startsWith(BRANCH_AB)) {
			upstream = true;
			const match = AB_PATTERN.exec(line);
			if (match !== null) {
				ahead = Number(match[1]);
				behind = Number(match[2]);
			}
		} else if (line.length > 0 && !line.startsWith("#")) {
			dirty += 1;
		}
	}
	return { branch, upstream, ahead, behind, dirty };
};

export interface StatusRow {
	readonly name: string;
	readonly status: GitStatus;
}

const pad = (value: string, width: number): string => value.padEnd(width);

export const formatStatusRow = (name: string, status: GitStatus): string =>
	`${pad(name, 22)} ${pad(status.branch, 18)} ${String(status.dirty).padStart(6)}  ${
		status.upstream ? `+${status.ahead}/-${status.behind}` : "no upstream"
	}`;

export const formatStatusHeader = (): string =>
	`${pad("NAME", 22)} ${pad("BRANCH", 18)} ${"DIRTY".padStart(6)}  SYNC`;

export const formatStatusTable = (rows: ReadonlyArray<StatusRow>): string =>
	[formatStatusHeader(), ...rows.map((row) => formatStatusRow(row.name, row.status))].join("\n");
