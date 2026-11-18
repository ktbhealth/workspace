import { describe, expect, it } from "vitest";

import plugin from "./index";

const makeContext = (filename: string) => {
  const reports: { node: unknown; message: string }[] = [];
  return {
    filename,
    reports,
    report: (d: { node: unknown; message: string }) => reports.push(d),
  };
};

const literal = (value: unknown) => ({ type: "Literal", value });
const importDecl = (source: string) => ({
  type: "ImportDeclaration",
  source: literal(source),
  specifiers: [],
});

const run = (filename: string, source: string) => {
  const ctx = makeContext(filename);
  // Exempt files get an empty visitor set — optional-call keeps the
  // smoke test honest (no visitors ⇒ no reports).
  (plugin.rules as any)["package-boundary"].create(ctx).ImportDeclaration?.(importDecl(source));
  return ctx.reports;
};

describe("arch-boundary/package-boundary", () => {
  it("flags relative imports escaping the package root", () => {
    expect(run("/repo/plugins/demo/src/index.ts", "../../other/src/schema.ts")).toHaveLength(1);
    expect(
      run("/repo/plugins/demo/src/index.ts", "../../../packages/db/src/table.ts"),
    ).toHaveLength(1);
  });

  it("allows in-package, ./ and package specifiers", () => {
    expect(run("/repo/plugins/demo/src/routes/x.tsx", "../../guard.ts")).toHaveLength(0);
    expect(run("/repo/plugins/demo/src/index.ts", "./schema.ts")).toHaveLength(0);
    expect(run("/repo/plugins/demo/src/index.ts", "@ktb/db/schema")).toHaveLength(0);
  });

  it("exempts schema.ts, generated aggregations and test files", () => {
    expect(run("/repo/plugins/demo/src/schema.ts", "../../groups/src/schema.ts")).toHaveLength(0);
    expect(
      run("/repo/packages/db/src/schema.gen.ts", "../../../plugins/audit/src/schema.ts"),
    ).toHaveLength(0);
    expect(
      run("/repo/packages/app-host/src/index.test.ts", "../../../plugins/audit/src/index.ts"),
    ).toHaveLength(0);
  });
});
