export default {
    forbidden: [
        {
            name: "no-node-builtins-in-browser",
            comment: "Disallow Node built-ins from browser code",
            severity: "error",
            from: { path: "^src/" },
            to: {
                dependencyTypes: ["core"],
                path: "^(fs|path|os|crypto|http|https|zlib|stream|url|tty|net|tls|dns|child_process|worker_threads|perf_hooks|readline|cluster|vm|module|inspector|dgram|repl)(/|$)"
            }
        }
    ]
};