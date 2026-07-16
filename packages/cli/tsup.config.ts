import { defineConfig } from "tsup";

export default defineConfig({
    banner: {
        js: "#!/usr/bin/env node",
    },
    clean: true,
    dts: false,
    entry: ["src/bin.ts"],
    format: ["esm"],
    noExternal: ["@code-bandit/core"],
    sourcemap: true,
});
