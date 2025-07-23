import esbuild from "esbuild";
import fs from "fs";
import { builtinModules } from "module";

// Read dependencies from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const deps = Object.keys(packageJson.dependencies || {});

const buildOptions = {
    bundle: true,
    platform: "node",
    sourcemap: true,
    format: "esm",
    logLevel: "info",
};

await Promise.all([
    esbuild.build({
        ...buildOptions,
        // Mark everything external except '@langchain/ollama'
        external: [
            ...builtinModules,
            ...deps.filter(dep => dep !== "@langchain/ollama"),
        ],
        entryPoints: ["src/coba.tsx"],
        outfile: "dist/coba.js",
    }),
    esbuild.build({
        ...buildOptions,
        // Mark everything external
        external: [
            ...builtinModules,
            ...deps,
        ],
        entryPoints: ["src/index.ts"],
        outfile: "dist/index.js",
    })
]);

console.log("Build completed.");
