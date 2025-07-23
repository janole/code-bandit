import esbuild from "esbuild";
import fs from "fs";
import { builtinModules } from "module";

// Read dependencies from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
const deps = Object.keys(packageJson.dependencies || {});

// Mark everything external except '@langchain/ollama'
const externalDeps = [
    ...builtinModules, // Node built-in modules
    ...deps.filter(dep => dep !== "@langchain/ollama"),
];

const buildOptions = {
    bundle: true,
    platform: "node",
    sourcemap: true,
    format: "esm",
    external: externalDeps,
    logLevel: "info",
};

await Promise.all([
    esbuild.build({
        ...buildOptions,
        entryPoints: ["src/coba.tsx"],
        outfile: "dist/coba.js",
    }),
    esbuild.build({
        ...buildOptions,
        external: [
            ...builtinModules,
            ...deps,
        ],
        entryPoints: ["src/index.ts"],
        outfile: "dist/index.js",
    })
]);

console.log("Build completed.");
