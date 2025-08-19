import esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

const common = {
    bundle: true,
    format: "esm",
    logLevel: "info",
};

const nodeBuild = {
    ...common,
    entryPoints: ["src/index.node.ts"],
    outfile: "dist/index.js",
    platform: "node",
    target: ["node18"],
    minify: false,
    sourcemap: true,
    plugins: [nodeExternalsPlugin()],
};

const vscodeBuild = {
    ...common,
    entryPoints: ["src/index.vscode.ts"],
    outfile: "dist/index.vscode.js",
    platform: "node",
    target: ["node18"],
    minify: false,
    sourcemap: true,
    plugins: [nodeExternalsPlugin()],
};

const cliBuild = {
    ...common,
    entryPoints: ["src/coba.tsx"],
    outfile: "dist/coba.js",
    platform: "node",
    target: ["node20"],
    minify: true,
    keepNames: true,
    sourcemap: false,
    plugins: [nodeExternalsPlugin({ allowList: ["@langchain/ollama"] })],
};

await Promise.all([
    esbuild.build(nodeBuild),
    esbuild.build(vscodeBuild),
    esbuild.build(cliBuild),
]);

console.log("Build completed.", process.env.NODE_ENV);
