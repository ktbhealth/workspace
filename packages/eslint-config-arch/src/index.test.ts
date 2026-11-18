import { describe, expect, it } from "vitest";

import {
  arch,
  IMPL_IMPORT_PATTERNS,
  PACKAGE_BOUNDARY_GLOBS,
  PLATFORM_GLOBALS,
  PLATFORM_IMPORT_PATTERNS,
  PORT_GLOBS,
  PORT_TEST_GLOBS,
  PROVIDER_LOCKIN_EXEMPTIONS,
  UI_GLOBS,
  UI_TEST_GLOBS,
  product,
  ui,
} from "./index";

const ARCH_RULE_IDS = [
  "arch/no-hardcoded-colors",
  "arch/provider-lockin",
  "arch/package-boundary",
  "arch/tenant-scope",
  "arch/plugin-contract",
  "arch/plugin-route-gate",
  "arch/plugin-api-route-gate",
  "arch/client-contract",
  "arch/driver-contract",
];

/** Every `arch/<rule>` id referenced by any override's rules. */
const archRuleUsages = (fragment: ReturnType<typeof product>) =>
  fragment.overrides.flatMap((o) =>
    Object.entries(o.rules ?? {})
      .filter(([id]) => id.startsWith("arch/"))
      .map(([id, setting]) => ({ id, setting, files: o.files })),
  );

describe("arch.product()", () => {
  const fragment = product();

  it("registers the eslint-plugin-arch jsPlugin", () => {
    expect(fragment.jsPlugins).toEqual([{ name: "arch", specifier: "eslint-plugin-arch" }]);
  });

  it("covers all nine arch rules", () => {
    const ids = new Set(archRuleUsages(fragment).map((u) => u.id));
    expect([...ids].sort()).toEqual([...ARCH_RULE_IDS].sort());
  });

  it("enables every rule as error on its source globs", () => {
    for (const id of ARCH_RULE_IDS) {
      const errorBlock = fragment.overrides.find((o) => o.rules?.[id] === "error");
      expect(errorBlock, `${id} has no "error" override`).toBeDefined();
    }
  });

  it("turns test-scoped rules off on the test globs", () => {
    const usages = archRuleUsages(fragment);
    for (const id of ["arch/provider-lockin", "arch/tenant-scope", "arch/no-hardcoded-colors"]) {
      expect(
        usages.some((u) => u.id === id && u.setting === "off"),
        `${id} has no "off" override`,
      ).toBe(true);
    }
    // The off-blocks must target the ported test glob constants.
    const offFiles = usages.filter((u) => u.setting === "off").flatMap((u) => u.files);
    expect(offFiles).toEqual(expect.arrayContaining([...PORT_TEST_GLOBS, ...UI_TEST_GLOBS]));
  });

  it("carries the provider-lockin file exemptions", () => {
    const exemption = fragment.overrides.find(
      (o) =>
        o.rules?.["arch/provider-lockin"] === "off" &&
        o.files.length === PROVIDER_LOCKIN_EXEMPTIONS.length &&
        PROVIDER_LOCKIN_EXEMPTIONS.every((f) => o.files.includes(f)),
    );
    expect(exemption).toBeDefined();
  });

  it("keeps the port/domain import restrictions on the port globs", () => {
    const portBlock = fragment.overrides.find(
      (o) => o.files.length === PORT_GLOBS.length && PORT_GLOBS.every((g) => o.files.includes(g)),
    );
    expect(portBlock).toBeDefined();
    const restricted = portBlock!.rules!["no-restricted-imports"] as [
      string,
      { patterns: string[] },
    ];
    expect(restricted[0]).toBe("error");
    expect(restricted[1].patterns).toEqual(
      expect.arrayContaining([...IMPL_IMPORT_PATTERNS, ...PLATFORM_IMPORT_PATTERNS]),
    );
    const globals = portBlock!.rules!["no-restricted-globals"] as unknown[];
    expect(globals[0]).toBe("error");
    expect((globals.slice(1) as { name: string }[]).map((g) => g.name)).toEqual([
      ...PLATFORM_GLOBALS,
    ]);
  });

  it("exposes the ported glob constants", () => {
    expect(PORT_GLOBS).toContain("plugins/**/*.{ts,tsx}");
    expect(PACKAGE_BOUNDARY_GLOBS).toContain("apps/**/*.{ts,tsx}");
    expect(UI_GLOBS).toContain("evals/**/*.{ts,tsx}");
    expect(PORT_TEST_GLOBS.some((g) => g.includes(".test."))).toBe(true);
  });
});

describe("arch.ui()", () => {
  it("enables only no-hardcoded-colors with default globs", () => {
    const fragment = ui();
    expect(fragment.jsPlugins).toEqual([{ name: "arch", specifier: "eslint-plugin-arch" }]);
    expect(fragment.overrides).toHaveLength(2);
    expect(fragment.overrides[0].rules).toEqual({
      "arch/no-hardcoded-colors": "error",
    });
    expect(fragment.overrides[0].files).toEqual(
      expect.arrayContaining(["src/**/*.{ts,tsx}", "*.stories.*"]),
    );
    expect(fragment.overrides[1].rules).toEqual({
      "arch/no-hardcoded-colors": "off",
    });
    expect(fragment.overrides[1].files).toEqual(expect.arrayContaining(["**/*.test.{ts,tsx}"]));
  });

  it("accepts custom source/test globs", () => {
    const fragment = ui({
      sources: ["app/**/*.tsx"],
      tests: ["app/**/*.test.tsx"],
    });
    expect(fragment.overrides[0].files).toEqual(["app/**/*.tsx"]);
    expect(fragment.overrides[1].files).toEqual(["app/**/*.test.tsx"]);
  });

  it("is reachable through the arch namespace", () => {
    expect(arch.product).toBe(product);
    expect(arch.ui).toBe(ui);
  });
});
