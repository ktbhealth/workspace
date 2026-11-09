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

/**
 * Repo names become path segments under `repos/` — reject anything that
 * could traverse (`.`, `..`, `/`, whitespace, …) while allowing the
 * leading-dot names GitHub permits (e.g. `.github`).
 */
const SAFE_NAME = /^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]+$/;

const byName = (a: Repo, b: Repo): number => a.name.localeCompare(b.name);

/**
 * Decode the JSON array printed by `gh repo list --json name,sshUrl,isArchived`.
 * Archived repos are dropped and the rest sorted by name.
 */
export const decodeRepoList = (json: string): Result.Result<ReadonlyArray<Repo>, Error> =>
	Schema.decodeUnknownResult(GhRepoListJson)(json).pipe(
		Result.mapError((error) => new Error(`invalid gh repo list JSON: ${String(error)}`)),
		Result.flatMap((items) => {
			const unsafe = items.find((item) => !SAFE_NAME.test(item.name));
			if (unsafe !== undefined) {
				return Result.fail(new Error(`unsafe repo name in gh output: ${unsafe.name}`));
			}
			return Result.succeed(
				items
					.filter((item) => !item.isArchived)
					.map(({ name, sshUrl }) => ({ name, sshUrl }))
					.sort(byName),
			);
		}),
	);
