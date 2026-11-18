/**
 * eslint-plugin-arch — bundled Oxlint JS plugin.
 *
 * Plugin id: `arch` — rule ids `arch/<rule>`:
 *
 * - arch/no-hardcoded-colors      (eslint-plugin-no-hardcoded-colors)
 * - arch/provider-lockin          (eslint-plugin-provider-lockin)
 * - arch/package-boundary         (eslint-plugin-package-boundary)
 * - arch/tenant-scope             (eslint-plugin-tenant-scope)
 * - arch/plugin-contract          (eslint-plugin-plugin-contract)
 * - arch/plugin-route-gate        (eslint-plugin-plugin-route-gate)
 * - arch/plugin-api-route-gate    (eslint-plugin-plugin-api-route-gate)
 * - arch/client-contract          (eslint-plugin-client-contract)
 * - arch/driver-contract          (eslint-plugin-driver-contract)
 *
 * Oxlint registers jsPlugins by name and rejects duplicates, so the
 * standalone `eslint-plugin-*` packages cannot share one `arch` id —
 * this bundle re-exports all nine rule implementations under a single
 * plugin meta so consumers get a unified `arch/<rule>` namespace.
 *
 * Self-contained at runtime: the rule sources are imported from the
 * sibling packages' `src/` and inlined into `dist/index.mjs` by
 * `vp pack` — consumers install ONLY this package (no dependency on
 * the sibling eslint-plugin-* packages, which keeps git-tag installs
 * working). `vp pack` refuses cross-package relative imports, so
 * `vite.config.ts` carries a tiny rolldown `resolveId` plugin that
 * maps the sibling `eslint-plugin-<name>/src/index` specifiers to
 * absolute paths; src (not the
 * siblings' committed dist) is bundled so future rule edits rebuild
 * together in one pack run.
 */

import clientContractPlugin from "../../eslint-plugin-client-contract/src/index";
import driverContractPlugin from "../../eslint-plugin-driver-contract/src/index";
import noHardcodedColorsPlugin from "../../eslint-plugin-no-hardcoded-colors/src/index";
import packageBoundaryPlugin from "../../eslint-plugin-package-boundary/src/index";
import pluginApiRouteGatePlugin from "../../eslint-plugin-plugin-api-route-gate/src/index";
import pluginContractPlugin from "../../eslint-plugin-plugin-contract/src/index";
import pluginRouteGatePlugin from "../../eslint-plugin-plugin-route-gate/src/index";
import providerLockinPlugin from "../../eslint-plugin-provider-lockin/src/index";
import tenantScopePlugin from "../../eslint-plugin-tenant-scope/src/index";

const plugin = {
  meta: { name: "arch" },
  rules: {
    "no-hardcoded-colors": noHardcodedColorsPlugin.rules["no-hardcoded-colors"],
    "provider-lockin": providerLockinPlugin.rules["provider-lockin"],
    "package-boundary": packageBoundaryPlugin.rules["package-boundary"],
    "tenant-scope": tenantScopePlugin.rules["tenant-scope"],
    "plugin-contract": pluginContractPlugin.rules["plugin-contract"],
    "plugin-route-gate": pluginRouteGatePlugin.rules["plugin-route-gate"],
    "plugin-api-route-gate": pluginApiRouteGatePlugin.rules["plugin-api-route-gate"],
    "client-contract": clientContractPlugin.rules["client-contract"],
    "driver-contract": driverContractPlugin.rules["driver-contract"],
  },
};

export default plugin;
