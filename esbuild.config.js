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

const browserBuild = {
    ...common,
    entryPoints: ["src/index.browser.ts"],
    // outfile: "dist/browser.js",
    platform: "browser",
    target: ["es2020", "chrome100", "firefox100", "safari15"],
    splitting: true,
    outdir: "dist/web",      // <-- required for splitting
    entryNames: "[name]-[hash]",
    chunkNames: "chunks/[name]-[hash]",
    assetNames: "assets/[name]-[hash]",
    minify: true,
    sourcemap: false,
    legalComments: "none",
    define: {
        "process.env.NODE_ENV": "\"production\"",
        "DEV": "false",
    },
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
    esbuild.build(browserBuild),
    esbuild.build(cliBuild),
]);

console.log("Build completed.");
