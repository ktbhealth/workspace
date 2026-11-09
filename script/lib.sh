#!/usr/bin/env bash
# Shared helpers for the metarepo scripts. Sourced, not executed.

ORG="ktbhealth"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPOS_DIR="$ROOT/repos"

# list_repos — emit "name<TAB>sshUrl" for every non-archived repo in the org.
list_repos() {
	gh repo list "$ORG" --limit 200 \
		--json name,sshUrl,isArchived \
		-q '.[] | select(.isArchived == false) | [.name, .sshUrl] | @tsv' \
		| sort
}
