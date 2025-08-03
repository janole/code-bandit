import esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

const common = {
    bundle: true,
    sourcemap: true,
    format: "esm",
    logLevel: "info",
};

const nodeBuild = {
    ...common,
    entryPoints: ["src/index.node.ts"],
    outfile: "dist/index.js",
    platform: "node",
    target: ["node20"],
    plugins: [nodeExternalsPlugin()],
};

const cliBuild = {
    ...common,
    entryPoints: ["src/coba.tsx"],
    outfile: "dist/coba.js",
    platform: "node",
    target: ["node20"],
    plugins: [nodeExternalsPlugin({ allowList: ["@langchain/ollama"] })],
};

await Promise.all([
    esbuild.build(nodeBuild),
    esbuild.build(cliBuild),
]);

console.log("Build completed.");
