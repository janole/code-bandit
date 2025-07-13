import esbuild from 'esbuild';
import { builtinModules } from 'module';
import fs from 'fs';

// Read dependencies from package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
const deps = Object.keys(packageJson.dependencies || {});

// Mark everything external except '@langchain/ollama'
const externalDeps = [
    ...builtinModules, // Node built-in modules
    ...deps.filter(dep => dep !== '@langchain/ollama'),
];

await esbuild.build({
    entryPoints: ['src/coba.tsx'],
    outfile: 'dist/coba.js',
    bundle: true,
    platform: 'node',
    sourcemap: true,
    format: 'esm',
    external: externalDeps,
    logLevel: 'info',
});

console.log('Build completed.');
