import { fileURLToPath } from "node:url";
import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    inputOptions: {
      plugins: [
        {
          name: "arch-sibling-sources",
          resolveId(source: string) {
            const m = source.match(/^(?:\.\.\/)+(eslint-plugin-[^/]+)\/src\/index(?:\.ts)?$/);
            if (m) {
              return fileURLToPath(new URL(`../${m[1]}/src/index.ts`, import.meta.url));
            }
            return null;
          },
        },
      ],
    },
  },
});
