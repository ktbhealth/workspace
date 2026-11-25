import * as github from "@pulumi/github";

/**
 * `trusted-contributors` — the org's trusted-author team. Campaign
 * gates (workflows/pr-review trusted_actors check) treat membership
 * here as the allowlist: PRs authored by team members may reach the
 * agent and auto-merge; everyone else is skipped. Membership grants
 * NO repo permissions — it is a policy marker, not an access grant.
 *
 * Created fresh by this program (no import needed). If the team ever
 * needs to pre-exist, `pulumi import` it as
 * `github:index/team:Team` with ID `<org>:<slug>`.
 */
const TRUSTED_TEAM_SLUG = "trusted-contributors";

const TRUSTED_CONTRIBUTORS = ["luisfuturist", "vinicenter", "eccarneiro"] as const;

export function registerTeams(): void {
  const team = new github.Team("trusted-contributors", {
    name: "Trusted Contributors",
    description:
      "Trusted contributors — the only non-admin authors allowed to trigger agent/auto-merge flows (pr-review trusted gate).",
    privacy: "closed",
  });

  for (const username of TRUSTED_CONTRIBUTORS) {
    new github.TeamMembership(`trusted-${username}`, {
      teamId: team.id,
      username,
      role: "member",
    });
  }
}
