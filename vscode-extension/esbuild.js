import esbuild from "esbuild";
import { writeFileSync } from "fs";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
    name: "esbuild-problem-matcher",

    setup(build)
    {
        build.onStart(() =>
        {
            console.log("[watch] build started");
        });
        build.onEnd((result) =>
        {
            result.errors.forEach(({ text, location }) =>
            {
                console.error(`✘ [ERROR] ${text}`);
                console.error(`    ${location.file}:${location.line}:${location.column}:`);
            });
            console.log("[watch] build finished");
        });
    },
};

async function main()
{
    const ctx = await esbuild.context({
        entryPoints: [
            "src/extension.ts",
        ],
        bundle: true,
        format: "esm",
        minify: production,
        sourcemap: true, //!production,
        sourcesContent: false,
        platform: "node",
        outfile: "dist/extension.js",
        external: ["vscode"],
        logLevel: "silent",
        metafile: true,
        target: "node18",
        banner: {
            js: "import { createRequire } from 'module';\nconst require = createRequire(import.meta.url);",
        },
        plugins: [
            // nodeExternalsPlugin({
            //     packagePath: [
            //         "./package.json",
            //         "../package.json",
            //     ],
            //     allowList: [
            //         "@janole/code-bandit",
            //         "@langchain/core",
            //         "@langchain/openai",
            //         "@langchain/google-genai",
            //         "@langchain/ollama",
            //         "@langchain/anthropic",
            //         "@langchain/groq",
            //         "globby",
            //         "fast-glob",
            //         "write-file-atomic",
            //         "ulid",
            //         "clipboardy",
            //         "execa",
            //     ],
            // }),
            /* add to the end of plugins array */
            esbuildProblemMatcherPlugin,
        ],
    });
    if (watch)
    {
        await ctx.watch();
    }
    else
    {
        const result = await ctx.rebuild();
        await ctx.dispose();

        if (result?.metafile)
        {
            writeFileSync("meta.json", JSON.stringify(result.metafile));
        }
    }
}

main().catch(e =>
{
    console.error(e);
    process.exit(1);
});
