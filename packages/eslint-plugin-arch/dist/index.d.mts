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
declare const plugin: {
  meta: {
    name: string;
  };
  rules: {
    "no-hardcoded-colors": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "provider-lockin": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "package-boundary": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "tenant-scope": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    } & {
      tableExports: Map<string, Set<string>>;
      fileTenantNames: Map<string, Set<string>>;
    };
    "plugin-contract": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "plugin-route-gate": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "plugin-api-route-gate": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "client-contract": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
    "driver-contract": {
      create: (context: {
        filename: string;
        report: (diagnostic: {
          node: any;
          message: string;
        }) => void;
      }) => {
        [x: string]: ((node: any) => void) | undefined;
      };
    };
  };
};
export { plugin as default };