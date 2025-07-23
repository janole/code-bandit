import esbuild from "esbuild";
import { nodeExternalsPlugin } from "esbuild-node-externals";

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
        entryPoints: ["src/coba.tsx"],
        outfile: "dist/coba.js",
        plugins: [nodeExternalsPlugin({
            allowList: ["@langchain/ollama"],
        })],
    }),
    esbuild.build({
        ...buildOptions,
        entryPoints: ["src/index.ts"],
        outfile: "dist/index.js",
        plugins: [nodeExternalsPlugin()],
    })
]);

console.log("Build completed.");
