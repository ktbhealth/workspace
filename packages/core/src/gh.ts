import { Result, Schema } from "effect";

export interface Repo {
	readonly name: string;
	readonly sshUrl: string;
}

const GhRepoListItem = Schema.Struct({
	name: Schema.String,
	sshUrl: Schema.String,
	isArchived: Schema.Boolean,
});

const GhRepoListJson = Schema.fromJsonString(Schema.Array(GhRepoListItem));

const byName = (a: Repo, b: Repo): number => a.name.localeCompare(b.name);

/**
 * Decode the JSON array printed by `gh repo list --json name,sshUrl,isArchived`.
 * Archived repos are dropped and the rest sorted by name.
 */
export const decodeRepoList = (
	json: string,
): Result.Result<ReadonlyArray<Repo>, Schema.SchemaError> =>
	Schema.decodeUnknownResult(GhRepoListJson)(json).pipe(
		Result.map((items) =>
			items
				.filter((item) => !item.isArchived)
				.map(({ name, sshUrl }) => ({ name, sshUrl }))
				.sort(byName),
		),
	);
